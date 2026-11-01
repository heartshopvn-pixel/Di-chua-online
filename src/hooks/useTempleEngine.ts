import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AVATAR_COLORS,
  DEFAULT_CONFIG,
  DEFAULT_NPC_AVATARS,
  DEFAULT_SPRITESHEETS,
  INITIAL_DONORS,
  INITIAL_MONKS,
  SAMPLE_NAMES,
  SAMPLE_PRAYERS,
} from '../config/constants';
import {
  BurnerLotusBurstFX,
  CameraFocusState,
  ControlledTargetId,
  CustomAssetsConfig,
  DonorEntry,
  FloatingToastItem,
  FlyingLotusFX,
  GameConfig,
  GridConfig,
  HudBoxPosition,
  HudLayoutConfig,
  KneelSlot,
  OfferingGiftType,
  PilgrimData,
  Point2D,
  QueuedPilgrimRequest,
  RectBounds,
  SafetyActionMode,
  SafetyCategory,
  SafetyLogEntry,
  StudioBackupData,
  TempleMonkData,
} from '../types/game';
import { HudBoxKey } from '../components/stage/StageHud';
import { ZoneKey } from '../components/stage/GameStage';
import { inferOfferingTypeFromCoins } from '../components/stage/OfferingModelArt';
import { soundEngine } from '../services/soundEngine';
import {
  getDefaultCustomWords,
  INITIAL_SAFETY_CATEGORIES,
  inspectUserInteraction,
  loadSavedCustomWords,
  saveCustomWordsToStorage,
} from '../services/safetyFilter';
import { syncService, WsConnectionStatus } from '../services/syncService';

const NPC_NAMES_STORAGE_KEY = 'temple_npc_names_v1';
const NPC_PRAYERS_STORAGE_KEY = 'temple_npc_prayers_v1';
const NPC_AVATARS_STORAGE_KEY = 'temple_npc_avatars_v1';
const TEMPLE_CONFIG_STORAGE_KEY = 'temple_studio_config_v1';
const TEMPLE_VIP_SLOTS_STORAGE_KEY = 'temple_vip_slots_v1';
const TEMPLE_NORMAL_SLOTS_STORAGE_KEY = 'temple_normal_slots_v1';
const TEMPLE_CUSTOM_ASSETS_STORAGE_KEY = 'temple_custom_assets_v1';

function mergeGameConfigWithDefaults(raw: Partial<GameConfig> | null | undefined): GameConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    spawnPoint: { ...DEFAULT_CONFIG.spawnPoint, ...(raw.spawnPoint || {}) },
    exitPoint: { ...DEFAULT_CONFIG.exitPoint, ...(raw.exitPoint || {}) },
    incenseBurner: { ...DEFAULT_CONFIG.incenseBurner, ...(raw.incenseBurner || {}) },
    offeringTrayPos: { ...DEFAULT_CONFIG.offeringTrayPos, ...(raw.offeringTrayPos || {}) },
    monkZone: { ...DEFAULT_CONFIG.monkZone, ...(raw.monkZone || {}) },
    redPrayZones: {
      left: { ...DEFAULT_CONFIG.redPrayZones.left, ...(raw.redPrayZones?.left || {}) },
      right: { ...DEFAULT_CONFIG.redPrayZones.right, ...(raw.redPrayZones?.right || {}) },
    },
    grid: { ...DEFAULT_CONFIG.grid, ...(raw.grid || {}) },
    hudLayout: {
      ...DEFAULT_CONFIG.hudLayout,
      ...(raw.hudLayout || {}),
      templeSign: {
        ...DEFAULT_CONFIG.hudLayout.templeSign,
        ...(raw.hudLayout?.templeSign || {}),
      },
      leaderboardBox: {
        ...DEFAULT_CONFIG.hudLayout.leaderboardBox,
        ...(raw.hudLayout?.leaderboardBox || {}),
      },
      guideBox: {
        ...DEFAULT_CONFIG.hudLayout.guideBox,
        ...(raw.hudLayout?.guideBox || {}),
      },
      toastBox: {
        ...DEFAULT_CONFIG.hudLayout.toastBox,
        ...(raw.hudLayout?.toastBox || {}),
      },
      grandEventBox: {
        ...DEFAULT_CONFIG.hudLayout.grandEventBox,
        ...(raw.hudLayout?.grandEventBox || {}),
      },
      pilgrimCountBox: {
        ...DEFAULT_CONFIG.hudLayout.pilgrimCountBox,
        ...(raw.hudLayout?.pilgrimCountBox || {}),
      },
      noticeBoardBox: {
        ...DEFAULT_CONFIG.hudLayout.noticeBoardBox,
        ...(raw.hudLayout?.noticeBoardBox || {}),
      },
    },
  };
}

function loadConfigFromStorage(): GameConfig {
  try {
    const raw = localStorage.getItem(TEMPLE_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return mergeGameConfigWithDefaults(parsed);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function loadCustomAssetsFromStorage(): CustomAssetsConfig {
  try {
    const raw = localStorage.getItem(TEMPLE_CUSTOM_ASSETS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SPRITESHEETS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SPRITESHEETS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_SPRITESHEETS };
  }
}

function loadStringListFromStorage(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [...fallback];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    // ignore storage errors
  }
  return [...fallback];
}

function saveStringListToStorage(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

/**
 * Đường đi ra vào chính là thảm đỏ ở giữa sân, chia làm 3 làn (3 line) để di chuyển tự nhiên:
 * - Làn trái: x = 252
 * - Làn giữa: x = 270
 * - Làn phải: x = 288
 */
export const RED_CARPET_LANES = [252, 270, 288] as const;

function inferPilgrimGender(username: string, id: number): 'female' | 'male' {
  const lower = (username || '').toLowerCase();
  const femaleHints = [
    'thị',
    'nhi',
    'hà',
    'ánh',
    'linh',
    'duyên',
    'vy',
    'ngọc',
    'lan',
    'mai',
    'hương',
    'trang',
    'thảo',
    'yến',
    'phương',
  ];
  if (femaleHints.some((w) => lower.includes(w))) return 'female';
  const maleHints = [
    'văn',
    'minh',
    'khang',
    'bảo',
    'đạt',
    'huy',
    'tùng',
    'đăng',
    'anh',
    'trung',
    'thái',
  ];
  if (maleHints.some((w) => lower.includes(w))) return 'male';
  return id % 2 === 0 ? 'female' : 'male';
}

/**
 * Xây dựng ghế VIP (Hàng xanh dương phía trước) theo số lượng vipCount không giới hạn:
 * - Chia đều sang 2 bên trái & phải, tự động ép sát nhau nếu số ghế VIP lớn.
 */
function buildVipSlotsFromConfig(
  vipCount: number,
  redPrayZones: { left: RectBounds; right: RectBounds }
): KneelSlot[] {
  const total = Math.max(0, Math.floor(vipCount));
  if (total === 0) return [];

  const leftCount = Math.ceil(total / 2);
  const rightCount = Math.floor(total / 2);
  const slots: KneelSlot[] = [];

  const leftVipY = Math.max(490, redPrayZones.left.minY - 46);
  const leftMinX = redPrayZones.left.minX + 10;
  const leftSpan = Math.max(10, redPrayZones.left.maxX - redPrayZones.left.minX - 20);

  for (let i = 0; i < leftCount; i++) {
    const frac = leftCount > 1 ? i / (leftCount - 1) : 0.5;
    const x = Math.round(leftMinX + frac * leftSpan);
    slots.push({
      id: `vip-${i}`,
      x,
      y: leftVipY,
      side: 'left',
      isVip: true,
      occupiedById: null,
    });
  }

  const rightVipY = Math.max(490, redPrayZones.right.minY - 46);
  const rightMinX = redPrayZones.right.minX + 10;
  const rightSpan = Math.max(
    10,
    redPrayZones.right.maxX - redPrayZones.right.minX - 20
  );

  for (let i = 0; i < rightCount; i++) {
    const frac = rightCount > 1 ? i / (rightCount - 1) : 0.5;
    const x = Math.round(rightMinX + frac * rightSpan);
    slots.push({
      id: `vip-${leftCount + i}`,
      x,
      y: rightVipY,
      side: 'right',
      isVip: true,
      occupiedById: null,
    });
  }

  return slots;
}

/**
 * Xây dựng vị trí ngồi bái lạy nằm trong 2 Khu vực màu đỏ hai bên thảm:
 * - Cho phép rows (số chỗ ngồi dọc) và cols (số chỗ ngồi ngang) tăng giảm không giới hạn
 * - Tự động xếp khít/chèn ép vào nhau trong phạm vi 2 khung chữ nhật màu đỏ nếu quá dày
 */
function buildNormalSlotsFromGrid(
  grid: GridConfig,
  redPrayZones: { left: RectBounds; right: RectBounds }
): KneelSlot[] {
  const safeRows = Math.max(1, Math.floor(grid.rows));
  const safeCols = Math.max(1, Math.floor(grid.cols));
  const slots: KneelSlot[] = [];

  const leftCols = Math.ceil(safeCols / 2);
  const rightCols = Math.floor(safeCols / 2);

  for (let r = 0; r < safeRows; r++) {
    const t = safeRows > 1 ? r / (safeRows - 1) : 0.5;

    // Khu vực đỏ bên trái
    const leftY = Math.round(
      redPrayZones.left.minY +
        10 +
        t * Math.max(12, redPrayZones.left.maxY - redPrayZones.left.minY - 20)
    );
    const leftW = Math.max(
      10,
      redPrayZones.left.maxX - redPrayZones.left.minX - 16
    );
    for (let c = 0; c < leftCols; c++) {
      const frac = leftCols > 1 ? c / (leftCols - 1) : 0.5;
      const x = Math.round(redPrayZones.left.minX + 8 + frac * leftW);
      slots.push({
        id: `slot-L-${r}-${c}`,
        side: 'left',
        row: r,
        col: c,
        x,
        y: leftY,
        isVip: false,
        occupiedById: null,
      });
    }

    // Khu vực đỏ bên phải
    const rightY = Math.round(
      redPrayZones.right.minY +
        10 +
        t * Math.max(12, redPrayZones.right.maxY - redPrayZones.right.minY - 20)
    );
    const rightW = Math.max(
      10,
      redPrayZones.right.maxX - redPrayZones.right.minX - 16
    );
    for (let c = 0; c < rightCols; c++) {
      const frac = rightCols > 1 ? c / (rightCols - 1) : 0.5;
      const x = Math.round(redPrayZones.right.minX + 8 + frac * rightW);
      slots.push({
        id: `slot-R-${r}-${c}`,
        side: 'right',
        row: r,
        col: c,
        x,
        y: rightY,
        isVip: false,
        occupiedById: null,
      });
    }
  }
  return slots;
}

export function useTempleEngine() {
  const [config, setConfig] = useState<GameConfig>(() => loadConfigFromStorage());
  const [vipSlots, setVipSlots] = useState<KneelSlot[]>(() => {
    const initialCfg = loadConfigFromStorage();
    const built = buildVipSlotsFromConfig(initialCfg.grid.vipCount, initialCfg.redPrayZones);
    try {
      const savedRaw = localStorage.getItem(TEMPLE_VIP_SLOTS_STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (Array.isArray(saved) && saved.length === built.length) {
          return built.map((s, idx) => ({
            ...s,
            x: typeof saved[idx]?.x === 'number' ? saved[idx].x : s.x,
            y: typeof saved[idx]?.y === 'number' ? saved[idx].y : s.y,
          }));
        }
      }
    } catch {
      // ignore
    }
    return built;
  });
  const [normalSlots, setNormalSlots] = useState<KneelSlot[]>(() => {
    const initialCfg = loadConfigFromStorage();
    const built = buildNormalSlotsFromGrid(initialCfg.grid, initialCfg.redPrayZones);
    try {
      const savedRaw = localStorage.getItem(TEMPLE_NORMAL_SLOTS_STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (Array.isArray(saved) && saved.length === built.length) {
          return built.map((s, idx) => ({
            ...s,
            x: typeof saved[idx]?.x === 'number' ? saved[idx].x : s.x,
            y: typeof saved[idx]?.y === 'number' ? saved[idx].y : s.y,
          }));
        }
      }
    } catch {
      // ignore
    }
    return built;
  });
  const [pilgrims, setPilgrims] = useState<PilgrimData[]>([]);
  const [monks, setMonks] = useState<TempleMonkData[]>(() =>
    INITIAL_MONKS.map((m) => ({ ...m }))
  );
  const [queueCount, setQueueCount] = useState(0);
  const [donors, setDonors] = useState<DonorEntry[]>(INITIAL_DONORS);
  const [floatingToasts, setFloatingToasts] = useState<FloatingToastItem[]>([]);
  const [customAssets, setCustomAssets] = useState<CustomAssetsConfig>(() =>
    loadCustomAssetsFromStorage()
  );
  const [grandEventProgress, setGrandEventProgress] = useState<number>(180);
  const [goldenLotusRainUntil, setGoldenLotusRainUntil] = useState<number>(0);
  const [latestAltarOffering, setLatestAltarOffering] =
    useState<OfferingGiftType>('tray');
  const [burnerLotusBursts, setBurnerLotusBursts] = useState<BurnerLotusBurstFX[]>([]);
  const [flyingLotuses, setFlyingLotuses] = useState<FlyingLotusFX[]>([]);
  const [eventBarFlashKey, setEventBarFlashKey] = useState<number>(0);
  const [cameraFocus, setCameraFocus] = useState<CameraFocusState>({
    pilgrimId: null,
    until: 0,
  });

  // Danh sách tên, lời cầu nguyện & kho avatar của NPC (cho phép thêm/sửa/xóa trong tab NPC)
  const [npcNames, setNpcNames] = useState<string[]>(() =>
    loadStringListFromStorage(NPC_NAMES_STORAGE_KEY, SAMPLE_NAMES)
  );
  const [npcPrayers, setNpcPrayers] = useState<string[]>(() =>
    loadStringListFromStorage(NPC_PRAYERS_STORAGE_KEY, SAMPLE_PRAYERS)
  );
  const [npcAvatars, setNpcAvatars] = useState<string[]>(() =>
    loadStringListFromStorage(NPC_AVATARS_STORAGE_KEY, DEFAULT_NPC_AVATARS)
  );

  // Điều khiển trực tiếp nhân vật (NPC bất kỳ hoặc Trụ trì / Chú tiểu) bằng phím AWSD + Q + Chat
  const [controlledTarget, setControlledTarget] =
    useState<ControlledTargetId>(null);

  // Audio & Sync UI state
  const [isLocalTabMuted, setIsLocalTabMuted] = useState(() => soundEngine.isTabMuted());
  const [ttsStatus, setTtsStatus] = useState<{ text: string; active: boolean }>({
    text: 'Sẵn sàng',
    active: false,
  });
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>(() =>
    syncService.getStatus()
  );
  const [peerCounts, setPeerCounts] = useState<{
    totalPeers: number;
    obsPeers: number;
  }>({ totalPeers: 1, obsPeers: 0 });

  // Safety Filter state
  const [safetyActionMode, setSafetyActionMode] = useState<SafetyActionMode>('purify');
  const [safetyCategories, setSafetyCategories] = useState<SafetyCategory[]>(
    INITIAL_SAFETY_CATEGORIES
  );
  const [customWords, setCustomWords] = useState<string[]>(() => loadSavedCustomWords());
  const [safetyLogs, setSafetyLogs] = useState<SafetyLogEntry[]>([]);

  // Mutable refs for 60fps simulation loop
  const configRef = useRef(config);
  const vipSlotsRef = useRef(vipSlots);
  const normalSlotsRef = useRef(normalSlots);
  const pilgrimsRef = useRef<PilgrimData[]>([]);
  const monksRef = useRef<TempleMonkData[]>(INITIAL_MONKS.map((m) => ({ ...m })));
  const queueRef = useRef<QueuedPilgrimRequest[]>([]);
  const nextIdRef = useRef(1);
  const lastBotTtsSecRef = useRef(0);
  const grandEventProgressRef = useRef(180);
  const npcNamesRef = useRef<string[]>(npcNames);
  const npcPrayersRef = useRef<string[]>(npcPrayers);
  const npcAvatarsRef = useRef<string[]>(npcAvatars);
  const controlledTargetRef = useRef<ControlledTargetId>(null);
  const pressedKeysRef = useRef<Record<string, boolean>>({});
  const lastBellMsRef = useRef(0);
  const comboSessionRef = useRef<
    Record<
      string,
      {
        count: number;
        totalCoins: number;
        giftName: string;
        lastAt: number;
        zoomedHighTier: boolean;
        ttsTimer: ReturnType<typeof setTimeout> | null;
      }
    >
  >({});
  const safetyRef = useRef({
    actionMode: safetyActionMode,
    categories: safetyCategories,
    customWords,
  });
  const liveSpokenTextRef = useRef<string>('');

  useEffect(() => {
    configRef.current = config;
    soundEngine.syncConfig(config);
    try {
      localStorage.setItem(TEMPLE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore quota error
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TEMPLE_VIP_SLOTS_STORAGE_KEY,
        JSON.stringify(vipSlots.map((s) => ({ id: s.id, x: s.x, y: s.y, side: s.side })))
      );
    } catch {
      // ignore
    }
  }, [vipSlots]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TEMPLE_NORMAL_SLOTS_STORAGE_KEY,
        JSON.stringify(
          normalSlots.map((s) => ({
            id: s.id,
            x: s.x,
            y: s.y,
            side: s.side,
            row: s.row,
            col: s.col,
          }))
        )
      );
    } catch {
      // ignore
    }
  }, [normalSlots]);

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLE_CUSTOM_ASSETS_STORAGE_KEY, JSON.stringify(customAssets));
    } catch {
      // ignore quota error
    }
  }, [customAssets]);

  useEffect(() => {
    npcNamesRef.current = npcNames.length > 0 ? npcNames : SAMPLE_NAMES;
  }, [npcNames]);

  useEffect(() => {
    npcPrayersRef.current = npcPrayers.length > 0 ? npcPrayers : SAMPLE_PRAYERS;
  }, [npcPrayers]);

  useEffect(() => {
    npcAvatarsRef.current = npcAvatars;
  }, [npcAvatars]);

  useEffect(() => {
    controlledTargetRef.current = controlledTarget;
  }, [controlledTarget]);

  useEffect(() => {
    safetyRef.current = {
      actionMode: safetyActionMode,
      categories: safetyCategories,
      customWords,
    };
  }, [safetyActionMode, safetyCategories, customWords]);

  useEffect(() => {
    const unsubTts = soundEngine.subscribeStatus((text, active, spokenText) => {
      setTtsStatus({ text, active });
      liveSpokenTextRef.current = active && spokenText ? spokenText : '';

      // Đồng bộ live text vào bong bóng chat trên đầu Sư Trụ Trì khi bật chế độ Trụ trì bong bóng chat
      if (configRef.current.abbotBubbleEnabled) {
        monksRef.current = monksRef.current.map((m) => {
          if (m.role === 'abbot') {
            return {
              ...m,
              chatText: active && spokenText ? spokenText : '',
              chatBubbleUntil: active && spokenText ? Date.now() + 60000 : 0,
            };
          }
          return m;
        });
        setMonks([...monksRef.current]);
      }
    });
    const unsubDharma = soundEngine.subscribeDharmaArticleChange((nextId) => {
      setConfig((prev) => ({ ...prev, activeDharmaId: nextId }));
    });
    const unsubWs = syncService.onStatusChange((st) => {
      setWsStatus(st);
    });
    const unsubPeers = syncService.onPeerCountChange((counts) => {
      setPeerCounts(counts);
    });
    return () => {
      unsubTts();
      unsubDharma();
      unsubWs();
      unsubPeers();
    };
  }, []);

  const pickRandomNpcName = useCallback(() => {
    const list = npcNamesRef.current.length > 0 ? npcNamesRef.current : SAMPLE_NAMES;
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const pickRandomNpcPrayer = useCallback(() => {
    const list =
      npcPrayersRef.current.length > 0 ? npcPrayersRef.current : SAMPLE_PRAYERS;
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const pickRandomNpcAvatar = useCallback((): string | null => {
    const list = npcAvatarsRef.current;
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const pushFloatingToast = useCallback(
    (text: string, isVip: boolean, replaceKey?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setFloatingToasts((prev) => {
        if (replaceKey) {
          const idx = prev.findIndex((item) => item.replaceKey === replaceKey);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { id, text, isVip, createdAt: Date.now(), replaceKey };
            return copy;
          }
        }
        return [
          ...prev.slice(-3),
          { id, text, isVip, createdAt: Date.now(), replaceKey },
        ];
      });
      setTimeout(() => {
        setFloatingToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    },
    []
  );

  const spawnBurnerLotusBurst = useCallback((x: number, y: number) => {
    const id = `burner-burst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setBurnerLotusBursts((prev) => [...prev.slice(-5), { id, x, y, createdAt: Date.now() }]);
    setTimeout(() => {
      setBurnerLotusBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1000);
  }, []);

  const spawnFlyingLotusToEventBoard = useCallback((startX: number, startY: number) => {
    const cfg = configRef.current;
    const targetX = cfg.hudLayout.grandEventBox.x + 24;
    const targetY = cfg.hudLayout.grandEventBox.y + 30;
    const id = `fly-lotus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setFlyingLotuses((prev) => {
      if (prev.length >= 8) return prev; // Chống quá tải khi bão tim
      return [...prev, { id, startX, startY, targetX, targetY, createdAt: Date.now() }];
    });

    setTimeout(() => {
      setFlyingLotuses((prev) => prev.filter((f) => f.id !== id));
    }, 820);
  }, []);

  const triggerHeadLotusBurst = useCallback(
    (username?: string, burstCount = 1) => {
      const list = pilgrimsRef.current;
      const now = Date.now();

      if (list.length === 0) {
        // Nếu chưa có nhân vật nào trên sân thì vẫn cho 1 hoa sen vừa bay từ thảm đỏ về bảng Đại lễ
        spawnFlyingLotusToEventBoard(270, 760);
        return;
      }

      const activeBursts = list.filter(
        (p) => p.lotusBurstUntil && p.lotusBurstUntil > now
      ).length;
      if (activeBursts >= 8) return;

      const maxNew = Math.min(burstCount, 8 - activeBursts);
      const lowerName = (username || '').trim().toLowerCase();

      const candidates: PilgrimData[] = [];
      if (lowerName) {
        const exact = list.find(
          (p) =>
            p.username.toLowerCase() === lowerName &&
            (!p.lotusBurstUntil || now - (p.lotusBurstUntil - 2100) > 1000)
        );
        if (exact) candidates.push(exact);
      }

      while (candidates.length < maxNew) {
        const available = list.filter(
          (p) =>
            !candidates.includes(p) &&
            (!p.lotusBurstUntil || now - (p.lotusBurstUntil - 2100) > 1000)
        );
        if (available.length === 0) break;
        const pick = available[Math.floor(Math.random() * available.length)];
        candidates.push(pick);
      }

      if (candidates.length > 0) {
        candidates.forEach((p, idx) => {
          // Bông hoa bay lên với tốc độ nhẹ nhàng (~2.1s)
          p.lotusBurstUntil = now + 2150;
          p.lotusBurstKey = now + Math.random();
          // Sau khi bấm like, 1 bông hoa sen kích thước vừa bay (có đuôi ánh hồng) từ nhân vật về nhập vào bảng Sự kiện đại lễ
          if (idx === 0) {
            spawnFlyingLotusToEventBoard(p.x, p.y - 36);
          }
        });
        setPilgrims([...list]);
      } else {
        const fallback = list[Math.floor(Math.random() * list.length)];
        spawnFlyingLotusToEventBoard(fallback.x, fallback.y - 36);
      }
    },
    [spawnFlyingLotusToEventBoard]
  );

  const activateGrandEventCelebration = useCallback(() => {
    const until = Date.now() + 3000;
    setGoldenLotusRainUntil(until);
    soundEngine.playBell(configRef.current.ttsVolume);
    pushFloatingToast('🔔 ĐẠI LỄ VIÊN MÃN! Chuông ngân & Mưa Hoa Sen Vàng 3s!', true);
  }, [pushFloatingToast]);

  const addGrandEventLotus = useCallback(
    (amount: number) => {
      const target = Math.max(1, configRef.current.grandEventTarget || 1000);
      const nextTotal = grandEventProgressRef.current + Math.max(1, amount);
      // Kích hoạt nháy viền hồng 1 cái trên thanh đếm trong thẻ Sự kiện Đại lễ
      setEventBarFlashKey(Date.now() + Math.random());

      if (nextTotal >= target) {
        const remainder = nextTotal % target;
        grandEventProgressRef.current = remainder;
        setGrandEventProgress(remainder);
        activateGrandEventCelebration();
      } else {
        grandEventProgressRef.current = nextTotal;
        setGrandEventProgress(nextTotal);
      }
    },
    [activateGrandEventCelebration]
  );

  const addDonorCoins = useCallback((username: string, coins: number) => {
    setDonors((prev) => {
      const existing = prev.find((d) => d.username === username);
      if (existing) {
        return prev.map((d) =>
          d.username === username ? { ...d, coins: d.coins + coins } : d
        );
      }
      return [...prev, { username, coins }];
    });
  }, []);

  /**
   * Tạo thực thể Phật tử:
   * - Chia làm 3 line trên thảm đỏ: RED_CARPET_LANES = [252, 270, 288]
   * - Khách thường (0 coin): Nhận sẵn 1 slot thường trống ngẫu nhiên, đi lên thắp nhang rồi xuống ngồi.
   * - Khách dâng lễ (isVip / coins > 0): Đi thẳng lên lư hương với Frame 7 (đội lễ vật), ném lễ vật vào lư hương -> thắp nhang 1s -> đi xuống hàng ghế VIP kiểm tra slot trống (nếu chưa có thì đứng chờ).
   */
  const createPilgrimInstance = useCallback(
    (
      req: {
        username: string;
        prayer: string;
        isVip: boolean;
        coins: number;
        isBot: boolean;
        avatarUrl?: string | null;
        comboCount?: number;
        giftName?: string;
      },
      slot: KneelSlot | null,
      instantKneel = false
    ): PilgrimData => {
      const id = nextIdRef.current++;
      if (slot) {
        slot.occupiedById = id;
      }
      const cfg = configRef.current;

      const laneX = RED_CARPET_LANES[id % 3];
      const startX = instantKneel && slot ? slot.x : laneX;
      const startY = instantKneel && slot ? slot.y : cfg.spawnPoint.y;
      const basePrayDuration = Math.max(3, cfg.prayDurationSec);
      const jitter = basePrayDuration >= 8 ? Math.random() * 2 - 1 : 0;
      const finalPrayDuration = Math.max(3, basePrayDuration + jitter);
      const bubbleDurMs = Math.max(2, cfg.chatBubbleDurationSec || 12) * 1000;
      const resolvedAvatarUrl =
        req.avatarUrl || (req.isBot ? pickRandomNpcAvatar() : null);

      return {
        id,
        username: req.username,
        prayer: req.prayer,
        gender: inferPilgrimGender(req.username, id),
        isVip: req.isVip || req.coins > 0,
        isBot: req.isBot,
        coins: req.coins,
        offeringType: inferOfferingTypeFromCoins(req.isVip, req.coins),
        comboCount: req.comboCount,
        giftName: req.giftName,
        comboPopKey: Date.now() + Math.random(),
        slotId: slot ? slot.id : null,
        x: startX,
        y: startY,
        laneX,
        slotX: slot ? slot.x : laneX,
        slotY: slot ? slot.y : 598,
        speed: req.isVip || req.coins > 0 ? 122 : 104 + Math.random() * 18,
        state: instantKneel && slot ? 'pray_seated' : 'walk_in_up',
        stateTimer: 1.0,
        prayTimer: finalPrayDuration,
        totalPrayDuration: finalPrayDuration,
        animTime: Math.random() * 3,
        facingLeft: slot ? slot.x < 270 : id % 2 === 0,
        avatarColor: AVATAR_COLORS[id % AVATAR_COLORS.length],
        avatarUrl: resolvedAvatarUrl,
        hairSeed: id,
        hasGoldenAura: req.coins >= 10,
        chatBubbleUntil: Date.now() + bubbleDurMs,
      };
    },
    [pickRandomNpcAvatar]
  );

  const releaseSlotById = useCallback((slotId: string | null) => {
    if (!slotId) return;
    const vip = vipSlotsRef.current.find((s) => s.id === slotId);
    if (vip) vip.occupiedById = null;
    const norm = normalSlotsRef.current.find((s) => s.id === slotId);
    if (norm) norm.occupiedById = null;
  }, []);

  const startPilgrimLeaving = useCallback(
    (p: PilgrimData) => {
      if (p.state === 'leave_side_to_aisle' || p.state === 'leave_down_exit') return;
      releaseSlotById(p.slotId);
      p.slotId = null;
      p.state = 'leave_side_to_aisle';
      p.facingLeft = p.x > p.laneX;
      p.chatBubbleUntil = 0;
    },
    [releaseSlotById]
  );

  /**
   * Thêm vào hàng chờ:
   * - Trong trường hợp phòng đầy: người gửi quà dâng lễ (isVip || coins > 0) khi còn trong hàng chờ hoặc mới vào hàng chờ sẽ được đẩy lên hàng chờ ưu tiên (đầu hàng đợi) và cộng dồn combo.
   */
  const enqueueWithPriority = useCallback((req: QueuedPilgrimRequest) => {
    const q = queueRef.current;
    const lowerName = req.username.trim().toLowerCase();
    const existingIdx = q.findIndex((item) => item.username.trim().toLowerCase() === lowerName);

    let mergedReq = { ...req };
    if (existingIdx !== -1) {
      const prev = q[existingIdx];
      q.splice(existingIdx, 1);
      mergedReq = {
        ...prev,
        prayer: req.prayer || prev.prayer,
        isVip: prev.isVip || req.isVip || req.coins > 0,
        coins: Math.max(prev.coins, req.coins),
        avatarUrl: req.avatarUrl || prev.avatarUrl,
        comboCount: Math.max(prev.comboCount || 1, req.comboCount || 1),
        giftName: req.giftName || prev.giftName,
        isBot: prev.isBot && req.isBot,
      };
    }

    if (mergedReq.isVip || mergedReq.coins > 0) {
      // Tìm vị trí ngay sau các khách VIP đang chờ trước đó (đẩy lên trước toàn bộ khách thường)
      let insertAt = 0;
      while (
        insertAt < q.length &&
        (q[insertAt].isVip || q[insertAt].coins > 0)
      ) {
        insertAt++;
      }
      q.splice(insertAt, 0, mergedReq);
    } else {
      q.push(mergedReq);
    }
    setQueueCount(q.length);
  }, []);

  const requestSpawnPilgrim = useCallback(
    (opts: {
      username: string;
      prayer: string;
      isVip?: boolean;
      coins?: number;
      avatarUrl?: string | null;
      comboCount?: number;
      giftName?: string;
      resetCombo?: boolean;
      playSound?: boolean;
      isBot?: boolean;
      broadcastSync?: boolean;
      fromSync?: boolean;
    }) => {
      const {
        username,
        prayer,
        isVip: rawVip = false,
        coins = 0,
        avatarUrl = null,
        comboCount: rawComboCount,
        giftName: rawGiftName,
        resetCombo = false,
        playSound = true,
        isBot = false,
        broadcastSync = false,
        fromSync = false,
      } = opts;

      const isVip = rawVip || coins > 0;

      if (broadcastSync && !fromSync) {
        syncService.sendCommand('SPAWN_PILGRIM', {
          username,
          prayer,
          isVip,
          coins,
          avatarUrl,
          comboCount: rawComboCount,
          giftName: rawGiftName,
          resetCombo,
          playSound,
          isBot,
        });
      }

      const cfg = configRef.current;
      const { actionMode, categories, customWords: cWords } = safetyRef.current;

      const filterRes = isBot
        ? {
            allowed: true,
            allowTTS: true,
            safeUsername: username,
            safePrayer: prayer,
            logEntries: [] as SafetyLogEntry[],
          }
        : inspectUserInteraction(username, prayer, actionMode, categories, cWords);

      if (filterRes.logEntries.length > 0) {
        setSafetyLogs((prev) => [...filterRes.logEntries, ...prev].slice(0, 35));
      }

      if (!filterRes.allowed) return;

      const finalUsername = filterRes.safeUsername;
      const finalPrayer = filterRes.safePrayer;
      const lowerName = finalUsername.trim().toLowerCase();
      const nowMs = Date.now();
      const nowSec = performance.now() / 1000;

      // Xử lý gộp Combo thông minh (chống spam 50 thông báo / 50 chuông / 50 TTS khi khách dâng liên hoàn)
      let effectiveCoins = coins;
      let effectiveComboCount = rawComboCount || 1;
      let effectiveGiftName =
        rawGiftName ||
        (coins >= 20
          ? 'Quà Đặc Biệt'
          : coins >= 10
          ? 'Rosa'
          : coins >= 5
          ? 'Bắn tim'
          : 'Hoa hồng');
      let triggerHighTierZoomNow = false;

      if (!isBot && (isVip || coins > 0)) {
        const addedCoins = Math.max(1, coins);
        const addedCount = Math.max(1, rawComboCount || 1);
        addDonorCoins(finalUsername, addedCoins);

        const prevSession = comboSessionRef.current[lowerName];
        const isContinuingCombo =
          !resetCombo && prevSession && nowMs - prevSession.lastAt < 5200;

        if (prevSession?.ttsTimer) {
          clearTimeout(prevSession.ttsTimer);
        }

        const nextCount = isContinuingCombo
          ? prevSession.count + addedCount
          : addedCount;
        const nextTotalCoins = isContinuingCombo
          ? prevSession.totalCoins + addedCoins
          : addedCoins;
        const wasZoomed = isContinuingCombo ? prevSession.zoomedHighTier : false;
        const shouldZoom = nextTotalCoins >= 10 && !wasZoomed;

        effectiveCoins = nextTotalCoins;
        effectiveComboCount = nextCount;
        if (isContinuingCombo && !rawGiftName) {
          effectiveGiftName = prevSession.giftName;
        }
        triggerHighTierZoomNow = shouldZoom;

        const offeringLabel =
          effectiveCoins > 10
            ? 'Mâm Quả Hoàng Kim (Đặc Biệt)'
            : effectiveCoins >= 10
            ? 'Mâm Hoa Quả (Rosa)'
            : effectiveCoins >= 5
            ? 'Hoa Sen Vàng Hoàng Kim'
            : 'Hoa Sen Hồng Vừa';

        const toastMsg =
          effectiveComboCount > 1
            ? `🔥 ${finalUsername} COMBO x${effectiveComboCount} ${effectiveGiftName} (${effectiveCoins} Xu) ➔ ${offeringLabel}`
            : `${finalUsername} dâng ${offeringLabel}`;

        pushFloatingToast(toastMsg, true, `combo:${lowerName}`);

        // Chống rè loa khi khách bấm 50 hoa hồng liên thanh: chỉ ngân chuông mỗi 900ms hoặc khi vừa đột phá lên mốc 10+ xu
        if (
          playSound &&
          (nowMs - lastBellMsRef.current > 900 || triggerHighTierZoomNow)
        ) {
          lastBellMsRef.current = nowMs;
          soundEngine.playBell(cfg.ttsVolume);
        }

        // Gộp giọng đọc TTS thông minh theo Quy tắc đọc sự kiện "Người thật":
        // - (Bật/Tắt) Đọc lời chúc cho người gửi quà (realGiftTtsEnabled)
        // - (Bật/Tắt) Đọc lời cầu nguyện (realPrayerTtsEnabled)
        let ttsTimer: ReturnType<typeof setTimeout> | null = null;
        if (filterRes.allowTTS) {
          const debounceMs = addedCount >= 10 ? 220 : 750;
          ttsTimer = setTimeout(() => {
            const latestCfg = configRef.current;
            const speechParts: string[] = [];

            if (latestCfg.realGiftTtsEnabled) {
              speechParts.push(
                soundEngine.formatEventTemplate(
                  latestCfg.realGiftTtsTemplate ||
                    'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe',
                  finalUsername,
                  finalPrayer
                )
              );
            }
            if (latestCfg.realPrayerTtsEnabled && finalPrayer) {
              speechParts.push(
                soundEngine.formatEventTemplate(
                  latestCfg.realPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]',
                  finalUsername,
                  finalPrayer
                )
              );
            }

            if (speechParts.length > 0) {
              soundEngine.enqueueTTS(speechParts.join('. '), true, latestCfg);
            }
          }, debounceMs);
        }

        comboSessionRef.current[lowerName] = {
          count: nextCount,
          totalCoins: nextTotalCoins,
          giftName: effectiveGiftName,
          lastAt: nowMs,
          zoomedHighTier: wasZoomed || shouldZoom,
          ttsTimer,
        };
      } else if (!isBot) {
        // Sự kiện "Người thật" mới vào chánh điện hoặc bình luận ước nguyện
        pushFloatingToast(`${finalUsername} vào chùa cầu an`, false);
        if (playSound) soundEngine.playWoodenFish(cfg.ttsVolume);

        if (filterRes.allowTTS) {
          const isAlreadyInHall = pilgrimsRef.current.some(
            (p) =>
              p.username.trim().toLowerCase() === lowerName &&
              p.state !== 'leave_side_to_aisle' &&
              p.state !== 'leave_down_exit'
          );
          const speechParts: string[] = [];

          if (!isAlreadyInHall && cfg.realWelcomeTtsEnabled) {
            speechParts.push(
              soundEngine.formatEventTemplate(
                cfg.realWelcomeTtsTemplate || 'Chào mừng [Tên] đến kim thiền tự',
                finalUsername,
                finalPrayer
              )
            );
          }
          if (cfg.realPrayerTtsEnabled && finalPrayer) {
            speechParts.push(
              soundEngine.formatEventTemplate(
                cfg.realPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]',
                finalUsername,
                finalPrayer
              )
            );
          }

          if (speechParts.length > 0) {
            soundEngine.enqueueTTS(speechParts.join('. '), false, cfg);
          }
        }
      } else {
        // Sự kiện "NPC" (Có 3 mục bật/tắt tương tự Người thật: Chào mừng / Chúc gửi quà / Đọc cầu nguyện)
        if (!soundEngine.getBusyState() && nowSec - lastBotTtsSecRef.current > 6) {
          const npcSpeechParts: string[] = [];
          if (isVip || coins > 0) {
            if (cfg.npcGiftTtsEnabled) {
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(
                  cfg.npcGiftTtsTemplate ||
                    'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe',
                  finalUsername,
                  finalPrayer
                )
              );
            }
            if (cfg.npcPrayerTtsEnabled && finalPrayer) {
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(
                  cfg.npcPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]',
                  finalUsername,
                  finalPrayer
                )
              );
            }
          } else {
            if (cfg.npcWelcomeTtsEnabled) {
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(
                  cfg.npcWelcomeTtsTemplate || 'Chào mừng [Tên] đến kim thiền tự',
                  finalUsername,
                  finalPrayer
                )
              );
            }
            if (cfg.npcPrayerTtsEnabled && finalPrayer) {
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(
                  cfg.npcPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]',
                  finalUsername,
                  finalPrayer
                )
              );
            }
          }

          if (npcSpeechParts.length > 0) {
            lastBotTtsSecRef.current = nowSec;
            soundEngine.enqueueTTS(npcSpeechParts.join('. '), false, cfg);
          }
        }
      }

      const offeringType = inferOfferingTypeFromCoins(isVip, effectiveCoins);
      const resolvedAvatar =
        avatarUrl || (isBot ? pickRandomNpcAvatar() : null);

      // Nếu người gửi quà dâng lễ đang nằm trong hàng chờ (khi phòng đầy) -> đẩy ngay lên hàng chờ ưu tiên & cộng dồn combo
      const inQueueIdx = queueRef.current.findIndex(
        (qItem) => qItem.username.trim().toLowerCase() === lowerName
      );
      if (inQueueIdx !== -1 && (isVip || effectiveCoins > 0)) {
        enqueueWithPriority({
          username: finalUsername,
          prayer: finalPrayer,
          isVip: true,
          coins: Math.max(effectiveCoins, 1),
          avatarUrl: resolvedAvatar,
          comboCount: effectiveComboCount,
          giftName: effectiveGiftName,
          isBot: false,
        });
        return;
      }

      // Nếu người chơi đang ở sẵn trên sân chùa và gửi quà Dâng Lễ -> Nâng cấp ngay thành VIP + Cộng dồn Combo mượt mà không giật lùi bước chân
      if (isVip || effectiveCoins > 0) {
        const existingOnStage = pilgrimsRef.current.find(
          (p) =>
            p.username.trim().toLowerCase() === lowerName &&
            p.state !== 'leave_side_to_aisle' &&
            p.state !== 'leave_down_exit'
        );
        if (existingOnStage) {
          const isAlreadyApproachingBurner =
            existingOnStage.state === 'walk_in_up' ||
            existingOnStage.state === 'throw_offering_at_burner' ||
            existingOnStage.state === 'ceremony_at_burner';

          const isMidComboAfterBurner =
            effectiveComboCount > 1 &&
            (existingOnStage.state === 'walk_to_vip_check' ||
              existingOnStage.state === 'wait_for_vip_slot' ||
              existingOnStage.state === 'walk_side_to_slot' ||
              existingOnStage.state === 'walk_vert_to_slot') &&
            existingOnStage.isVip;

          existingOnStage.isVip = true;
          existingOnStage.isBot = false;
          existingOnStage.coins = Math.max(existingOnStage.coins, effectiveCoins, 1);
          existingOnStage.offeringType = offeringType;
          existingOnStage.comboCount = effectiveComboCount;
          existingOnStage.giftName = effectiveGiftName;
          existingOnStage.comboPopKey = nowMs + Math.random();
          existingOnStage.prayer = finalPrayer;
          if (resolvedAvatar) existingOnStage.avatarUrl = resolvedAvatar;
          existingOnStage.hasGoldenAura =
            Boolean(existingOnStage.hasGoldenAura) || effectiveCoins >= 10;
          existingOnStage.chatBubbleUntil =
            nowMs + Math.max(2, cfg.chatBubbleDurationSec || 12) * 1000;
          existingOnStage.speed = 122;

          if (isAlreadyApproachingBurner) {
            if (existingOnStage.state === 'ceremony_at_burner') {
              setLatestAltarOffering(offeringType);
              if (effectiveComboCount % 5 === 0 || triggerHighTierZoomNow) {
                spawnBurnerLotusBurst(cfg.incenseBurner.x, cfg.incenseBurner.y);
              }
            }
          } else if (isMidComboAfterBurner) {
            setLatestAltarOffering(offeringType);
            if (effectiveComboCount % 5 === 0 || triggerHighTierZoomNow) {
              spawnBurnerLotusBurst(cfg.incenseBurner.x, cfg.incenseBurner.y);
            }
          } else {
            releaseSlotById(existingOnStage.slotId);
            existingOnStage.slotId = null;
            existingOnStage.state = 'walk_in_up';
          }

          setPilgrims([...pilgrimsRef.current]);
          if (triggerHighTierZoomNow && !isBot) {
            setCameraFocus({
              pilgrimId: existingOnStage.id,
              until: Date.now() + 4000,
            });
          }
          return;
        }
      }

      // Kiểm tra sức chứa sân chùa
      const maxStageCapacity = Math.max(
        cfg.botTargetCrowd + 6,
        vipSlotsRef.current.length + normalSlotsRef.current.length + 6
      );
      const activeStageCount = pilgrimsRef.current.filter(
        (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
      ).length;

      // Xử lý cho Khách Dâng Lễ (isVip || effectiveCoins > 0)
      if (isVip || effectiveCoins > 0) {
        if (activeStageCount >= maxStageCapacity && !isBot) {
          const botToYield =
            pilgrimsRef.current.find(
              (p) => p.isBot && p.state === 'pray_seated' && p.isVip
            ) ||
            pilgrimsRef.current.find((p) => p.isBot && p.state === 'pray_seated');
          if (botToYield) {
            startPilgrimLeaving(botToYield);
          } else {
            enqueueWithPriority({
              username: finalUsername,
              prayer: finalPrayer,
              isVip: true,
              coins: Math.max(effectiveCoins, 1),
              avatarUrl: resolvedAvatar,
              comboCount: effectiveComboCount,
              giftName: effectiveGiftName,
              isBot: false,
            });
            return;
          }
        } else if (activeStageCount >= maxStageCapacity && isBot) {
          return;
        }

        const newVipPilgrim = createPilgrimInstance(
          {
            username: finalUsername,
            prayer: finalPrayer,
            isVip: true,
            coins: Math.max(effectiveCoins, 1),
            avatarUrl: resolvedAvatar,
            comboCount: effectiveComboCount,
            giftName: effectiveGiftName,
            isBot,
          },
          null,
          false
        );

        pilgrimsRef.current = [...pilgrimsRef.current, newVipPilgrim];
        setPilgrims(pilgrimsRef.current);

        // Nếu quà Đặc Biệt 10xu trở lên: Khóa camera zoom gần sát bên nhân vật (đặt giữa khung hình) trong 4s
        if (effectiveCoins >= 10 && !isBot) {
          setCameraFocus({
            pilgrimId: newVipPilgrim.id,
            until: Date.now() + 4000,
          });
        }
        return;
      }

      // Nếu khách bình luận thường đang ở sẵn trên sân -> cập nhật bong bóng chat lời ước nguyện mới
      const existingNormal = pilgrimsRef.current.find(
        (p) =>
          p.username.trim().toLowerCase() === lowerName &&
          p.state !== 'leave_side_to_aisle' &&
          p.state !== 'leave_down_exit'
      );
      if (existingNormal && !isBot) {
        existingNormal.prayer = finalPrayer;
        if (resolvedAvatar) existingNormal.avatarUrl = resolvedAvatar;
        existingNormal.chatBubbleUntil =
          Date.now() + Math.max(2, cfg.chatBubbleDurationSec || 12) * 1000;
        setPilgrims([...pilgrimsRef.current]);
        return;
      }

      // Xử lý cho Khách Thường (Mới vào live / Bình luận ước nguyện / NPC giữ nhiệt)
      let freeNormalSlots = normalSlotsRef.current.filter(
        (s) => s.occupiedById === null
      );

      if (freeNormalSlots.length === 0 && !isBot) {
        const botToYield = pilgrimsRef.current.find(
          (p) => p.isBot && p.state === 'pray_seated' && !p.isVip
        );
        if (botToYield && botToYield.slotId) {
          const freedSlot = normalSlotsRef.current.find(
            (s) => s.id === botToYield.slotId
          );
          startPilgrimLeaving(botToYield);
          if (freedSlot) freeNormalSlots = [freedSlot];
        }
      }

      if (freeNormalSlots.length > 0) {
        const chosenSlot =
          freeNormalSlots[Math.floor(Math.random() * freeNormalSlots.length)];
        const newNormalPilgrim = createPilgrimInstance(
          {
            username: finalUsername,
            prayer: finalPrayer,
            isVip: false,
            coins: 0,
            avatarUrl: resolvedAvatar,
            isBot,
          },
          chosenSlot,
          false
        );
        pilgrimsRef.current = [...pilgrimsRef.current, newNormalPilgrim];
        setPilgrims(pilgrimsRef.current);
      } else if (isBot && normalSlotsRef.current.length > 0) {
        // Khi số Phật tử duy trì giữ nhiệt (botTargetCrowd) cao hơn số chiếu trống hiện tại:
        // Cho phép xếp thêm vào vị trí chiếu với độ lệch nhỏ để đảm bảo đủ đúng số lượng duy trì trên sân
        const baseSlot =
          normalSlotsRef.current[
            Math.floor(Math.random() * normalSlotsRef.current.length)
          ];
        const newNormalPilgrim = createPilgrimInstance(
          {
            username: finalUsername,
            prayer: finalPrayer,
            isVip: false,
            coins: 0,
            avatarUrl: resolvedAvatar,
            isBot: true,
          },
          null,
          false
        );
        newNormalPilgrim.slotX = Math.max(
          28,
          Math.min(512, baseSlot.x + Math.round((Math.random() - 0.5) * 14))
        );
        newNormalPilgrim.slotY = Math.max(
          580,
          Math.min(935, baseSlot.y + Math.round((Math.random() - 0.5) * 10))
        );
        pilgrimsRef.current = [...pilgrimsRef.current, newNormalPilgrim];
        setPilgrims(pilgrimsRef.current);
      } else if (!isBot) {
        enqueueWithPriority({
          username: finalUsername,
          prayer: finalPrayer,
          isVip: false,
          coins: 0,
          avatarUrl: resolvedAvatar,
          isBot: false,
        });
      }
    },
    [
      addDonorCoins,
      createPilgrimInstance,
      enqueueWithPriority,
      pickRandomNpcAvatar,
      pushFloatingToast,
      releaseSlotById,
      spawnBurnerLotusBurst,
      startPilgrimLeaving,
    ]
  );

  // Trigger Gõ Mõ (Phím Q hoặc nút bấm) cho nhân vật đang nhập vai
  const handleControlledWoodenFish = useCallback(() => {
    const target = controlledTargetRef.current;
    const cfg = configRef.current;
    soundEngine.playWoodenFish(cfg.ttsVolume);
    syncService.sendCommand('PLAY_WOODEN_FISH', {});

    if (!target || typeof target !== 'string') return;
    const nowMs = Date.now();

    if (target.startsWith('monk:')) {
      const monkId = target.replace('monk:', '');
      monksRef.current = monksRef.current.map((m) =>
        m.id === monkId
          ? {
              ...m,
              moveAxis: 'chant_wooden_fish',
              pauseTimer: 1.4,
              woodenFishRippleUntil: nowMs + 1200,
            }
          : m
      );
      setMonks([...monksRef.current]);
    } else if (target.startsWith('pilgrim:')) {
      const pid = Number(target.replace('pilgrim:', ''));
      pilgrimsRef.current = pilgrimsRef.current.map((p) =>
        p.id === pid
          ? {
              ...p,
              state: 'manual_control',
              manualMoveDir: 'wooden_fish',
              woodenFishRippleUntil: nowMs + 1200,
            }
          : p
      );
      setPilgrims([...pilgrimsRef.current]);
    }
  }, []);

  // Lắng nghe phím AWSD (hoặc mũi tên) để di chuyển và phím Q để gõ mõ khi đang nhập vai
  useEffect(() => {
    const isTypingInput = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        el.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!controlledTargetRef.current || isTypingInput(e.target)) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        pressedKeysRef.current[key] = true;
      } else if (key === 'q') {
        e.preventDefault();
        handleControlledWoodenFish();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      delete pressedKeysRef.current[key];
    };

    const handleBlur = () => {
      pressedKeysRef.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleControlledWoodenFish]);

  // Initial seeding + 60fps Orthogonal 2D Game Loop (Pilgrims & Monks)
  useEffect(() => {
    const initialList: PilgrimData[] = [];
    const initNames =
      npcNamesRef.current.length > 0 ? npcNamesRef.current : SAMPLE_NAMES;
    const initPrayers =
      npcPrayersRef.current.length > 0 ? npcPrayersRef.current : SAMPLE_PRAYERS;

    const initialTarget = Math.max(1, configRef.current.botTargetCrowd || 24);
    const vipTargetCount = Math.min(
      vipSlotsRef.current.length,
      Math.round((initialTarget * (configRef.current.botVipPercent || 20)) / 100)
    );

    for (let i = 0; i < initialTarget; i++) {
      const isVip = i < vipTargetCount;
      const username = initNames[i % initNames.length];
      const prayer = initPrayers[i % initPrayers.length];
      const pool = isVip ? vipSlotsRef.current : normalSlotsRef.current;
      const free = pool.filter((s) => s.occupiedById === null);
      if (free.length > 0) {
        const slot = free[Math.floor(Math.random() * free.length)];
        const p = createPilgrimInstance(
          { username, prayer, isVip, coins: isVip ? 5 : 0, isBot: true },
          slot,
          true
        );
        // Rải đều thời gian ngồi còn lại để các NPC không đứng dậy ra về cùng một lúc
        const maxDur = Math.max(6, configRef.current.prayDurationSec || 22);
        p.prayTimer = 4 + ((i * 3.7) % maxDur);
        p.totalPrayDuration = maxDur;
        initialList.push(p);
      }
    }
    pilgrimsRef.current = initialList;
    setPilgrims([...initialList]);

    let animId = 0;
    let lastTime = performance.now();
    let autoSpawnTimer = 0;
    let npcPrayTimer = 0;
    let periodicBellTimer = 0;
    let periodicWoodenFishTimer = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const cfg = configRef.current;
      const mZone = cfg.monkZone;
      const activeControl = controlledTargetRef.current;
      const keys = pressedKeysRef.current;
      const moveUp = Boolean(keys['w'] || keys['arrowup']);
      const moveDown = Boolean(keys['s'] || keys['arrowdown']);
      const moveLeft = Boolean(keys['a'] || keys['arrowleft']);
      const moveRight = Boolean(keys['d'] || keys['arrowright']);

      // 0. Nhịp gõ chuông & gõ mõ định kỳ theo khoảng cách thời gian cài đặt
      if (cfg.bellEnabled && cfg.bellIntervalSec > 0) {
        periodicBellTimer += dt;
        if (periodicBellTimer >= Math.max(2, cfg.bellIntervalSec)) {
          periodicBellTimer = 0;
          soundEngine.playBell(cfg.ttsVolume);
        }
      } else {
        periodicBellTimer = 0;
      }

      if (cfg.woodenFishEnabled && cfg.woodenFishIntervalSec > 0) {
        periodicWoodenFishTimer += dt;
        if (periodicWoodenFishTimer >= Math.max(0.5, cfg.woodenFishIntervalSec)) {
          periodicWoodenFishTimer = 0;
          soundEngine.playWoodenFish(cfg.ttsVolume);
        }
      } else {
        periodicWoodenFishTimer = 0;
      }

      // 1. Update Monks (Trụ trì & Chú tiểu) inside dynamic cfg.monkZone (or manual AWSD control)
      const nextMonks = monksRef.current.map((m) => {
        const copy = { ...m, animTime: m.animTime + dt };
        const isControlledMonk = activeControl === `monk:${copy.id}`;

        // Đồng bộ live text vào bong bóng chat trên đầu Sư Trụ Trì khi đang đọc TTS / Thuyết pháp
        if (copy.role === 'abbot') {
          if (cfg.abbotBubbleEnabled && liveSpokenTextRef.current) {
            copy.chatText = liveSpokenTextRef.current;
            copy.chatBubbleUntil = Date.now() + 2000;
          } else if (
            !isControlledMonk &&
            copy.chatBubbleUntil &&
            copy.chatBubbleUntil > Date.now() + 15000
          ) {
            copy.chatText = '';
            copy.chatBubbleUntil = 0;
          }
        }

        if (isControlledMonk) {
          const manualSpeed = 115;
          let vx = 0;
          let vy = 0;
          if (moveLeft) vx -= 1;
          if (moveRight) vx += 1;
          if (moveUp) vy -= 1;
          if (moveDown) vy += 1;

          if (vx !== 0 || vy !== 0) {
            copy.x = Math.max(25, Math.min(515, copy.x + vx * manualSpeed * dt));
            copy.y = Math.max(430, Math.min(945, copy.y + vy * manualSpeed * dt));
            copy.targetX = copy.x;
            copy.targetY = copy.y + vy * 10;
            if (vx !== 0) {
              copy.facingLeft = vx < 0;
              copy.moveAxis = 'x';
            } else {
              copy.moveAxis = 'y';
            }
          } else if (
            copy.woodenFishRippleUntil &&
            Date.now() < copy.woodenFishRippleUntil
          ) {
            copy.moveAxis = 'chant_wooden_fish';
          } else {
            copy.moveAxis = 'idle';
          }
          return copy;
        }

        copy.x = Math.max(mZone.minX, Math.min(mZone.maxX, copy.x));
        copy.y = Math.max(mZone.minY, Math.min(mZone.maxY, copy.y));
        copy.targetX = Math.max(mZone.minX, Math.min(mZone.maxX, copy.targetX));
        copy.targetY = Math.max(mZone.minY, Math.min(mZone.maxY, copy.targetY));

        if (copy.role === 'abbot' && copy.pauseTimer > 0) {
          copy.pauseTimer -= dt;
          copy.moveAxis = 'chant_wooden_fish';
          if (copy.pauseTimer <= 0) {
            copy.targetX =
              mZone.minX + Math.random() * Math.max(10, mZone.maxX - mZone.minX);
            copy.moveAxis = 'x';
          }
          return copy;
        }

        if (copy.moveAxis === 'x') {
          const dx = copy.targetX - copy.x;
          copy.facingLeft = dx < 0;
          if (Math.abs(dx) < 3) {
            copy.x = copy.targetX;
            if (copy.role === 'abbot') {
              copy.pauseTimer = 4.5 + Math.random() * 2.5;
              copy.moveAxis = 'chant_wooden_fish';
            } else {
              if (Math.random() < 0.45) {
                copy.targetY =
                  mZone.minY + Math.random() * Math.max(10, mZone.maxY - mZone.minY);
                copy.moveAxis = 'y';
              } else {
                copy.targetX =
                  mZone.minX + Math.random() * Math.max(10, mZone.maxX - mZone.minX);
                copy.moveAxis = 'x';
              }
            }
          } else {
            copy.x += Math.sign(dx) * Math.min(Math.abs(dx), copy.speed * dt);
          }
        } else {
          const dy = copy.targetY - copy.y;
          if (Math.abs(dy) < 3) {
            copy.y = copy.targetY;
            copy.targetX =
              mZone.minX + Math.random() * Math.max(10, mZone.maxX - mZone.minX);
            copy.moveAxis = 'x';
          } else {
            copy.y += Math.sign(dy) * Math.min(Math.abs(dy), copy.speed * dt);
          }
        }
        return copy;
      });
      monksRef.current = nextMonks;
      setMonks(nextMonks);

      // 2. Update Pilgrims (3-Lane Red Carpet + Offering Ceremony + VIP Row Check/Wait + Seated Bows + Manual AWSD)
      const allSlots = [...vipSlotsRef.current, ...normalSlotsRef.current];
      const nextPilgrims: PilgrimData[] = [];
      const ceremonyY = Math.max(545, cfg.incenseBurner.y + 82);
      const vipRowY =
        vipSlotsRef.current[0]?.y ??
        Math.max(490, cfg.redPrayZones.left.minY - 46);

      for (const p of pilgrimsRef.current) {
        const copy = { ...p, animTime: p.animTime + dt };
        const isControlledPilgrim = activeControl === `pilgrim:${copy.id}`;

        if (isControlledPilgrim) {
          if (copy.slotId) {
            releaseSlotById(copy.slotId);
            copy.slotId = null;
          }
          copy.state = 'manual_control';
          const manualSpeed = 120;
          let vx = 0;
          let vy = 0;
          if (moveLeft) vx -= 1;
          if (moveRight) vx += 1;
          if (moveUp) vy -= 1;
          if (moveDown) vy += 1;

          if (vx !== 0 || vy !== 0) {
            copy.x = Math.max(25, Math.min(515, copy.x + vx * manualSpeed * dt));
            copy.y = Math.max(470, Math.min(948, copy.y + vy * manualSpeed * dt));
            if (vx !== 0) {
              copy.facingLeft = vx < 0;
              copy.manualMoveDir = vx < 0 ? 'left' : 'right';
            } else {
              copy.manualMoveDir = vy < 0 ? 'up' : 'down';
            }
          } else if (
            copy.woodenFishRippleUntil &&
            Date.now() < copy.woodenFishRippleUntil
          ) {
            copy.manualMoveDir = 'wooden_fish';
          } else {
            copy.manualMoveDir = 'idle';
          }

          nextPilgrims.push(copy);
          continue;
        } else if (copy.state === 'manual_control') {
          copy.state = 'pray_seated';
          copy.prayTimer = Math.max(3, cfg.prayDurationSec);
          copy.totalPrayDuration = copy.prayTimer;
        }

        if (copy.state === 'walk_in_up') {
          const dx = copy.laneX - copy.x;
          if (Math.abs(dx) > 2) {
            copy.x += Math.sign(dx) * Math.min(Math.abs(dx), copy.speed * dt);
          } else {
            copy.x = copy.laneX;
          }

          const dy = ceremonyY - copy.y;
          if (Math.abs(dy) <= 4) {
            copy.y = ceremonyY;
            if (copy.isVip || copy.coins > 0) {
              copy.state = 'throw_offering_at_burner';
              copy.stateTimer = 0.55;
            } else {
              copy.state = 'ceremony_at_burner';
              copy.stateTimer = 1.2;
            }
          } else {
            copy.y += Math.sign(dy) * Math.min(Math.abs(dy), copy.speed * dt);
          }
        } else if (copy.state === 'throw_offering_at_burner') {
          copy.stateTimer -= dt;
          if (copy.stateTimer <= 0) {
            setLatestAltarOffering(copy.offeringType);
            spawnBurnerLotusBurst(cfg.incenseBurner.x, cfg.incenseBurner.y);
            copy.state = 'ceremony_at_burner';
            copy.stateTimer = 1.0;
          }
        } else if (copy.state === 'ceremony_at_burner') {
          copy.stateTimer -= dt;
          if (copy.stateTimer <= 0) {
            if (copy.isVip || copy.coins > 0) {
              copy.state = 'walk_to_vip_check';
            } else {
              if (!copy.slotId) {
                const freeNorm = normalSlotsRef.current.filter(
                  (s) => s.occupiedById === null
                );
                if (freeNorm.length > 0) {
                  const pick =
                    freeNorm[Math.floor(Math.random() * freeNorm.length)];
                  pick.occupiedById = copy.id;
                  copy.slotId = pick.id;
                  copy.slotX = pick.x;
                  copy.slotY = pick.y;
                }
              }
              copy.facingLeft = copy.slotX < copy.x;
              copy.state = 'walk_side_to_slot';
            }
          }
        } else if (copy.state === 'walk_to_vip_check') {
          const dy = vipRowY - copy.y;
          if (Math.abs(dy) <= 4) {
            copy.y = vipRowY;
            let freeVipSlots = vipSlotsRef.current.filter(
              (s) => s.occupiedById === null
            );

            if (freeVipSlots.length === 0 && !copy.isBot) {
              const botVip =
                nextPilgrims.find(
                  (other) =>
                    other.isBot &&
                    other.isVip &&
                    other.state === 'pray_seated' &&
                    other.slotId
                ) ||
                pilgrimsRef.current.find(
                  (other) =>
                    other.isBot &&
                    other.isVip &&
                    other.state === 'pray_seated' &&
                    other.slotId
                );
              if (botVip && botVip.slotId) {
                const freed = vipSlotsRef.current.find(
                  (s) => s.id === botVip.slotId
                );
                startPilgrimLeaving(botVip);
                if (freed) freeVipSlots = [freed];
              }
            }

            if (freeVipSlots.length > 0) {
              const chosenVip =
                freeVipSlots[Math.floor(Math.random() * freeVipSlots.length)];
              chosenVip.occupiedById = copy.id;
              copy.slotId = chosenVip.id;
              copy.slotX = chosenVip.x;
              copy.slotY = chosenVip.y;
              copy.facingLeft = copy.slotX < copy.x;
              copy.state = 'walk_side_to_slot';
            } else {
              copy.state = 'wait_for_vip_slot';
            }
          } else {
            copy.y += Math.sign(dy) * Math.min(Math.abs(dy), copy.speed * dt);
          }
        } else if (copy.state === 'wait_for_vip_slot') {
          const freeVipSlots = vipSlotsRef.current.filter(
            (s) => s.occupiedById === null
          );
          if (freeVipSlots.length > 0) {
            const chosenVip =
              freeVipSlots[Math.floor(Math.random() * freeVipSlots.length)];
            chosenVip.occupiedById = copy.id;
            copy.slotId = chosenVip.id;
            copy.slotX = chosenVip.x;
            copy.slotY = chosenVip.y;
            copy.facingLeft = copy.slotX < copy.x;
            copy.state = 'walk_side_to_slot';
          }
        } else if (copy.state === 'walk_side_to_slot') {
          const dx = copy.slotX - copy.x;
          copy.facingLeft = dx < 0;
          if (Math.abs(dx) <= 4) {
            copy.x = copy.slotX;
            copy.state = 'walk_vert_to_slot';
          } else {
            copy.x += Math.sign(dx) * Math.min(Math.abs(dx), copy.speed * dt);
          }
        } else if (copy.state === 'walk_vert_to_slot') {
          const dy = copy.slotY - copy.y;
          if (Math.abs(dy) <= 4) {
            copy.y = copy.slotY;
            const totalDur = Math.max(3, cfg.prayDurationSec);
            copy.totalPrayDuration = totalDur;
            copy.prayTimer = totalDur;
            copy.state = 'pray_seated';
          } else {
            copy.y += Math.sign(dy) * Math.min(Math.abs(dy), copy.speed * dt);
          }
        } else if (copy.state === 'pray_seated') {
          if (copy.slotId) {
            const slotObj = allSlots.find((s) => s.id === copy.slotId);
            if (slotObj) {
              copy.x = slotObj.x;
              copy.y = slotObj.y;
              copy.slotX = slotObj.x;
              copy.slotY = slotObj.y;
            }
          }
          copy.prayTimer -= dt;
          if (copy.prayTimer <= 0) {
            releaseSlotById(copy.slotId);
            copy.slotId = null;
            copy.state = 'leave_side_to_aisle';
            copy.facingLeft = copy.x > copy.laneX;
            copy.chatBubbleUntil = 0;
          }
        } else if (copy.state === 'leave_side_to_aisle') {
          const exitLaneX = copy.laneX || 270;
          const dx = exitLaneX - copy.x;
          copy.facingLeft = dx < 0;
          if (Math.abs(dx) <= 4) {
            copy.x = exitLaneX;
            copy.state = 'leave_down_exit';
          } else {
            copy.x += Math.sign(dx) * Math.min(Math.abs(dx), copy.speed * dt);
          }
        } else if (copy.state === 'leave_down_exit') {
          const dy = cfg.exitPoint.y - copy.y;
          if (dy <= 4) {
            releaseSlotById(copy.slotId);
            if (controlledTargetRef.current === `pilgrim:${copy.id}`) {
              controlledTargetRef.current = null;
              setControlledTarget(null);
            }
            continue;
          } else {
            copy.y += Math.min(dy, copy.speed * dt);
          }
        }

        nextPilgrims.push(copy);
      }

      // Process waiting queue (Hàng chờ ưu tiên: VIP/Gửi quà ở đầu hàng đợi được vào trước)
      if (queueRef.current.length > 0) {
        for (let i = 0; i < queueRef.current.length; i++) {
          const req = queueRef.current[i];
          if (req.isVip || req.coins > 0) {
            const maxCap = Math.max(
              cfg.botTargetCrowd + 6,
              vipSlotsRef.current.length + normalSlotsRef.current.length + 6
            );
            if (nextPilgrims.length < maxCap) {
              queueRef.current.splice(i, 1);
              setQueueCount(queueRef.current.length);
              const vipP = createPilgrimInstance(req, null, false);
              nextPilgrims.push(vipP);
              if (req.coins >= 10 && !req.isBot) {
                setCameraFocus({
                  pilgrimId: vipP.id,
                  until: Date.now() + 4000,
                });
              }
              break;
            }
          } else {
            const freeNorm = normalSlotsRef.current.filter(
              (s) => s.occupiedById === null
            );
            if (freeNorm.length > 0) {
              queueRef.current.splice(i, 1);
              setQueueCount(queueRef.current.length);
              const slot =
                freeNorm[Math.floor(Math.random() * freeNorm.length)];
              nextPilgrims.push(createPilgrimInstance(req, slot, false));
              break;
            }
          }
        }
      }

      // 3. Tần suất cầu nguyện định kỳ của NPC đang ngồi trên sân (npcPrayIntervalSec)
      const prayInterval = Math.max(1, cfg.npcPrayIntervalSec || 6);
      npcPrayTimer += dt;
      if (npcPrayTimer >= prayInterval) {
        npcPrayTimer = 0;
        const seatedBots = nextPilgrims.filter(
          (p) => p.isBot && p.state === 'pray_seated'
        );
        if (seatedBots.length > 0) {
          const chosenBot =
            seatedBots[Math.floor(Math.random() * seatedBots.length)];
          const nextPrayer = pickRandomNpcPrayer();
          chosenBot.prayer = nextPrayer;
          chosenBot.chatBubbleUntil =
            Date.now() + Math.max(2, cfg.chatBubbleDurationSec || 12) * 1000;

          const nowSec = performance.now() / 1000;
          if (
            cfg.npcPrayerTtsEnabled &&
            !soundEngine.getBusyState() &&
            nowSec - lastBotTtsSecRef.current >= Math.max(3, prayInterval)
          ) {
            lastBotTtsSecRef.current = nowSec;
            const speechLine = soundEngine.formatEventTemplate(
              cfg.npcPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]',
              chosenBot.username,
              nextPrayer
            );
            soundEngine.enqueueTTS(speechLine, false, cfg);
          }
        }
      }

      // 4. Duy trì chính xác số Phật tử giữ nhiệt trên sân (botTargetCrowd)
      const activePilgrims = nextPilgrims.filter(
        (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
      );

      if (cfg.autoCrowd) {
        // Nếu người dùng kéo giảm thanh "Duy trì trên sân" thấp hơn số lượng hiện tại -> cho bớt NPC đứng dậy đi về ngay
        if (activePilgrims.length > cfg.botTargetCrowd) {
          const excessCount = activePilgrims.length - cfg.botTargetCrowd;
          const removableBots = activePilgrims.filter(
            (p) => p.isBot && p.state === 'pray_seated'
          );
          for (let k = 0; k < Math.min(excessCount, removableBots.length); k++) {
            startPilgrimLeaving(removableBots[k]);
          }
        }
      }

      pilgrimsRef.current = nextPilgrims;
      setPilgrims(nextPilgrims);

      if (cfg.autoCrowd) {
        const currentActiveCount = pilgrimsRef.current.filter(
          (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
        ).length;

        if (currentActiveCount < cfg.botTargetCrowd) {
          autoSpawnTimer += dt;
          const deficit = cfg.botTargetCrowd - currentActiveCount;
          // Khi thiếu nhiều so với mục tiêu duy trì trên sân -> tự động tăng tốc bù nhanh (0.35s) để khớp ngay lập tức
          const effectiveSpawnInterval =
            deficit >= 2 ? 0.35 : Math.max(0.4, cfg.npcSpawnIntervalSec || 1.5);

          if (autoSpawnTimer >= effectiveSpawnInterval) {
            autoSpawnTimer = 0;
            const freeVipCount = vipSlotsRef.current.filter(
              (s) => s.occupiedById === null
            ).length;
            const isVip =
              freeVipCount > 0 && Math.random() * 100 < cfg.botVipPercent;
            const username = pickRandomNpcName();
            const prayer = pickRandomNpcPrayer();
            requestSpawnPilgrim({
              username,
              prayer,
              isVip,
              coins: isVip ? 5 : 0,
              playSound: false,
              isBot: true,
            });
          }
        } else {
          autoSpawnTimer = 0;
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [
    createPilgrimInstance,
    pickRandomNpcName,
    pickRandomNpcPrayer,
    releaseSlotById,
    requestSpawnPilgrim,
    spawnBurnerLotusBurst,
    startPilgrimLeaving,
  ]);

  const rebuildAllSlots = useCallback(
    (
      nextGrid: GridConfig,
      nextRedZones: { left: RectBounds; right: RectBounds }
    ) => {
      const freshNormal = buildNormalSlotsFromGrid(nextGrid, nextRedZones);
      const freshVip = buildVipSlotsFromConfig(nextGrid.vipCount, nextRedZones);

      pilgrimsRef.current.forEach((p) => {
        if (
          p.state === 'leave_side_to_aisle' ||
          p.state === 'leave_down_exit' ||
          !p.slotId
        ) {
          return;
        }
        if (p.isVip) {
          const freeV = freshVip.find((s) => s.occupiedById === null);
          if (freeV) {
            freeV.occupiedById = p.id;
            p.slotId = freeV.id;
            p.slotX = freeV.x;
            p.slotY = freeV.y;
          }
        } else {
          const freeN = freshNormal.find((s) => s.occupiedById === null);
          if (freeN) {
            freeN.occupiedById = p.id;
            p.slotId = freeN.id;
            p.slotX = freeN.x;
            p.slotY = freeN.y;
          }
        }
      });

      vipSlotsRef.current = freshVip;
      normalSlotsRef.current = freshNormal;
      setVipSlots([...freshVip]);
      setNormalSlots([...freshNormal]);
    },
    []
  );

  // Multi-tab Sync & TikTok WebSocket Listeners
  useEffect(() => {
    const unsubSync = syncService.onSync((packet) => {
      const { action, payload } = packet;
      switch (action) {
        case 'SPAWN_PILGRIM':
          requestSpawnPilgrim({ ...(payload as any), fromSync: true });
          break;
        case 'SPAWN_BATCH': {
          const count = payload.count || 15;
          soundEngine.playBell(configRef.current.ttsVolume);
          for (let i = 0; i < count; i++) {
            setTimeout(() => {
              const username = pickRandomNpcName();
              const prayer = pickRandomNpcPrayer();
              requestSpawnPilgrim({
                username,
                prayer,
                isVip: i < 2,
                coins: i < 2 ? 5 : 0,
                playSound: false,
                isBot: true,
                fromSync: true,
              });
            }, i * 110);
          }
          break;
        }
        case 'LEAVE_ALL':
          pilgrimsRef.current.forEach((p) => startPilgrimLeaving(p));
          setPilgrims([...pilgrimsRef.current]);
          break;
        case 'PLAY_BELL':
          soundEngine.playBell(configRef.current.ttsVolume);
          break;
        case 'PLAY_WOODEN_FISH':
          soundEngine.playWoodenFish(configRef.current.ttsVolume);
          break;
        case 'PANIC_MUTE':
          soundEngine.stopImmediate();
          break;
        case 'TEST_TTS':
          soundEngine.enqueueTTS(payload.text, true, configRef.current);
          break;
        case 'UPDATE_CONFIG':
          setConfig((prev) => ({ ...prev, ...payload }));
          break;
        case 'UPDATE_GRID':
          setConfig((prev) => {
            const nextGrid = { ...prev.grid, ...payload };
            rebuildAllSlots(nextGrid, prev.redPrayZones);
            return { ...prev, grid: nextGrid };
          });
          break;
        case 'UPDATE_ZONES':
          setConfig((prev) => {
            const nextMonk = payload.monkZone || prev.monkZone;
            const nextRed = payload.redPrayZones || prev.redPrayZones;
            rebuildAllSlots(prev.grid, nextRed);
            return {
              ...prev,
              monkZone: nextMonk,
              redPrayZones: nextRed,
            };
          });
          break;
        case 'UPDATE_HUD_LAYOUT':
          setConfig((prev) => ({
            ...prev,
            hudLayout: { ...prev.hudLayout, ...payload },
          }));
          break;
        case 'UPDATE_WAYPOINT': {
          const { kind, index, x, y } = payload;
          if (kind === 'burner') {
            setConfig((prev) => ({ ...prev, incenseBurner: { x, y } }));
          } else if (kind === 'tray') {
            setConfig((prev) => ({ ...prev, offeringTrayPos: { x, y } }));
          } else if (kind === 'vip' && vipSlotsRef.current[index]) {
            vipSlotsRef.current[index] = { ...vipSlotsRef.current[index], x, y };
            setVipSlots([...vipSlotsRef.current]);
          } else if (kind === 'normal' && normalSlotsRef.current[index]) {
            normalSlotsRef.current[index] = {
              ...normalSlotsRef.current[index],
              x,
              y,
            };
            setNormalSlots([...normalSlotsRef.current]);
          }
          break;
        }
        case 'UPDATE_WAYPOINTS_BATCH': {
          const updates = payload.updates || [];
          updates.forEach(
            (u: { kind: 'vip' | 'normal'; index: number; pos: Point2D }) => {
              if (u.kind === 'vip' && vipSlotsRef.current[u.index]) {
                vipSlotsRef.current[u.index] = {
                  ...vipSlotsRef.current[u.index],
                  ...u.pos,
                };
              } else if (u.kind === 'normal' && normalSlotsRef.current[u.index]) {
                normalSlotsRef.current[u.index] = {
                  ...normalSlotsRef.current[u.index],
                  ...u.pos,
                };
              }
            }
          );
          setVipSlots([...vipSlotsRef.current]);
          setNormalSlots([...normalSlotsRef.current]);
          break;
        }
        case 'UPDATE_SAFETY': {
          if (payload.actionMode) setSafetyActionMode(payload.actionMode);
          if (payload.categories) setSafetyCategories(payload.categories);
          if (payload.customWords) {
            setCustomWords(payload.customWords);
            saveCustomWordsToStorage(payload.customWords);
          }
          break;
        }
        case 'TRIGGER_LIKE': {
          const count = Number(payload.count) || 1;
          const uname = payload.username || '';
          addGrandEventLotus(count);
          triggerHeadLotusBurst(uname, count >= 50 ? 4 : count >= 10 ? 2 : 1);
          break;
        }
        case 'TRIGGER_FOLLOW': {
          const uname = payload.username || 'Phật tử mới';
          addGrandEventLotus(100);
          triggerHeadLotusBurst(uname, 2);
          pushFloatingToast(`🌸 ${uname} vừa Follow (+100 Hoa Sen Đại Lễ)`, true);
          break;
        }
        case 'TRIGGER_GRAND_EVENT': {
          grandEventProgressRef.current = 0;
          setGrandEventProgress(0);
          activateGrandEventCelebration();
          break;
        }
        case 'RESTORE_BACKUP': {
          const data = payload as StudioBackupData;
          if (data.config) {
            const merged = mergeGameConfigWithDefaults(data.config);
            configRef.current = merged;
            setConfig(merged);
            const freshVip = buildVipSlotsFromConfig(
              merged.grid.vipCount,
              merged.redPrayZones
            );
            const freshNorm = buildNormalSlotsFromGrid(
              merged.grid,
              merged.redPrayZones
            );
            if (Array.isArray(data.vipSlots)) {
              data.vipSlots.forEach((sv, idx) => {
                if (freshVip[idx] && typeof sv.x === 'number' && typeof sv.y === 'number') {
                  freshVip[idx].x = sv.x;
                  freshVip[idx].y = sv.y;
                }
              });
            }
            if (Array.isArray(data.normalSlots)) {
              data.normalSlots.forEach((sn, idx) => {
                if (freshNorm[idx] && typeof sn.x === 'number' && typeof sn.y === 'number') {
                  freshNorm[idx].x = sn.x;
                  freshNorm[idx].y = sn.y;
                }
              });
            }
            vipSlotsRef.current = freshVip;
            normalSlotsRef.current = freshNorm;
            setVipSlots([...freshVip]);
            setNormalSlots([...freshNorm]);
          }
          if (data.customAssets) {
            setCustomAssets((prev) => ({ ...prev, ...data.customAssets }));
          }
          if (Array.isArray(data.npcNames) && data.npcNames.length > 0) {
            setNpcNames(data.npcNames);
            saveStringListToStorage(NPC_NAMES_STORAGE_KEY, data.npcNames);
          }
          if (Array.isArray(data.npcPrayers) && data.npcPrayers.length > 0) {
            setNpcPrayers(data.npcPrayers);
            saveStringListToStorage(NPC_PRAYERS_STORAGE_KEY, data.npcPrayers);
          }
          if (Array.isArray(data.npcAvatars)) {
            setNpcAvatars(data.npcAvatars);
            saveStringListToStorage(NPC_AVATARS_STORAGE_KEY, data.npcAvatars);
          }
          break;
        }
      }
    });

    const unsubTikTok = syncService.onTikTokEvent((ev) => {
      const incomingAvatar = ev.avatarUrl || ev.profilePictureUrl || null;
      if (ev.type === 'chat') {
        requestSpawnPilgrim({
          username: ev.username || 'Phật tử',
          prayer: ev.comment || 'Nam Mô A Di Đà Phật',
          isVip: false,
          coins: 0,
          playSound: true,
          isBot: false,
          avatarUrl: incomingAvatar,
        });
      } else if (ev.type === 'gift') {
        requestSpawnPilgrim({
          username: ev.username || 'Đại thí chủ',
          prayer: `Thành tâm dâng lễ ${ev.giftName || 'Vật phẩm'} 🙏`,
          isVip: true,
          coins: ev.coins || 1,
          playSound: true,
          isBot: false,
          avatarUrl: incomingAvatar,
        });
      } else if (ev.type === 'like') {
        const count = Math.max(1, Number(ev.likeCount) || 1);
        addGrandEventLotus(count);
        triggerHeadLotusBurst(ev.username, count >= 30 ? 3 : 1);
      } else if (ev.type === 'follow') {
        const uname = ev.username || 'Phật tử mới';
        addGrandEventLotus(100);
        triggerHeadLotusBurst(uname, 2);
        pushFloatingToast(`🌸 ${uname} vừa Follow (+100 Hoa Sen Đại Lễ)`, true);
      }
    });

    return () => {
      unsubSync();
      unsubTikTok();
    };
  }, [
    activateGrandEventCelebration,
    addGrandEventLotus,
    pickRandomNpcName,
    pickRandomNpcPrayer,
    pushFloatingToast,
    rebuildAllSlots,
    requestSpawnPilgrim,
    startPilgrimLeaving,
    triggerHeadLotusBurst,
  ]);

  // Public Handlers for Studio UI
  const handleUpdateConfig = useCallback((patch: Partial<GameConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    syncService.sendCommand('UPDATE_CONFIG', patch);
  }, []);

  const handleUpdateGrid = useCallback(
    (patch: Partial<GridConfig>) => {
      setConfig((prev) => {
        const nextGrid: GridConfig = {
          ...prev.grid,
          ...patch,
          rows: Math.max(1, patch.rows ?? prev.grid.rows),
          cols: Math.max(1, patch.cols ?? prev.grid.cols),
          vipCount: Math.max(0, patch.vipCount ?? prev.grid.vipCount),
        };
        const nextRedZones = {
          left: {
            ...prev.redPrayZones.left,
            minY: patch.yTop !== undefined ? patch.yTop : prev.redPrayZones.left.minY,
            maxY:
              patch.yBottom !== undefined
                ? patch.yBottom
                : prev.redPrayZones.left.maxY,
          },
          right: {
            ...prev.redPrayZones.right,
            minY: patch.yTop !== undefined ? patch.yTop : prev.redPrayZones.right.minY,
            maxY:
              patch.yBottom !== undefined
                ? patch.yBottom
                : prev.redPrayZones.right.maxY,
          },
        };
        rebuildAllSlots(nextGrid, nextRedZones);
        syncService.sendCommand('UPDATE_GRID', nextGrid);
        if (patch.yTop !== undefined || patch.yBottom !== undefined) {
          syncService.sendCommand('UPDATE_ZONES', { redPrayZones: nextRedZones });
        }
        return {
          ...prev,
          grid: nextGrid,
          redPrayZones: nextRedZones,
        };
      });
    },
    [rebuildAllSlots]
  );

  const handleUpdateZoneBounds = useCallback(
    (zoneKey: ZoneKey, nextBounds: RectBounds) => {
      setConfig((prev) => {
        if (zoneKey === 'monk') {
          syncService.sendCommand('UPDATE_ZONES', { monkZone: nextBounds });
          return { ...prev, monkZone: nextBounds };
        }
        const nextRedZones = {
          left: zoneKey === 'leftPray' ? nextBounds : prev.redPrayZones.left,
          right: zoneKey === 'rightPray' ? nextBounds : prev.redPrayZones.right,
        };
        rebuildAllSlots(prev.grid, nextRedZones);
        syncService.sendCommand('UPDATE_ZONES', { redPrayZones: nextRedZones });
        return {
          ...prev,
          redPrayZones: nextRedZones,
        };
      });
    },
    [rebuildAllSlots]
  );

  const handleUpdateHudLayout = useCallback((patch: Partial<HudLayoutConfig>) => {
    setConfig((prev) => {
      const nextHud = { ...prev.hudLayout, ...patch };
      syncService.sendCommand('UPDATE_HUD_LAYOUT', patch);
      return { ...prev, hudLayout: nextHud };
    });
  }, []);

  const handleUpdateHudBox = useCallback(
    (boxKey: HudBoxKey, nextBox: HudBoxPosition) => {
      setConfig((prev) => {
        syncService.sendCommand('UPDATE_HUD_LAYOUT', { [boxKey]: nextBox });
        return {
          ...prev,
          hudLayout: {
            ...prev.hudLayout,
            [boxKey]: nextBox,
          },
        };
      });
    },
    []
  );

  const handleMoveWaypoint = useCallback(
    (kind: 'burner' | 'tray' | 'vip' | 'normal', index: number, pos: Point2D) => {
      if (kind === 'burner') {
        setConfig((prev) => ({ ...prev, incenseBurner: pos }));
      } else if (kind === 'tray') {
        setConfig((prev) => ({ ...prev, offeringTrayPos: pos }));
      } else if (kind === 'vip' && vipSlotsRef.current[index]) {
        vipSlotsRef.current[index] = { ...vipSlotsRef.current[index], ...pos };
        setVipSlots([...vipSlotsRef.current]);
      } else if (kind === 'normal' && normalSlotsRef.current[index]) {
        normalSlotsRef.current[index] = {
          ...normalSlotsRef.current[index],
          ...pos,
        };
        setNormalSlots([...normalSlotsRef.current]);
      }
      syncService.sendCommand('UPDATE_WAYPOINT', {
        kind,
        index,
        x: pos.x,
        y: pos.y,
      });
    },
    []
  );

  const handleMoveWaypointsBatch = useCallback(
    (updates: Array<{ kind: 'vip' | 'normal'; index: number; pos: Point2D }>) => {
      updates.forEach((u) => {
        if (u.kind === 'vip' && vipSlotsRef.current[u.index]) {
          vipSlotsRef.current[u.index] = {
            ...vipSlotsRef.current[u.index],
            ...u.pos,
          };
        } else if (u.kind === 'normal' && normalSlotsRef.current[u.index]) {
          normalSlotsRef.current[u.index] = {
            ...normalSlotsRef.current[u.index],
            ...u.pos,
          };
        }
      });
      setVipSlots([...vipSlotsRef.current]);
      setNormalSlots([...normalSlotsRef.current]);
      syncService.sendCommand('UPDATE_WAYPOINTS_BATCH', { updates });
    },
    []
  );

  const handleSpawnRandom = useCallback(
    (isVip: boolean) => {
      const username = pickRandomNpcName();
      const prayer = pickRandomNpcPrayer();
      const coins = isVip ? [1, 5, 10, 25][Math.floor(Math.random() * 4)] : 0;
      requestSpawnPilgrim({
        username,
        prayer,
        isVip,
        coins,
        playSound: true,
        isBot: false,
        broadcastSync: true,
      });
    },
    [pickRandomNpcName, pickRandomNpcPrayer, requestSpawnPilgrim]
  );

  const handleSpawnBatch = useCallback(
    (count = 15) => {
      syncService.sendCommand('SPAWN_BATCH', { count });
      soundEngine.playBell(configRef.current.ttsVolume);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const username = pickRandomNpcName();
          const prayer = pickRandomNpcPrayer();
          requestSpawnPilgrim({
            username,
            prayer,
            isVip: i < 2,
            coins: i < 2 ? 5 : 0,
            playSound: false,
            isBot: true,
          });
        }, i * 110);
      }
    },
    [pickRandomNpcName, pickRandomNpcPrayer, requestSpawnPilgrim]
  );

  const handleLeaveAll = useCallback(() => {
    syncService.sendCommand('LEAVE_ALL', {});
    pilgrimsRef.current.forEach((p) => startPilgrimLeaving(p));
    setPilgrims([...pilgrimsRef.current]);
  }, [startPilgrimLeaving]);

  const handleSpawnCustom = useCallback(
    (
      username: string,
      prayer: string,
      isVip: boolean,
      coins?: number,
      avatarUrl?: string | null
    ) => {
      const finalCoins =
        coins !== undefined ? coins : isVip ? 10 : 0;
      requestSpawnPilgrim({
        username,
        prayer,
        isVip: isVip || finalCoins > 0,
        coins: finalCoins,
        playSound: true,
        isBot: false,
        broadcastSync: true,
        avatarUrl: avatarUrl || null,
      });
    },
    [requestSpawnPilgrim]
  );

  const handleToggleLocalMute = useCallback(() => {
    const next = !isLocalTabMuted;
    soundEngine.setTabMuted(next);
    setIsLocalTabMuted(next);
  }, [isLocalTabMuted]);

  const handlePlayBell = useCallback(() => {
    syncService.sendCommand('PLAY_BELL', {});
    soundEngine.playBell(configRef.current.ttsVolume);
  }, []);

  const handlePlayWoodenFish = useCallback(() => {
    syncService.sendCommand('PLAY_WOODEN_FISH', {});
    soundEngine.playWoodenFish(configRef.current.ttsVolume);
  }, []);

  const handlePanicMute = useCallback(() => {
    syncService.sendCommand('PANIC_MUTE', {});
    soundEngine.stopImmediate();
  }, []);

  const handleTestTTS = useCallback(() => {
    const text = soundEngine.formatPrayerSpeech(
      'Nguyễn Thị Yến Nhi',
      'Cầu cho gia đình năm nay bình an, vạn sự hanh thông',
      true,
      configRef.current.ttsTemplate
    );
    syncService.sendCommand('TEST_TTS', { text });
    soundEngine.enqueueTTS(text, true, configRef.current);
  }, []);

  const handleNextDharmaArticle = useCallback(() => {
    soundEngine.skipToNextDharmaArticle(configRef.current);
  }, []);

  // NPC List, Avatar Pool & Direct Control Handlers
  const handleUpdateNpcNames = useCallback((nextList: string[]) => {
    const cleaned = nextList.map((s) => s.trim()).filter(Boolean);
    setNpcNames(cleaned);
    saveStringListToStorage(NPC_NAMES_STORAGE_KEY, cleaned);
  }, []);

  const handleResetNpcNames = useCallback(() => {
    setNpcNames([...SAMPLE_NAMES]);
    saveStringListToStorage(NPC_NAMES_STORAGE_KEY, SAMPLE_NAMES);
  }, []);

  const handleUpdateNpcPrayers = useCallback((nextList: string[]) => {
    const cleaned = nextList.map((s) => s.trim()).filter(Boolean);
    setNpcPrayers(cleaned);
    saveStringListToStorage(NPC_PRAYERS_STORAGE_KEY, cleaned);
  }, []);

  const handleResetNpcPrayers = useCallback(() => {
    setNpcPrayers([...SAMPLE_PRAYERS]);
    saveStringListToStorage(NPC_PRAYERS_STORAGE_KEY, SAMPLE_PRAYERS);
  }, []);

  const handleUpdateNpcAvatars = useCallback((nextList: string[]) => {
    const cleaned = nextList.map((s) => s.trim()).filter(Boolean);
    setNpcAvatars(cleaned);
    npcAvatarsRef.current = cleaned;
    saveStringListToStorage(NPC_AVATARS_STORAGE_KEY, cleaned);
  }, []);

  const handleResetNpcAvatars = useCallback(() => {
    setNpcAvatars([...DEFAULT_NPC_AVATARS]);
    npcAvatarsRef.current = [...DEFAULT_NPC_AVATARS];
    saveStringListToStorage(NPC_AVATARS_STORAGE_KEY, DEFAULT_NPC_AVATARS);
  }, []);

  const handleRandomizeActiveNpcAvatars = useCallback(() => {
    const pool = npcAvatarsRef.current;
    pilgrimsRef.current = pilgrimsRef.current.map((p) => {
      if (!p.isBot) return p;
      const randomAvatar =
        pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
      return {
        ...p,
        avatarUrl: randomAvatar,
      };
    });
    setPilgrims([...pilgrimsRef.current]);
  }, []);

  const handleSendControlledChat = useCallback(
    (rawChat: string) => {
      const text = rawChat.trim();
      const target = controlledTargetRef.current;
      if (!text || !target || typeof target !== 'string') return;

      const cfg = configRef.current;
      const bubbleDurMs = Math.max(2, cfg.chatBubbleDurationSec || 12) * 1000;
      const nowMs = Date.now();

      if (target.startsWith('monk:')) {
        const monkId = target.replace('monk:', '');
        let speakerName = 'Chư Tăng';
        monksRef.current = monksRef.current.map((m) => {
          if (m.id === monkId) {
            speakerName = m.name;
            return {
              ...m,
              chatText: text,
              chatBubbleUntil: nowMs + bubbleDurMs,
            };
          }
          return m;
        });
        setMonks([...monksRef.current]);
        soundEngine.playWoodenFish(cfg.ttsVolume);
        pushFloatingToast(`${speakerName}: ${text}`, true);
        if (cfg.ttsEnabled) {
          soundEngine.enqueueTTS(`${speakerName} nhắn nhủ: ${text}`, true, cfg);
        }
      } else if (target.startsWith('pilgrim:')) {
        const pid = Number(target.replace('pilgrim:', ''));
        let speakerName = 'Phật tử';
        let speakerVip = false;
        pilgrimsRef.current = pilgrimsRef.current.map((p) => {
          if (p.id === pid) {
            speakerName = p.username;
            speakerVip = p.isVip;
            return {
              ...p,
              prayer: text,
              chatBubbleUntil: nowMs + bubbleDurMs,
            };
          }
          return p;
        });
        setPilgrims([...pilgrimsRef.current]);
        soundEngine.playWoodenFish(cfg.ttsVolume);
        pushFloatingToast(`${speakerName}: ${text}`, speakerVip);
        if (cfg.ttsEnabled) {
          const speechLine = soundEngine.formatPrayerSpeech(
            speakerName,
            text,
            speakerVip,
            cfg.ttsTemplate
          );
          soundEngine.enqueueTTS(speechLine, speakerVip, cfg);
        }
      }
    },
    [pushFloatingToast]
  );

  // Safety Filter Handlers
  const handleChangeSafetyMode = useCallback((mode: SafetyActionMode) => {
    setSafetyActionMode(mode);
    syncService.sendCommand('UPDATE_SAFETY', { actionMode: mode });
  }, []);

  const handleToggleSafetyCategory = useCallback(
    (key: string, enabled: boolean) => {
      setSafetyCategories((prev) => {
        const next = prev.map((c) => (c.key === key ? { ...c, enabled } : c));
        syncService.sendCommand('UPDATE_SAFETY', { categories: next });
        return next;
      });
    },
    []
  );

  const handleAddCustomWords = useCallback((rawInput: string) => {
    const parts = rawInput
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    setCustomWords((prev) => {
      const merged = Array.from(new Set([...prev, ...parts]));
      saveCustomWordsToStorage(merged);
      syncService.sendCommand('UPDATE_SAFETY', { customWords: merged });
      return merged;
    });
  }, []);

  const handleRemoveCustomWord = useCallback((word: string) => {
    setCustomWords((prev) => {
      const next = prev.filter((w) => w !== word);
      saveCustomWordsToStorage(next);
      syncService.sendCommand('UPDATE_SAFETY', { customWords: next });
      return next;
    });
  }, []);

  const handleResetCustomWords = useCallback(() => {
    const defaults = getDefaultCustomWords();
    saveCustomWordsToStorage(defaults);
    setCustomWords(defaults);
    syncService.sendCommand('UPDATE_SAFETY', { customWords: defaults });
  }, []);

  const handleSpawnTrollTest = useCallback(() => {
    const samples = [
      { u: 'Châu Tinh Trùng', p: 'v.c.l vào kubet đánh tài xỉu ăn tiền' },
      { u: 'Anh Hùng Bàn Phím', p: 'kết bạn zalo 0987654321 kéo tài xỉu' },
      { u: 'Bành Thị Lồng', p: 'chùa lừa đảo cúng tiền cho sư' },
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    requestSpawnPilgrim({
      username: pick.u,
      prayer: pick.p,
      isVip: true,
      coins: 5,
      playSound: true,
      isBot: false,
      broadcastSync: true,
    });
  }, [requestSpawnPilgrim]);

  const handleUploadAsset = useCallback(
    (key: keyof CustomAssetsConfig, file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomAssets((prev) => ({ ...prev, [key]: reader.result as string }));
        }
      };
      reader.onerror = () => {
        const url = URL.createObjectURL(file);
        setCustomAssets((prev) => ({ ...prev, [key]: url }));
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleResetAsset = useCallback((key: keyof CustomAssetsConfig) => {
    setCustomAssets((prev) => ({ ...prev, [key]: DEFAULT_SPRITESHEETS[key] || null }));
  }, []);

  const getBackupObject = useCallback((): StudioBackupData => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: configRef.current,
      incenseBurner: configRef.current.incenseBurner,
      offeringTrayPos: configRef.current.offeringTrayPos,
      monkZone: configRef.current.monkZone,
      redPrayZones: configRef.current.redPrayZones,
      hudLayout: configRef.current.hudLayout,
      grid: configRef.current.grid,
      vipSlots: vipSlotsRef.current.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        side: s.side,
      })),
      normalSlots: normalSlotsRef.current.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        side: s.side,
        row: s.row,
        col: s.col,
      })),
      npcNames: npcNamesRef.current,
      npcPrayers: npcPrayersRef.current,
      npcAvatars: npcAvatarsRef.current,
      customAssets,
      safetyActionMode,
      safetyCategories,
      customWords,
    };
  }, [customAssets, customWords, safetyActionMode, safetyCategories]);

  const handleSaveBackupJson = useCallback(() => {
    const backupData = getBackupObject();
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kim-thien-tu-config-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    pushFloatingToast('💾 Đã xuất file cấu hình .json thành công!', true);
  }, [getBackupObject, pushFloatingToast]);

  const handleLoadBackupJson = useCallback(
    (rawJsonText: string): { ok: boolean; message: string } => {
      try {
        const parsed = JSON.parse(rawJsonText) as StudioBackupData;
        if (!parsed || typeof parsed !== 'object') {
          return { ok: false, message: 'Nội dung JSON không hợp lệ.' };
        }

        const baseConfigPatch: Partial<GameConfig> = {
          ...(parsed.config || {}),
          ...(parsed.incenseBurner ? { incenseBurner: parsed.incenseBurner } : {}),
          ...(parsed.offeringTrayPos ? { offeringTrayPos: parsed.offeringTrayPos } : {}),
          ...(parsed.monkZone ? { monkZone: parsed.monkZone } : {}),
          ...(parsed.redPrayZones ? { redPrayZones: parsed.redPrayZones } : {}),
          ...(parsed.grid
            ? { grid: { ...configRef.current.grid, ...parsed.grid } }
            : {}),
          ...(parsed.hudLayout
            ? { hudLayout: { ...configRef.current.hudLayout, ...parsed.hudLayout } }
            : {}),
        };

        const mergedConfig = mergeGameConfigWithDefaults({
          ...configRef.current,
          ...baseConfigPatch,
        });

        configRef.current = mergedConfig;
        setConfig(mergedConfig);

        const freshVip = buildVipSlotsFromConfig(
          mergedConfig.grid.vipCount,
          mergedConfig.redPrayZones
        );
        const freshNormal = buildNormalSlotsFromGrid(
          mergedConfig.grid,
          mergedConfig.redPrayZones
        );

        if (Array.isArray(parsed.vipSlots)) {
          parsed.vipSlots.forEach((sv, idx) => {
            const target = freshVip.find((item) => item.id === sv.id) || freshVip[idx];
            if (target && typeof sv.x === 'number' && typeof sv.y === 'number') {
              target.x = sv.x;
              target.y = sv.y;
            }
          });
        }

        if (Array.isArray(parsed.normalSlots)) {
          parsed.normalSlots.forEach((sn, idx) => {
            const target =
              freshNormal.find((item) => item.id === sn.id) || freshNormal[idx];
            if (target && typeof sn.x === 'number' && typeof sn.y === 'number') {
              target.x = sn.x;
              target.y = sn.y;
            }
          });
        }

        pilgrimsRef.current.forEach((p) => {
          if (
            p.state === 'leave_side_to_aisle' ||
            p.state === 'leave_down_exit' ||
            !p.slotId
          ) {
            return;
          }
          if (p.isVip) {
            const freeV =
              freshVip.find((s) => s.id === p.slotId && s.occupiedById === null) ||
              freshVip.find((s) => s.occupiedById === null);
            if (freeV) {
              freeV.occupiedById = p.id;
              p.slotId = freeV.id;
              p.slotX = freeV.x;
              p.slotY = freeV.y;
            }
          } else {
            const freeN =
              freshNormal.find((s) => s.id === p.slotId && s.occupiedById === null) ||
              freshNormal.find((s) => s.occupiedById === null);
            if (freeN) {
              freeN.occupiedById = p.id;
              p.slotId = freeN.id;
              p.slotX = freeN.x;
              p.slotY = freeN.y;
            }
          }
        });

        vipSlotsRef.current = freshVip;
        normalSlotsRef.current = freshNormal;
        setVipSlots([...freshVip]);
        setNormalSlots([...freshNormal]);

        if (Array.isArray(parsed.npcNames) && parsed.npcNames.length > 0) {
          const cleanNames = parsed.npcNames.map((s) => String(s).trim()).filter(Boolean);
          setNpcNames(cleanNames);
          npcNamesRef.current = cleanNames;
          saveStringListToStorage(NPC_NAMES_STORAGE_KEY, cleanNames);
        }

        if (Array.isArray(parsed.npcPrayers) && parsed.npcPrayers.length > 0) {
          const cleanPrayers = parsed.npcPrayers
            .map((s) => String(s).trim())
            .filter(Boolean);
          setNpcPrayers(cleanPrayers);
          npcPrayersRef.current = cleanPrayers;
          saveStringListToStorage(NPC_PRAYERS_STORAGE_KEY, cleanPrayers);
        }

        if (Array.isArray(parsed.npcAvatars)) {
          const cleanAvatars = parsed.npcAvatars
            .map((s) => String(s).trim())
            .filter(Boolean);
          setNpcAvatars(cleanAvatars);
          npcAvatarsRef.current = cleanAvatars;
          saveStringListToStorage(NPC_AVATARS_STORAGE_KEY, cleanAvatars);
        }

        if (parsed.customAssets && typeof parsed.customAssets === 'object') {
          setCustomAssets((prev) => ({
            ...prev,
            ...parsed.customAssets,
          }));
        }

        if (parsed.safetyActionMode) {
          setSafetyActionMode(parsed.safetyActionMode);
        }
        if (Array.isArray(parsed.safetyCategories)) {
          setSafetyCategories(parsed.safetyCategories);
        }
        if (Array.isArray(parsed.customWords)) {
          setCustomWords(parsed.customWords);
          saveCustomWordsToStorage(parsed.customWords);
        }

        syncService.sendCommand('RESTORE_BACKUP', {
          config: mergedConfig,
          vipSlots: freshVip.map((s) => ({ id: s.id, x: s.x, y: s.y, side: s.side })),
          normalSlots: freshNormal.map((s) => ({
            id: s.id,
            x: s.x,
            y: s.y,
            side: s.side,
            row: s.row,
            col: s.col,
          })),
          npcNames: parsed.npcNames,
          npcPrayers: parsed.npcPrayers,
          npcAvatars: parsed.npcAvatars,
          customAssets: parsed.customAssets,
        });

        pushFloatingToast('📂 Đã nạp cấu hình từ file .json thành công!', true);
        return {
          ok: true,
          message: 'Đã nạp đầy đủ cấu hình, vị trí ghế, bảng và âm thanh thành công!',
        };
      } catch {
        return {
          ok: false,
          message: 'Không thể đọc file JSON. Vui lòng kiểm tra đúng định dạng file .json.',
        };
      }
    },
    [pushFloatingToast]
  );

  const handleTriggerLike = useCallback(
    (count = 1, username?: string) => {
      syncService.sendCommand('TRIGGER_LIKE', { count, username });
      addGrandEventLotus(count);
      triggerHeadLotusBurst(username, count >= 50 ? 4 : count >= 10 ? 2 : 1);
    },
    [addGrandEventLotus, triggerHeadLotusBurst]
  );

  const handleTriggerFollow = useCallback(
    (username?: string) => {
      const uname = username || pickRandomNpcName();
      syncService.sendCommand('TRIGGER_FOLLOW', { username: uname });
      addGrandEventLotus(100);
      triggerHeadLotusBurst(uname, 2);
      pushFloatingToast(`🌸 ${uname} vừa Follow (+100 Hoa Sen Đại Lễ)`, true);
    },
    [addGrandEventLotus, pickRandomNpcName, pushFloatingToast, triggerHeadLotusBurst]
  );

  const handleTriggerGrandEvent = useCallback(() => {
    syncService.sendCommand('TRIGGER_GRAND_EVENT', {});
    grandEventProgressRef.current = 0;
    setGrandEventProgress(0);
    activateGrandEventCelebration();
  }, [activateGrandEventCelebration]);

  const comboTestTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const handleTriggerGiftCombo = useCallback(
    (
      mode: 'streak_50_roses' | 'instant_50_roses' | 'multi_user_combo_storm',
      customUsername?: string,
      customPrayer?: string,
      customAvatarUrl?: string | null
    ) => {
      // Dọn các timer test cũ nếu bấm liên tiếp
      comboTestTimersRef.current.forEach((t) => clearTimeout(t));
      comboTestTimersRef.current = [];

      const uname = (customUsername || '').trim() || 'Nguyễn Thị Yến Nhi';
      const uprayer =
        (customPrayer || '').trim() ||
        'Thành tâm dâng 50 Hoa Hồng cầu gia đạo bình an, vạn sự cát tường 🙏';

      if (mode === 'instant_50_roses') {
        // Trường hợp 1: Khách chọn gửi gộp 1 phát 50 Hoa Hồng (50 Xu) ngay lập tức
        requestSpawnPilgrim({
          username: uname,
          prayer: uprayer,
          isVip: true,
          coins: 50,
          comboCount: 50,
          giftName: 'Hoa hồng',
          resetCombo: true,
          playSound: true,
          isBot: false,
          broadcastSync: true,
          avatarUrl: customAvatarUrl || null,
        });
        return;
      }

      if (mode === 'streak_50_roses') {
        // Trường hợp 2: Khách bấm nhấp liên hoàn 50 lần Hoa Hồng (x1 -> x2 -> ... -> x50)
        // Thấy rõ lễ vật trên tay tự nâng cấp: Sen Hồng (x1..4) -> Sen Vàng (x5..9) -> Mâm Quả (x10) -> Mâm Quả Hoàng Kim + Hào Quang + Zoom 3s (x11..50)
        let accumulatedDelay = 0;
        for (let i = 1; i <= 50; i++) {
          const stepDelay = i <= 12 ? 95 : i <= 25 ? 55 : 35;
          accumulatedDelay += i === 1 ? 0 : stepDelay;
          const timer = setTimeout(() => {
            requestSpawnPilgrim({
              username: uname,
              prayer: uprayer,
              isVip: true,
              coins: 1,
              comboCount: 1,
              giftName: 'Hoa hồng',
              resetCombo: i === 1,
              playSound: true,
              isBot: false,
              broadcastSync: true,
              avatarUrl: customAvatarUrl || null,
            });
          }, accumulatedDelay);
          comboTestTimersRef.current.push(timer);
        }
        return;
      }

      if (mode === 'multi_user_combo_storm') {
        // Trường hợp 3: 5 đại thí chủ cùng lúc bấm combo liên thanh (Test chống nghẽn chuông, chống trùng nhân vật & gộp TTS)
        const donorsList = [
          {
            name: uname,
            gift: 'Hoa hồng',
            unitCoin: 1,
            hits: 20,
            prayer: 'Dâng combo Hoa Hồng cầu bình an vô sự 🙏',
            avatarUrl: customAvatarUrl || null,
          },
          {
            name: 'Đại Thí Chủ Minh Tâm',
            gift: 'Bắn tim',
            unitCoin: 5,
            hits: 10,
            prayer: 'Cầu tài lộc hanh thông, công việc thuận buồm xuôi gió 🙏',
            avatarUrl: null,
          },
          {
            name: 'Trần Bảo Ngọc',
            gift: 'Hoa hồng',
            unitCoin: 1,
            hits: 15,
            prayer: 'Cầu cha mẹ mạnh khỏe, bách niên giai lão 🙏',
            avatarUrl: null,
          },
          {
            name: 'Lê Hoàng Nam',
            gift: 'Rosa',
            unitCoin: 10,
            hits: 5,
            prayer: 'Thành tâm dâng lễ cầu quốc thái dân an 🙏',
            avatarUrl: null,
          },
        ];

        donorsList.forEach((d, dIdx) => {
          for (let hit = 1; hit <= d.hits; hit++) {
            const delay = dIdx * 180 + (hit - 1) * 85;
            const timer = setTimeout(() => {
              requestSpawnPilgrim({
                username: d.name,
                prayer: d.prayer,
                isVip: true,
                coins: d.unitCoin,
                comboCount: 1,
                giftName: d.gift,
                resetCombo: hit === 1,
                playSound: true,
                isBot: false,
                broadcastSync: true,
                avatarUrl: d.avatarUrl,
              });
            }, delay);
            comboTestTimersRef.current.push(timer);
          }
        });
      }
    },
    [requestSpawnPilgrim]
  );

  const activePilgrimsList = pilgrims.filter(
    (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
  );
  const botCount = activePilgrimsList.filter((p) => p.isBot).length;
  const realCount = activePilgrimsList.length - botCount;

  return {
    config,
    vipSlots,
    normalSlots,
    pilgrims,
    monks,
    realCount,
    botCount,
    queueCount,
    donors,
    floatingToasts,
    customAssets,
    grandEventProgress,
    goldenLotusRainUntil,
    latestAltarOffering,
    burnerLotusBursts,
    flyingLotuses,
    eventBarFlashKey,
    cameraFocus,
    npcNames,
    npcPrayers,
    npcAvatars,
    controlledTarget,
    setControlledTarget,
    isLocalTabMuted,
    ttsStatus,
    wsStatus,
    peerCounts,
    safetyActionMode,
    safetyCategories,
    customWords,
    safetyLogs,
    setSafetyActionMode: handleChangeSafetyMode,
    clearSafetyLogs: () => setSafetyLogs([]),
    connectWs: (url: string) => syncService.connectWebSocket(url),
    handleUpdateConfig,
    handleUpdateGrid,
    handleUpdateZoneBounds,
    handleUpdateHudLayout,
    handleUpdateHudBox,
    handleMoveWaypoint,
    handleMoveWaypointsBatch,
    handleSpawnRandom,
    handleSpawnBatch,
    handleLeaveAll,
    handleSpawnCustom,
    handleToggleLocalMute,
    handlePlayBell,
    handlePlayWoodenFish,
    handlePanicMute,
    handleTestTTS,
    handleNextDharmaArticle,
    handleUpdateNpcNames,
    handleResetNpcNames,
    handleUpdateNpcPrayers,
    handleResetNpcPrayers,
    handleUpdateNpcAvatars,
    handleResetNpcAvatars,
    handleRandomizeActiveNpcAvatars,
    handleControlledWoodenFish,
    handleSendControlledChat,
    handleToggleSafetyCategory,
    handleAddCustomWords,
    handleRemoveCustomWord,
    handleResetCustomWords,
    handleSpawnTrollTest,
    handleUploadAsset,
    handleResetAsset,
    handleSaveBackupJson,
    handleLoadBackupJson,
    getBackupObject,
    handleTriggerLike,
    handleTriggerFollow,
    handleTriggerGrandEvent,
    handleTriggerGiftCombo,
  };
}


