import { SyncPacket } from '../types/game';

export type WsConnectionStatus = 'simulated' | 'connecting' | 'connected' | 'error';

type SyncListener = (packet: SyncPacket) => void;
type TikTokEventListener = (event: {
  type: 'chat' | 'gift' | 'like' | 'follow';
  username: string;
  avatarUrl?: string | null;
  profilePictureUrl?: string | null;
  comment?: string;
  giftName?: string;
  coins?: number;
  likeCount?: number;
}) => void;
type StatusListener = (status: WsConnectionStatus) => void;
type PeerCountListener = (counts: { totalPeers: number; obsPeers: number }) => void;

class LiveSyncService {
  private clientId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  private channel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private ws: WebSocket | null = null;
  private syncListeners = new Set<SyncListener>();
  private tiktokListeners = new Set<TikTokEventListener>();
  private statusListeners = new Set<StatusListener>();
  private peerListeners = new Set<PeerCountListener>();
  private status: WsConnectionStatus = 'simulated';
  private recentPacketTimestamps = new Set<number>();

  constructor() {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('chua_online_live_sync_v1');
      this.channel.onmessage = (ev) => {
        if (ev.data?.type === 'ADMIN_SYNC') {
          this.dispatchIncomingSync(ev.data as SyncPacket);
        }
      };
    }
    this.initServerRelay();
  }

  private isStaticHost(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('vercel.app') || host.endsWith('netlify.app');
  }

  private initServerRelay() {
    if (typeof window === 'undefined' || !('EventSource' in window) || this.isStaticHost()) return;
    const params = new URLSearchParams(window.location.search);
    const isObs = params.get('obs') === '1' || params.get('view') === 'live';
    const role = isObs ? 'obs' : 'admin';

    try {
      const es = new EventSource(
        `/api/sync-stream?clientId=${encodeURIComponent(this.clientId)}&role=${role}`
      );
      this.eventSource = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PEER_STATUS') {
            this.peerListeners.forEach((fn) =>
              fn({ totalPeers: data.totalPeers || 1, obsPeers: data.obsPeers || 0 })
            );
          } else if (data.type === 'ADMIN_SYNC') {
            this.dispatchIncomingSync(data as SyncPacket);
          }
        } catch {
          // Ignore malformed event
        }
      };

      es.onerror = () => {
        es.close();
      };
    } catch {
      // Ignore SSE error if offline
    }
  }

  private dispatchIncomingSync(packet: SyncPacket) {
    // Deduplicate packets received via both BroadcastChannel and Server SSE Relay
    if (packet.ts && this.recentPacketTimestamps.has(packet.ts)) {
      return;
    }
    if (packet.ts) {
      this.recentPacketTimestamps.add(packet.ts);
      if (this.recentPacketTimestamps.size > 100) {
        const first = this.recentPacketTimestamps.values().next().value;
        if (first !== undefined) this.recentPacketTimestamps.delete(first);
      }
    }
    this.syncListeners.forEach((fn) => fn(packet));
  }

  public onSync(fn: SyncListener) {
    this.syncListeners.add(fn);
    return () => this.syncListeners.delete(fn);
  }

  public onTikTokEvent(fn: TikTokEventListener) {
    this.tiktokListeners.add(fn);
    return () => this.tiktokListeners.delete(fn);
  }

  public onStatusChange(fn: StatusListener) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  public onPeerCountChange(fn: PeerCountListener) {
    this.peerListeners.add(fn);
    return () => this.peerListeners.delete(fn);
  }

  private setStatus(next: WsConnectionStatus) {
    this.status = next;
    this.statusListeners.forEach((fn) => fn(next));
  }

  public getStatus(): WsConnectionStatus {
    return this.status;
  }

  public sendCommand(action: SyncPacket['action'], payload: Record<string, any> = {}) {
    const packet: SyncPacket = {
      type: 'ADMIN_SYNC',
      action,
      payload,
      ts: Date.now() + Math.random(),
    };
    this.recentPacketTimestamps.add(packet.ts);

    // 1. Instant local same-browser BroadcastChannel
    try {
      this.channel?.postMessage(packet);
    } catch {
      // Ignore
    }

    // 2. Cloud/Server Relay to OBS Browser Source or separate browser windows
    if (!this.isStaticHost()) {
      fetch('/api/sync-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: this.clientId, packet }),
      }).catch(() => {
        // Ignore if static host
      });
    }

    // 3. Optional local Node.js WebSocket bridge
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(packet));
      } catch {
        // Ignore
      }
    }
  }

  public connectWebSocket(url: string) {
    if (!url.trim()) return;
    try {
      if (this.ws) {
        this.ws.close();
      }
      this.setStatus('connecting');
      const socket = new WebSocket(url.trim());
      this.ws = socket;

      socket.onopen = () => {
        this.setStatus('connected');
      };

      const extractAvatar = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        const u = obj.user || obj.userDetails || obj;
        const candidates = [
          obj.avatarUrl,
          obj.profilePictureUrl,
          u?.avatarUrl,
          u?.profilePictureUrl,
          u?.profilePicture?.url?.[0],
          u?.profilePicture?.urls?.[0],
          u?.profilePicture?.urlList?.[0],
          u?.avatarThumb?.url?.[0],
          u?.avatarThumb?.urls?.[0],
          u?.avatarThumb?.urlList?.[0],
          u?.avatarMedium?.url?.[0],
          u?.avatarMedium?.urls?.[0],
          obj.profilePicture?.url?.[0],
          obj.profilePicture?.urls?.[0],
        ];
        for (const c of candidates) {
          if (typeof c === 'string' && c.startsWith('http')) return c;
        }
        const boxes = [u?.profilePicture, u?.avatarThumb, obj.profilePicture];
        for (const box of boxes) {
          if (box && typeof box === 'object') {
            for (const val of Object.values(box)) {
              if (typeof val === 'string' && val.startsWith('http')) return val;
              if (Array.isArray(val)) {
                const found = val.find(
                  (item) => typeof item === 'string' && item.startsWith('http')
                );
                if (found) return found;
              }
            }
          }
        }
        return null;
      };

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.type === 'ADMIN_SYNC') {
            this.dispatchIncomingSync(raw as SyncPacket);
            return;
          }

          // Format 1: Custom Node.js server.js bridge ({ type: 'chat' | 'gift' | 'like' | 'follow', ... })
          if (
            raw.type === 'chat' ||
            raw.type === 'gift' ||
            raw.type === 'like' ||
            raw.type === 'follow'
          ) {
            const normalized = {
              ...raw,
              avatarUrl: extractAvatar(raw),
            };
            this.tiktokListeners.forEach((fn) => fn(normalized));
            return;
          }

          // Format 2: Direct TikFinity WebSocket (ws://localhost:21213) ({ event: 'chat' | 'gift' | 'like' | 'follow', data: {...} })
          const evType = raw.event;
          const d = raw.data || {};
          if (evType === 'chat' || evType === 'gift' || evType === 'like' || evType === 'follow') {
            if (evType === 'gift' && d.giftType === 1 && d.repeatEnd === false) {
              return;
            }
            const username =
              d.nickname || d.user?.nickname || d.uniqueId || d.user?.uniqueId || 'Phật Tử';
            const avatarUrl = extractAvatar(d) || extractAvatar(raw);
            const diamondCount =
              d.diamondCount ??
              d.giftDetails?.diamondCount ??
              d.gift?.diamondCount ??
              1;
            const repeatCount = d.repeatCount ?? d.comboCount ?? 1;

            this.tiktokListeners.forEach((fn) =>
              fn({
                type: evType,
                username,
                avatarUrl,
                comment: d.comment || '',
                giftName:
                  d.giftName || d.giftDetails?.giftName || d.gift?.name || 'Lễ vật',
                coins: Math.max(1, Number(diamondCount) * Number(repeatCount)),
                likeCount: Number(d.likeCount || 1),
              })
            );
          }
        } catch {
          // Ignore malformed JSON
        }
      };

      socket.onclose = () => {
        this.setStatus('simulated');
      };

      socket.onerror = () => {
        this.setStatus('error');
      };
    } catch {
      this.setStatus('error');
    }
  }
}

export const syncService = new LiveSyncService();
