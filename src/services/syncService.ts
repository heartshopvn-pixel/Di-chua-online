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

const FOCUS_TIMER_ALERT_URL = 'https://heartsmithvn.github.io/Focus-timer/?ring=1';

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
  private wasWsConnectedOnce = false;
  private lastAlertOpenedAt = 0;

  private isObsView(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('obs') === '1' ||
      params.get('view') === 'live' ||
      params.get('mode') === 'live'
    );
  }

  public triggerFocusTimerAlert(force = false) {
    if (typeof window === 'undefined') return;
    // Không tự bung tab trên màn hình ?obs=1 bên trong TikTok Live Studio
    if (!force && this.isObsView()) return;
    const now = Date.now();
    if (!force && now - this.lastAlertOpenedAt < 60000) return;
    this.lastAlertOpenedAt = now;

    try {
      const a = document.createElement('a');
      a.href = FOCUS_TIMER_ALERT_URL;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Fallback
    }
  }

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
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (this.status === 'simulated' && !this.ws) {
          this.connectWebSocket('ws://localhost:8080');
        }
      }, 500);
    }
  }

  private isStaticHost(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('vercel.app') || host.endsWith('netlify.app');
  }

  private reconnectEsTimer: ReturnType<typeof setTimeout> | null = null;
  private lastWsUrl: string = '';
  private shouldReconnectWs: boolean = false;
  private reconnectWsTimer: ReturnType<typeof setTimeout> | null = null;

  private initServerRelay() {
    if (typeof window === 'undefined' || !('EventSource' in window) || this.isStaticHost()) return;
    const params = new URLSearchParams(window.location.search);
    const isObs =
      params.get('obs') === '1' ||
      params.get('view') === 'live' ||
      params.get('mode') === 'live';
    const role = isObs ? 'obs' : 'admin';

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }
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
        if (this.reconnectEsTimer) clearTimeout(this.reconnectEsTimer);
        this.reconnectEsTimer = setTimeout(() => {
          this.initServerRelay();
        }, 3000);
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

  private stripHeavyDataUrls(obj: any): any {
    if (typeof obj === 'string') {
      return obj.startsWith('data:') && obj.length > 512 * 1024 ? null : obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.stripHeavyDataUrls(item));
    }
    if (obj && typeof obj === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = this.stripHeavyDataUrls(v);
      }
      return out;
    }
    return obj;
  }

  public sendCommand(action: SyncPacket['action'], payload: Record<string, any> = {}) {
    const packet: SyncPacket = {
      type: 'ADMIN_SYNC',
      action,
      payload,
      ts: Date.now() + Math.random(),
    };
    this.recentPacketTimestamps.add(packet.ts);

    // 1. Instant local same-browser BroadcastChannel (supports full binary/base64 payloads)
    try {
      this.channel?.postMessage(packet);
    } catch {
      // Ignore
    }

    let serializedPacket = JSON.stringify(packet);
    if (serializedPacket.length > 1024 * 1024) {
      serializedPacket = JSON.stringify(this.stripHeavyDataUrls(packet));
    }

    // 2. Cloud/Server Relay to OBS Browser Source or separate browser windows
    if (!this.isStaticHost()) {
      const bodyStr = JSON.stringify({
        senderId: this.clientId,
        packet: JSON.parse(serializedPacket),
      });

      fetch('/api/sync-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      }).catch(() => {
        // Ignore if static host
      });
    }

    // 3. Local Node.js WebSocket bridge (ws://localhost:8080) for cross-browser Chrome <-> TikTok Live Studio
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(serializedPacket);
      } catch {
        // Ignore
      }
    }
  }

  public connectWebSocket(url: string) {
    if (!url.trim()) return;
    this.lastWsUrl = url.trim();
    this.shouldReconnectWs = true;
    if (this.reconnectWsTimer) {
      clearTimeout(this.reconnectWsTimer);
      this.reconnectWsTimer = null;
    }
    try {
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
      }
      this.setStatus('connecting');
      const socket = new WebSocket(this.lastWsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.wasWsConnectedOnce = true;
        this.setStatus('connected');
        // Khi kết nối WebSocket thành công, nếu đây là màn hình Live (?obs=1) thì lập tức xin đồng bộ toàn bộ vị trí bảng & cấu hình từ Chrome
        if (this.isObsView()) {
          setTimeout(() => {
            this.sendCommand('REQUEST_FULL_SYNC', {});
          }, 120);
        }
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

      const extractUsername = (obj: any): string => {
        if (!obj || typeof obj !== 'object') return 'Phật Tử';
        const d = obj.data || obj.raw || obj;
        const u = obj.user || obj.userDetails || d?.user || d?.userDetails || d;
        const candidates = [
          obj.username !== 'Phật Tử' ? obj.username : null,
          obj.nickname,
          obj.displayId,
          obj.uniqueId,
          u?.nickname,
          u?.displayId,
          u?.uniqueId,
          u?.username,
          d?.nickname,
          d?.displayId,
          d?.uniqueId,
          obj.username,
        ];
        for (const c of candidates) {
          if (typeof c === 'string' && c.trim()) return c.trim();
        }
        return 'Phật Tử';
      };

      const extractComment = (obj: any): string => {
        if (!obj || typeof obj !== 'object') return '';
        const d = obj.data || obj.raw || obj;
        const candidates = [
          obj.comment,
          obj.content,
          obj.text,
          obj.message,
          obj.prayer,
          d?.comment,
          d?.content,
          d?.text,
          d?.message,
          d?.common?.displayText?.defaultPattern,
        ];
        for (const c of candidates) {
          if (typeof c === 'string' && c.trim()) return c.trim();
        }
        return '';
      };

      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.type === 'ADMIN_SYNC') {
            this.dispatchIncomingSync(raw as SyncPacket);
            return;
          }

          if (raw.type === 'live_alert') {
            this.triggerFocusTimerAlert(false);
            return;
          }

          // Format 1: Custom Node.js server.js bridge ({ type: 'chat' | 'gift' | 'like' | 'follow', ... })
          if (
            raw.type === 'chat' ||
            raw.type === 'comment' ||
            raw.type === 'gift' ||
            raw.type === 'like' ||
            raw.type === 'follow'
          ) {
            const normalizedType = raw.type === 'comment' ? 'chat' : raw.type;
            const normalized = {
              ...raw,
              type: normalizedType,
              username: extractUsername(raw),
              avatarUrl: extractAvatar(raw) || extractAvatar(raw.raw),
              comment: extractComment(raw),
            };
            this.tiktokListeners.forEach((fn) => fn(normalized));
            return;
          }

          // Format 2: Direct TikFinity WebSocket (ws://localhost:21213) ({ event: 'chat' | 'gift' | 'like' | 'follow', data: {...} })
          const rawEv = raw.event === 'comment' ? 'chat' : raw.event;
          const d = raw.data || {};
          if (rawEv === 'chat' || rawEv === 'gift' || rawEv === 'like' || rawEv === 'follow') {
            if (rawEv === 'gift' && d.giftType === 1 && d.repeatEnd === false) {
              return;
            }
            const username = extractUsername(raw);
            const avatarUrl = extractAvatar(d) || extractAvatar(raw);
            const diamondCount =
              d.diamondCount ??
              d.giftDetails?.diamondCount ??
              d.gift?.diamondCount ??
              1;
            const repeatCount = d.repeatCount ?? d.comboCount ?? 1;

            this.tiktokListeners.forEach((fn) =>
              fn({
                type: rawEv,
                username,
                avatarUrl,
                comment: extractComment(raw),
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
        const hadActiveConnection = this.wasWsConnectedOnce;
        this.setStatus('simulated');
        if (hadActiveConnection) {
          this.triggerFocusTimerAlert(false);
        }
        if (this.shouldReconnectWs && this.lastWsUrl) {
          if (this.reconnectWsTimer) clearTimeout(this.reconnectWsTimer);
          this.reconnectWsTimer = setTimeout(() => {
            this.connectWebSocket(this.lastWsUrl);
          }, 4000);
        }
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
