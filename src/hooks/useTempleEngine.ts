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
import { EventTtsQueueSnapshot, soundEngine } from '../services/soundEngine';
import {
  getDefaultCustomWords,
  INITIAL_SAFETY_CATEGORIES,
  inspectUserInteraction,
  loadSavedCustomWords,
  saveCustomWordsToStorage,
} from '../services/safetyFilter';
import { syncService, WsConnectionStatus } from '../services/syncService';
import { idbGet, idbSet } from '../services/browserStorage';

const NPC_NAMES_STORAGE_KEY = 'temple_npc_names_v1';
const NPC_PRAYERS_STORAGE_KEY = 'temple_npc_prayers_v1';
const NPC_AVATARS_STORAGE_KEY = 'temple_npc_avatars_v1';
const TEMPLE_CONFIG_STORAGE_KEY = 'temple_studio_config_v1';
const TEMPLE_VIP_SLOTS_STORAGE_KEY = 'temple_vip_slots_v1';
const TEMPLE_NORMAL_SLOTS_STORAGE_KEY = 'temple_normal_slots_v1';
const TEMPLE_CUSTOM_ASSETS_STORAGE_KEY = 'temple_custom_assets_v1';
const TEMPLE_DONORS_STORAGE_KEY = 'temple_donors_v2';

function pickRandomTemplate(list: string[] | undefined, fallback: string): string {
  if (Array.isArray(list)) {
    const valid = list.map((s) => String(s).trim()).filter(Boolean);
    if (valid.length > 0) {
      return valid[Math.floor(Math.random() * valid.length)];
    }
  }
  return fallback;
}

function sanitizeAssetUrl(
  val: unknown,
  defaultUrl: string | null
): string | null {
  if (typeof val !== 'string' || !val.trim()) return defaultUrl;
  const trimmed = val.trim();
  // Dead blob: URLs from previous page sessions cannot survive F5
  if (trimmed.startsWith('blob:')) return defaultUrl;
  // Normalize absolute /assets/... to relative ./assets/... for GitHub Pages subpath
  if (trimmed.startsWith('/assets/')) return `.${trimmed}`;
  return trimmed;
}

function sanitizeCustomAssets(
  raw: Partial<CustomAssetsConfig> | null | undefined
): CustomAssetsConfig {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    customBgUrl: sanitizeAssetUrl(src.customBgUrl, DEFAULT_SPRITESHEETS.customBgUrl),
    templeSignPngUrl: sanitizeAssetUrl(
      src.templeSignPngUrl,
      DEFAULT_SPRITESHEETS.templeSignPngUrl
    ),
    pilgrimFemaleSpritesheetUrl: sanitizeAssetUrl(
      src.pilgrimFemaleSpritesheetUrl,
      DEFAULT_SPRITESHEETS.pilgrimFemaleSpritesheetUrl
    ),
    pilgrimMaleSpritesheetUrl: sanitizeAssetUrl(
      src.pilgrimMaleSpritesheetUrl,
      DEFAULT_SPRITESHEETS.pilgrimMaleSpritesheetUrl
    ),
    abbotSpritesheetUrl: sanitizeAssetUrl(
      src.abbotSpritesheetUrl,
      DEFAULT_SPRITESHEETS.abbotSpritesheetUrl
    ),
    seniorNoviceSpritesheetUrl: sanitizeAssetUrl(
      src.seniorNoviceSpritesheetUrl,
      DEFAULT_SPRITESHEETS.seniorNoviceSpritesheetUrl
    ),
    juniorNoviceSpritesheetUrl: sanitizeAssetUrl(
      src.juniorNoviceSpritesheetUrl,
      DEFAULT_SPRITESHEETS.juniorNoviceSpritesheetUrl
    ),
    offeringIncenseUrl: sanitizeAssetUrl(
      src.offeringIncenseUrl,
      DEFAULT_SPRITESHEETS.offeringIncenseUrl
    ),
    offeringRoseUrl: sanitizeAssetUrl(
      src.offeringRoseUrl,
      DEFAULT_SPRITESHEETS.offeringRoseUrl
    ),
    offeringLotusUrl: sanitizeAssetUrl(
      src.offeringLotusUrl,
      DEFAULT_SPRITESHEETS.offeringLotusUrl
    ),
    offeringTrayUrl: sanitizeAssetUrl(
      src.offeringTrayUrl,
      DEFAULT_SPRITESHEETS.offeringTrayUrl
    ),
  };
}

function loadDonorsFromStorage(): DonorEntry[] {
  try {
    const raw = localStorage.getItem(TEMPLE_DONORS_STORAGE_KEY);
    if (!raw) return [...INITIAL_DONORS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (d) => d && typeof d.username === 'string' && typeof d.coins === 'number' && d.coins > 0
      );
    }
  } catch {
    // ignore
  }
  return [...INITIAL_DONORS];
}

function mergeGameConfigWithDefaults(raw: Partial<GameConfig> | null | undefined): GameConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  const mergedTracks = Array.isArray(raw.bgmTracks)
    ? raw.bgmTracks.filter((t) => t && (!t.url || !String(t.url).startsWith('blob:')))
    : DEFAULT_CONFIG.bgmTracks;
  const safeTracks = mergedTracks.length > 0 ? mergedTracks : DEFAULT_CONFIG.bgmTracks;
  const activeTrackExists = safeTracks.some((t) => t.id === raw.activeBgmTrackId);

  const welcomeTemplates =
    Array.isArray(raw.welcomeTtsTemplates) && raw.welcomeTtsTemplates.length > 0
      ? raw.welcomeTtsTemplates
      : raw.realWelcomeTtsTemplate
      ? [raw.realWelcomeTtsTemplate, ...DEFAULT_CONFIG.welcomeTtsTemplates.slice(1)]
      : DEFAULT_CONFIG.welcomeTtsTemplates;

  const giftTemplates =
    Array.isArray(raw.giftTtsTemplates) && raw.giftTtsTemplates.length > 0
      ? raw.giftTtsTemplates
      : raw.realGiftTtsTemplate
      ? [raw.realGiftTtsTemplate, ...DEFAULT_CONFIG.giftTtsTemplates.slice(1)]
      : DEFAULT_CONFIG.giftTtsTemplates;

  const prayerTemplates =
    Array.isArray(raw.prayerTtsTemplates) && raw.prayerTtsTemplates.length > 0
      ? raw.prayerTtsTemplates
      : raw.realPrayerTtsTemplate
      ? [raw.realPrayerTtsTemplate, ...DEFAULT_CONFIG.prayerTtsTemplates.slice(1)]
      : DEFAULT_CONFIG.prayerTtsTemplates;

  return {
    ...DEFAULT_CONFIG,
    ...raw,
    bgmTracks: safeTracks,
    activeBgmTrackId: activeTrackExists
      ? (raw.activeBgmTrackId as string)
      : safeTracks[0].id,
    bellMp3Url:
      typeof raw.bellMp3Url === 'string' && !raw.bellMp3Url.startsWith('blob:')
        ? raw.bellMp3Url
        : null,
    woodenFishMp3Url:
      typeof raw.woodenFishMp3Url === 'string' && !raw.woodenFishMp3Url.startsWith('blob:')
        ? raw.woodenFishMp3Url
        : null,
    welcomeTtsTemplates: welcomeTemplates,
    giftTtsTemplates: giftTemplates,
    prayerTtsTemplates: prayerTemplates,
    maxStageCapacity:
      typeof raw.maxStageCapacity === 'number' && raw.maxStageCapacity >= 1
        ? raw.maxStageCapacity
        : DEFAULT_CONFIG.maxStageCapacity,
    maxFlyingLotuses:
      typeof raw.maxFlyingLotuses === 'number' && raw.maxFlyingLotuses >= 0
        ? raw.maxFlyingLotuses
        : DEFAULT_CONFIG.maxFlyingLotuses,
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
    return sanitizeCustomAssets(parsed);
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
  void idbSet(key, list);
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
  const [donors, setDonors] = useState<DonorEntry[]>(() => loadDonorsFromStorage());
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
  const [eventTtsQueue, setEventTtsQueue] = useState<EventTtsQueueSnapshot>(() =>
    soundEngine.getEventQueueSnapshot()
  );
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

  // Khôi phục dữ liệu dung lượng lớn (Hình nền, Spritesheet Sư Trụ Trì / Chú Tiểu / Phật Tử, File Nhạc MP3, Kho Avatar NPC) từ IndexedDB khi F5
  useEffect(() => {
    let mounted = true;
    idbGet<Partial<CustomAssetsConfig>>(TEMPLE_CUSTOM_ASSETS_STORAGE_KEY).then(
      (savedAssets) => {
        if (!mounted || !savedAssets) return;
        setCustomAssets((prev) => sanitizeCustomAssets({ ...prev, ...savedAssets }));
      }
    );
    idbGet<Partial<GameConfig>>(TEMPLE_CONFIG_STORAGE_KEY).then((savedCfg) => {
      if (!mounted || !savedCfg) return;
      setConfig((prev) => {
        const merged = mergeGameConfigWithDefaults({ ...prev, ...savedCfg });
        configRef.current = merged;
        soundEngine.syncConfig(merged);
        return merged;
      });
    });
    idbGet<string[]>(NPC_AVATARS_STORAGE_KEY).then((savedAvatars) => {
      if (!mounted || !Array.isArray(savedAvatars) || savedAvatars.length === 0) return;
      setNpcAvatars(savedAvatars);
      npcAvatarsRef.current = savedAvatars;
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    configRef.current = config;
    soundEngine.syncConfig(config);
    const timer = setTimeout(() => {
      // Lưu đầy đủ cả file nhạc MP3 (DataURL) vào IndexedDB (bất đồng bộ, không giới hạn 5MB)
      void idbSet(TEMPLE_CONFIG_STORAGE_KEY, config);
      // Luôn lưu bản gọn (không kèm chuỗi base64 MP3 nặng hàng chục MB) vào localStorage để không bao giờ gây đơ luồng chính
      try {
        const liteConfig: GameConfig = {
          ...config,
          bgmTracks: config.bgmTracks.filter(
            (t) => !t.url || !t.url.startsWith('data:')
          ),
          bellMp3Url:
            config.bellMp3Url && config.bellMp3Url.startsWith('data:')
              ? null
              : config.bellMp3Url,
          woodenFishMp3Url:
            config.woodenFishMp3Url && config.woodenFishMp3Url.startsWith('data:')
              ? null
              : config.woodenFishMp3Url,
        };
        localStorage.setItem(TEMPLE_CONFIG_STORAGE_KEY, JSON.stringify(liteConfig));
      } catch {
        // ignore quota error
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [config]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          TEMPLE_VIP_SLOTS_STORAGE_KEY,
          JSON.stringify(vipSlots.map((s) => ({ id: s.id, x: s.x, y: s.y, side: s.side })))
        );
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [vipSlots]);

  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 250);
    return () => clearTimeout(timer);
  }, [normalSlots]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Lưu đầy đủ toàn bộ ảnh nền, Sư Trụ Trì, Chú Tiểu Lớn/Nhỏ, Phật Tử vào IndexedDB để F5 không bao giờ bị mất
      void idbSet(TEMPLE_CUSTOM_ASSETS_STORAGE_KEY, customAssets);
      try {
        const liteAssets: Partial<CustomAssetsConfig> = {};
        (Object.keys(customAssets) as Array<keyof CustomAssetsConfig>).forEach((k) => {
          const val = customAssets[k];
          if (!val || !val.startsWith('data:') || val.length < 180000) {
            liteAssets[k] = val;
          }
        });
        localStorage.setItem(TEMPLE_CUSTOM_ASSETS_STORAGE_KEY, JSON.stringify(liteAssets));
      } catch {
        // ignore localStorage 5MB quota error (IndexedDB already saved the full customAssets)
      }
    }, 250);
    return () => clearTimeout(timer);
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
    const unsubEventQueue = soundEngine.subscribeEventQueue((snap) => {
      setEventTtsQueue(snap);
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
      unsubEventQueue();
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

  const activateGrandEventCelebration = useCallback(() => {
    const until = Date.now() + 10000;
    setGoldenLotusRainUntil(until);
    pushFloatingToast('🔔 ĐẠI LỄ VIÊN MÃN! Mưa Hoa Sen Vàng 10s!', true);
  }, [pushFloatingToast]);

  const addGrandEventLotus = useCallback(
    (amount: number) => {
      const target = Math.max(1, configRef.current.grandEventTarget || 1000);
      const nextTotal = grandEventProgressRef.current + Math.max(1, amount);
      // Kích hoạt nháy viền hồng 1 cái trên thanh đếm ngay thời điểm bông sen chạm thẻ Sự kiện Đại lễ
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

  const spawnFlyingLotusToEventBoard = useCallback(
    (startX: number, startY: number, lotusAmount = 0) => {
      const cfg = configRef.current;
      const maxFly = Math.max(0, cfg.maxFlyingLotuses ?? 5);

      if (maxFly <= 0) {
        // Khi giới hạn hoa bay = 0 (Tắt hoa bay): vẫn cộng điểm sau 0.3s nhưng không vẽ hoa bay lên màn hình
        if (lotusAmount > 0) {
          setTimeout(() => {
            addGrandEventLotus(lotusAmount);
          }, 300);
        }
        return;
      }

      const targetX = cfg.hudLayout.grandEventBox.x + 24;
      const targetY = cfg.hudLayout.grandEventBox.y + 30;
      const id = `fly-lotus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      setFlyingLotuses((prev) => {
        if (prev.length >= maxFly) return prev; // Giới hạn số hoa sen bay hiển thị cùng lúc
        return [
          ...prev,
          { id, startX, startY, targetX, targetY, createdAt: Date.now() },
        ];
      });

      // Khi bông hoa sen bay từ chậm rồi tăng tốc chạm vào thẻ Sự kiện Đại lễ (~1.62s) thì mới cộng điểm & highlight thanh đếm
      setTimeout(() => {
        setFlyingLotuses((prev) => prev.filter((f) => f.id !== id));
        if (lotusAmount > 0) {
          addGrandEventLotus(lotusAmount);
        }
      }, 1620);
    },
    [addGrandEventLotus]
  );

  const triggerHeadLotusBurst = useCallback(
    (username?: string, burstCount = 1, lotusAmount = 0) => {
      const list = pilgrimsRef.current;
      const now = Date.now();
      const maxFly = Math.max(0, configRef.current.maxFlyingLotuses ?? 5);

      if (maxFly <= 0) {
        spawnFlyingLotusToEventBoard(270, 760, lotusAmount);
        return;
      }

      if (list.length === 0) {
        // Nếu chưa có nhân vật nào trên sân thì vẫn cho 1 hoa sen vừa bay từ thảm đỏ về bảng Đại lễ
        spawnFlyingLotusToEventBoard(270, 760, lotusAmount);
        return;
      }

      const activeBursts = list.filter(
        (p) => p.lotusBurstUntil && p.lotusBurstUntil > now
      ).length;
      if (activeBursts >= maxFly) {
        const fallback = list[Math.floor(Math.random() * list.length)];
        spawnFlyingLotusToEventBoard(fallback.x, fallback.y - 36, lotusAmount);
        return;
      }

      const maxNew = Math.min(burstCount, maxFly - activeBursts);
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
          // Bông hoa bay lên trên đầu nhân vật (~2.1s)
          p.lotusBurstUntil = now + 2150;
          p.lotusBurstKey = now + Math.random();
          // Bông hoa sen bay từ nhân vật (từ chậm rồi nhanh dần) về chạm vào bảng Sự kiện đại lễ mới highlight thanh đếm
          if (idx === 0) {
            spawnFlyingLotusToEventBoard(p.x, p.y - 36, lotusAmount);
          }
        });
        setPilgrims([...list]);
      } else {
        const fallback = list[Math.floor(Math.random() * list.length)];
        spawnFlyingLotusToEventBoard(fallback.x, fallback.y - 36, lotusAmount);
      }
    },
    [spawnFlyingLotusToEventBoard]
  );

  const addDonorCoins = useCallback((username: string, coins: number) => {
    const cleanName = (username || '').trim();
    const added = Math.max(0, Number(coins) || 0);
    if (!cleanName || added <= 0) return;
    const lower = cleanName.toLowerCase();

    setDonors((prev) => {
      const existing = prev.find((d) => d.username.trim().toLowerCase() === lower);
      const next = existing
        ? prev.map((d) =>
            d.username.trim().toLowerCase() === lower
              ? { ...d, username: cleanName, coins: d.coins + added }
              : d
          )
        : [...prev, { username: cleanName, coins: added }];
      try {
        localStorage.setItem(TEMPLE_DONORS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  }, []);

  const handleClearDonors = useCallback(() => {
    setDonors([]);
    try {
      localStorage.removeItem(TEMPLE_DONORS_STORAGE_KEY);
    } catch {
      // ignore
    }
    syncService.sendCommand('CLEAR_DONORS', {});
    pushFloatingToast('🧹 Đã làm mới Bảng Công Đức!', false);
  }, [pushFloatingToast]);

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

      const isGiftOffering = req.isVip || req.coins > 0;
      const cleanPrayer = isGiftOffering ? '' : (req.prayer || '').trim();
      const shouldShowBubble =
        !isGiftOffering && !instantKneel && Boolean(cleanPrayer);

      return {
        id,
        username: req.username,
        prayer: cleanPrayer,
        gender: inferPilgrimGender(req.username, id),
        isVip: isGiftOffering,
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
        speed: isGiftOffering ? 122 : 104 + Math.random() * 18,
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
        chatBubbleUntil: shouldShowBubble ? Date.now() + bubbleDurMs : 0,
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

        // Gộp giọng đọc TTS thông minh theo Quy tắc đọc sự kiện (trích ngẫu nhiên mẫu câu từ danh sách mục 2 & 3):
        let ttsTimer: ReturnType<typeof setTimeout> | null = null;
        if (filterRes.allowTTS) {
          const debounceMs = addedCount >= 10 ? 220 : 750;
          ttsTimer = setTimeout(() => {
            const latestCfg = configRef.current;
            const speechParts: string[] = [];

            if (latestCfg.realGiftTtsEnabled) {
              const tpl = pickRandomTemplate(
                latestCfg.giftTtsTemplates,
                latestCfg.realGiftTtsTemplate ||
                  'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe'
              );
              speechParts.push(
                soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
              );
            }
            if (latestCfg.realPrayerTtsEnabled && finalPrayer) {
              const tpl = pickRandomTemplate(
                latestCfg.prayerTtsTemplates,
                latestCfg.realPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]'
              );
              speechParts.push(
                soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
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
        if (cfg.hudLayout.showNewPilgrimToast !== false) {
          pushFloatingToast(`${finalUsername} vào chùa cầu an`, false);
        }
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
            const tpl = pickRandomTemplate(
              cfg.welcomeTtsTemplates,
              cfg.realWelcomeTtsTemplate || 'Chào mừng [Tên] đến kim thiền tự'
            );
            speechParts.push(
              soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
            );
          }
          if (cfg.realPrayerTtsEnabled && finalPrayer) {
            const tpl = pickRandomTemplate(
              cfg.prayerTtsTemplates,
              cfg.realPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]'
            );
            speechParts.push(
              soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
            );
          }

          if (speechParts.length > 0) {
            soundEngine.enqueueTTS(speechParts.join('. '), false, cfg);
          }
        }
      } else {
        // Sự kiện "NPC" (Dùng chung kho mẫu câu ngẫu nhiên của Mục 1, 2, 3 khi tích chọn NPC)
        if (!soundEngine.getBusyState() && nowSec - lastBotTtsSecRef.current > 6) {
          const npcSpeechParts: string[] = [];
          if (isVip || coins > 0) {
            if (cfg.npcGiftTtsEnabled) {
              const tpl = pickRandomTemplate(
                cfg.giftTtsTemplates,
                cfg.npcGiftTtsTemplate ||
                  'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe'
              );
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
              );
            }
            if (cfg.npcPrayerTtsEnabled && finalPrayer) {
              const tpl = pickRandomTemplate(
                cfg.prayerTtsTemplates,
                cfg.npcPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]'
              );
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
              );
            }
          } else {
            if (cfg.npcWelcomeTtsEnabled) {
              const tpl = pickRandomTemplate(
                cfg.welcomeTtsTemplates,
                cfg.npcWelcomeTtsTemplate || 'Chào mừng [Tên] đến kim thiền tự'
              );
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
              );
            }
            if (cfg.npcPrayerTtsEnabled && finalPrayer) {
              const tpl = pickRandomTemplate(
                cfg.prayerTtsTemplates,
                cfg.npcPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]'
              );
              npcSpeechParts.push(
                soundEngine.formatEventTemplate(tpl, finalUsername, finalPrayer)
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

      // Nếu nhân vật của người chơi đang trên đường rời phòng (leave_side_to_aisle / leave_down_exit)
      // mà người chơi lại comment mới hoặc dâng lễ -> thu hồi bóng đang rời đi để cho người chơi bước vào lại phòng cùng comment mới
      if (!isBot) {
        let removedLeaving = false;
        pilgrimsRef.current.forEach((p) => {
          if (
            !p.isBot &&
            p.username.trim().toLowerCase() === lowerName &&
            (p.state === 'leave_side_to_aisle' || p.state === 'leave_down_exit')
          ) {
            releaseSlotById(p.slotId);
            removedLeaving = true;
          }
        });
        if (removedLeaving) {
          pilgrimsRef.current = pilgrimsRef.current.filter(
            (p) =>
              !(
                !p.isBot &&
                p.username.trim().toLowerCase() === lowerName &&
                (p.state === 'leave_side_to_aisle' || p.state === 'leave_down_exit')
              )
          );
        }
      }

      // Nếu người gửi quà dâng lễ đang nằm trong hàng chờ (khi phòng đầy) -> đẩy ngay lên hàng chờ ưu tiên & cộng dồn combo
      const inQueueIdx = queueRef.current.findIndex(
        (qItem) => qItem.username.trim().toLowerCase() === lowerName
      );
      if (inQueueIdx !== -1 && (isVip || effectiveCoins > 0)) {
        enqueueWithPriority({
          username: finalUsername,
          prayer: '',
          isVip: true,
          coins: Math.max(effectiveCoins, 1),
          avatarUrl: resolvedAvatar,
          comboCount: effectiveComboCount,
          giftName: effectiveGiftName,
          isBot: false,
        });
        return;
      }

      // Nếu có NPC trùng tên với Người thật vừa tương tác -> Cho NPC đó rời đi để tránh lấy nhầm avatar NPC
      if (!isBot) {
        const sameNameBot = pilgrimsRef.current.find(
          (p) =>
            p.isBot &&
            p.username.trim().toLowerCase() === lowerName &&
            p.state !== 'leave_side_to_aisle' &&
            p.state !== 'leave_down_exit'
        );
        if (sameNameBot) {
          startPilgrimLeaving(sameNameBot);
        }
      }

      // Nếu người chơi đang ở sẵn trên sân chùa và gửi quà Dâng Lễ -> Nâng cấp ngay thành VIP + Cộng dồn Combo mượt mà (Khi dâng lễ không hiện bong bóng chat)
      if (isVip || effectiveCoins > 0) {
        const existingOnStage = pilgrimsRef.current.find(
          (p) =>
            p.isBot === isBot &&
            p.username.trim().toLowerCase() === lowerName &&
            p.state !== 'leave_side_to_aisle' &&
            p.state !== 'leave_down_exit'
        );
        if (existingOnStage) {
          const isAlreadyAtOrWalkingToBurner =
            existingOnStage.state === 'walk_in_up' ||
            existingOnStage.state === 'throw_offering_at_burner' ||
            existingOnStage.state === 'ceremony_at_burner';

          existingOnStage.isVip = true;
          existingOnStage.isBot = false;
          existingOnStage.coins = Math.max(existingOnStage.coins, effectiveCoins, 1);
          existingOnStage.offeringType = offeringType;
          existingOnStage.comboCount = effectiveComboCount;
          existingOnStage.giftName = effectiveGiftName;
          existingOnStage.comboPopKey = nowMs + Math.random();
          if (resolvedAvatar) existingOnStage.avatarUrl = resolvedAvatar;
          existingOnStage.hasGoldenAura =
            Boolean(existingOnStage.hasGoldenAura) || effectiveCoins >= 10;
          // Khi dâng lễ: tắt bong bóng chat để chỉ hiển thị lễ vật dâng lên và huy hiệu combo
          existingOnStage.chatBubbleUntil = 0;
          existingOnStage.speed = 122;

          if (isAlreadyAtOrWalkingToBurner) {
            if (existingOnStage.state === 'ceremony_at_burner') {
              // Nếu đang đứng ngay trước lư hương thắp nhang mà dâng tiếp quà -> thực hiện động tác ném lễ vật vào lư hương
              existingOnStage.state = 'throw_offering_at_burner';
              existingOnStage.stateTimer = 0.55;
            }
          } else {
            // Bắt buộc phải rời khỏi chỗ ngồi / đường đi hiện tại để di chuyển ra thảm đỏ và đi đến trước lư hương mới được dâng lễ
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

      // Kiểm tra sức chứa sân chùa (Số Phật tử cho phép vào sân)
      const maxStageCapacity = Math.max(1, cfg.maxStageCapacity || 36);
      const activeStageCount = pilgrimsRef.current.filter(
        (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
      ).length;

      // Xử lý cho Khách Dâng Lễ (isVip || effectiveCoins > 0) — Khi dâng lễ không cần hiện bong bóng chat
      if (isVip || effectiveCoins > 0) {
        if (activeStageCount >= maxStageCapacity && !isBot) {
          const botToYield =
            pilgrimsRef.current.find(
              (p) => p.isBot && p.state === 'pray_seated' && p.isVip
            ) ||
            pilgrimsRef.current.find((p) => p.isBot && p.state === 'pray_seated') ||
            pilgrimsRef.current.find(
              (p) =>
                p.isBot &&
                p.state !== 'leave_side_to_aisle' &&
                p.state !== 'leave_down_exit'
            );
          if (botToYield) {
            startPilgrimLeaving(botToYield);
          } else {
            enqueueWithPriority({
              username: finalUsername,
              prayer: '',
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
            prayer: '',
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

      // Nếu người chơi đang nằm trong hàng chờ mà lại comment mới -> rút khỏi hàng chờ để cập nhật hoặc cho vào sân ngay
      if (!isBot && inQueueIdx !== -1) {
        queueRef.current.splice(inQueueIdx, 1);
        setQueueCount(queueRef.current.length);
      }

      // Nếu người chơi đang ở sẵn trên sân (dù đang ngồi chiếu thường hay ghế VIP) -> đồng bộ ngay comment mới lên bong bóng chat & gia hạn thời gian ngồi
      const existingNormal = pilgrimsRef.current.find(
        (p) =>
          p.isBot === isBot &&
          p.username.trim().toLowerCase() === lowerName &&
          p.state !== 'leave_side_to_aisle' &&
          p.state !== 'leave_down_exit'
      );
      if (existingNormal && !isBot) {
        existingNormal.prayer = finalPrayer;
        if (resolvedAvatar) existingNormal.avatarUrl = resolvedAvatar;
        existingNormal.chatBubbleUntil =
          Date.now() + Math.max(2, cfg.chatBubbleDurationSec || 12) * 1000;
        const freshDur = Math.max(3, cfg.prayDurationSec);
        existingNormal.prayTimer = freshDur;
        existingNormal.totalPrayDuration = freshDur;
        setPilgrims([...pilgrimsRef.current]);
        return;
      }

      // Nếu nhân vật người chơi đã rời phòng (hoặc người chơi mới comment) -> cho người chơi vào lại phòng cùng comment mới vừa thêm
      if (activeStageCount >= maxStageCapacity) {
        if (isBot) return;
        const botToYieldForCap =
          pilgrimsRef.current.find(
            (p) => p.isBot && !p.isVip && p.state === 'pray_seated'
          ) ||
          pilgrimsRef.current.find((p) => p.isBot && p.state === 'pray_seated') ||
          pilgrimsRef.current.find(
            (p) =>
              p.isBot &&
              p.state !== 'leave_side_to_aisle' &&
              p.state !== 'leave_down_exit'
          );
        if (botToYieldForCap) {
          startPilgrimLeaving(botToYieldForCap);
        } else {
          enqueueWithPriority({
            username: finalUsername,
            prayer: finalPrayer,
            isVip: false,
            coins: 0,
            avatarUrl: resolvedAvatar,
            isBot: false,
          });
          return;
        }
      }

      // Xử lý cho Khách Thường (Mới vào live / Bình luận ước nguyện / Vào lại phòng sau khi rời đi / NPC giữ nhiệt)
      let freeNormalSlots = normalSlotsRef.current.filter(
        (s) => s.occupiedById === null
      );

      if (freeNormalSlots.length === 0 && !isBot) {
        const botToYield =
          pilgrimsRef.current.find(
            (p) => p.isBot && !p.isVip && p.state === 'pray_seated' && p.slotId
          ) ||
          pilgrimsRef.current.find(
            (p) =>
              p.isBot &&
              !p.isVip &&
              p.slotId &&
              p.state !== 'leave_side_to_aisle' &&
              p.state !== 'leave_down_exit'
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
      } else if (normalSlotsRef.current.length > 0) {
        // Khi số người trong phòng cao hơn số chiếu trống hiện tại (nhưng vẫn còn sức chứa maxStageCapacity):
        // Cho phép cả Người thật và NPC bước vào sân ngồi với độ lệch nhỏ để người chơi comment luôn vào được phòng ngay
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
            isBot,
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
      if (e.shiftKey || key === 'shift') {
        pressedKeysRef.current['shift'] = true;
      } else {
        delete pressedKeysRef.current['shift'];
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        if (key.startsWith('arrow')) {
          e.preventDefault();
        }
        pressedKeysRef.current[key] = true;
      } else if (key === 'q') {
        e.preventDefault();
        handleControlledWoodenFish();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      delete pressedKeysRef.current[key];
      if (key === 'shift' || !e.shiftKey) {
        delete pressedKeysRef.current['shift'];
      }
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
    let lastReactCommitTime = 0;
    let autoSpawnTimer = 0;
    let npcPrayTimer = 0;
    let periodicBellTimer = 0;
    let periodicWoodenFishTimer = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const shouldCommitReactState = now - lastReactCommitTime >= 32;
      if (shouldCommitReactState) {
        lastReactCommitTime = now;
      }
      const cfg = configRef.current;
      const mZone = cfg.monkZone;
      const activeControl = controlledTargetRef.current;
      const keys = pressedKeysRef.current;
      const moveUp = Boolean(keys['w'] || keys['arrowup']);
      const moveDown = Boolean(keys['s'] || keys['arrowdown']);
      const moveLeft = Boolean(keys['a'] || keys['arrowleft']);
      const moveRight = Boolean(keys['d'] || keys['arrowright']);
      const isSlowWalk = Boolean(keys['shift']);

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
        const isControlledMonk = activeControl === `monk:${m.id}`;
        const animRate = isControlledMonk && !isSlowWalk ? 1.45 : 1.0;
        const copy = { ...m, animTime: m.animTime + dt * animRate };

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
          // Giữ Shift để đi chậm = đúng tốc độ đi bình thường của Sư Trụ Trì / Chú Tiểu khi không bị điều khiển (copy.speed: 38..48)
          const manualSpeed = isSlowWalk ? copy.speed : 115;
          let vx = 0;
          let vy = 0;
          if (moveLeft) vx -= 1;
          if (moveRight) vx += 1;
          if (moveUp) vy -= 1;
          if (moveDown) vy += 1;

          if (vx !== 0 || vy !== 0) {
            const len = Math.hypot(vx, vy) || 1;
            const nx = vx / len;
            const ny = vy / len;
            copy.x = Math.max(25, Math.min(515, copy.x + nx * manualSpeed * dt));
            copy.y = Math.max(430, Math.min(945, copy.y + ny * manualSpeed * dt));
            if (vx !== 0) {
              copy.facingLeft = vx < 0;
              copy.moveAxis = 'x';
              copy.targetX = copy.x + vx * 10;
              copy.targetY = copy.y;
            } else {
              copy.moveAxis = 'y';
              copy.targetX = copy.x;
              copy.targetY = copy.y + vy * 10;
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
      if (shouldCommitReactState) {
        setMonks(nextMonks);
      }

      // 2. Update Pilgrims (3-Lane Red Carpet + Offering Ceremony + VIP Row Check/Wait + Seated Bows + Manual AWSD)
      const allSlots = [...vipSlotsRef.current, ...normalSlotsRef.current];
      const nextPilgrims: PilgrimData[] = [];
      const ceremonyY = Math.max(545, cfg.incenseBurner.y + 82);
      const vipRowY =
        vipSlotsRef.current[0]?.y ??
        Math.max(490, cfg.redPrayZones.left.minY - 46);

      for (const p of pilgrimsRef.current) {
        const isControlledPilgrim = activeControl === `pilgrim:${p.id}`;
        const pilgrimAnimRate = isControlledPilgrim && isSlowWalk ? 0.85 : 1.0;
        const copy = { ...p, animTime: p.animTime + dt * pilgrimAnimRate };

        if (isControlledPilgrim) {
          if (copy.slotId) {
            releaseSlotById(copy.slotId);
            copy.slotId = null;
          }
          copy.state = 'manual_control';
          // Giữ Shift để đi chậm = tốc độ đi bình thường của Chú Tiểu & Sư Trụ Trì khi không bị điều khiển (~44 px/s)
          const manualSpeed = isSlowWalk ? 44 : 120;
          let vx = 0;
          let vy = 0;
          if (moveLeft) vx -= 1;
          if (moveRight) vx += 1;
          if (moveUp) vy -= 1;
          if (moveDown) vy += 1;

          if (vx !== 0 || vy !== 0) {
            const len = Math.hypot(vx, vy) || 1;
            const nx = vx / len;
            const ny = vy / len;
            copy.x = Math.max(25, Math.min(515, copy.x + nx * manualSpeed * dt));
            copy.y = Math.max(470, Math.min(948, copy.y + ny * manualSpeed * dt));
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
          const dy = ceremonyY - copy.y;

          // Nếu nhân vật đang ở 2 bên cánh (vừa từ chỗ ngồi bước ra để đi dâng lễ):
          // Phải đi ngang vào làn thảm đỏ chính giữa trước, sau đó đi dọc đến ngay trước lư hương rồi mới được dâng lễ
          if (Math.abs(dx) > 4) {
            copy.facingLeft = dx < 0;
            copy.x += Math.sign(dx) * Math.min(Math.abs(dx), copy.speed * dt);
          } else {
            copy.x = copy.laneX;
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
      const maxCap = Math.max(1, cfg.maxStageCapacity || 36);
      const currentActiveForQueue = nextPilgrims.filter(
        (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
      ).length;

      if (queueRef.current.length > 0 && currentActiveForQueue < maxCap) {
        for (let i = 0; i < queueRef.current.length; i++) {
          const req = queueRef.current[i];
          if (req.isVip || req.coins > 0) {
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
            const tpl = pickRandomTemplate(
              cfg.prayerTtsTemplates,
              cfg.npcPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]'
            );
            const speechLine = soundEngine.formatEventTemplate(
              tpl,
              chosenBot.username,
              nextPrayer
            );
            soundEngine.enqueueTTS(speechLine, false, cfg);
          }
        }
      }

      // 4. Duy trì chính xác số Phật tử trên sân (trong giới hạn maxStageCapacity)
      const activePilgrims = nextPilgrims.filter(
        (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
      );
      const effectiveBotTarget = Math.min(cfg.botTargetCrowd, maxCap);

      if (activePilgrims.length > maxCap) {
        const overCap = activePilgrims.length - maxCap;
        const removableBots = activePilgrims.filter(
          (p) => p.isBot && p.state === 'pray_seated'
        );
        for (let k = 0; k < Math.min(overCap, removableBots.length); k++) {
          startPilgrimLeaving(removableBots[k]);
        }
      } else if (cfg.autoCrowd && activePilgrims.length > effectiveBotTarget) {
        const excessCount = activePilgrims.length - effectiveBotTarget;
        const removableBots = activePilgrims.filter(
          (p) => p.isBot && p.state === 'pray_seated'
        );
        for (let k = 0; k < Math.min(excessCount, removableBots.length); k++) {
          startPilgrimLeaving(removableBots[k]);
        }
      }

      pilgrimsRef.current = nextPilgrims;
      if (shouldCommitReactState) {
        setPilgrims(nextPilgrims);
      }

      if (cfg.autoCrowd) {
        const currentActiveCount = pilgrimsRef.current.filter(
          (p) => p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
        ).length;

        if (currentActiveCount < effectiveBotTarget) {
          autoSpawnTimer += dt;
          const deficit = effectiveBotTarget - currentActiveCount;
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
          triggerHeadLotusBurst(
            uname,
            count >= 50 ? 4 : count >= 10 ? 2 : 1,
            count
          );
          break;
        }
        case 'TRIGGER_FOLLOW': {
          const uname = payload.username || 'Phật tử mới';
          triggerHeadLotusBurst(uname, 2, 100);
          pushFloatingToast(`🌸 ${uname} vừa Follow (+100 Hoa Sen Đại Lễ)`, true);
          break;
        }
        case 'TRIGGER_GRAND_EVENT': {
          grandEventProgressRef.current = 0;
          setGrandEventProgress(0);
          activateGrandEventCelebration();
          break;
        }
        case 'CLEAR_DONORS': {
          setDonors([]);
          try {
            localStorage.removeItem(TEMPLE_DONORS_STORAGE_KEY);
          } catch {
            // ignore
          }
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
      if (incomingAvatar && ev.username) {
        const lower = ev.username.trim().toLowerCase();
        let updatedAny = false;
        pilgrimsRef.current.forEach((p) => {
          if (!p.isBot && p.username.trim().toLowerCase() === lower && !p.avatarUrl) {
            p.avatarUrl = incomingAvatar;
            updatedAny = true;
          }
        });
        if (updatedAny) {
          setPilgrims([...pilgrimsRef.current]);
        }
      }

      if (ev.type === 'chat') {
        const commentText = (ev.comment || '').trim();
        requestSpawnPilgrim({
          username: ev.username || 'Phật tử',
          prayer: commentText || 'Nam Mô A Di Đà Phật 🙏',
          isVip: false,
          coins: 0,
          playSound: true,
          isBot: false,
          avatarUrl: incomingAvatar,
          broadcastSync: true,
        });
      } else if (ev.type === 'gift') {
        requestSpawnPilgrim({
          username: ev.username || 'Đại thí chủ',
          prayer: '',
          isVip: true,
          coins: ev.coins || 1,
          giftName: ev.giftName || 'Lễ vật',
          playSound: true,
          isBot: false,
          avatarUrl: incomingAvatar,
          broadcastSync: true,
        });
      } else if (ev.type === 'like') {
        const count = Math.max(1, Number(ev.likeCount) || 1);
        triggerHeadLotusBurst(ev.username, count >= 30 ? 3 : 1, count);
      } else if (ev.type === 'follow') {
        const uname = ev.username || 'Phật tử mới';
        triggerHeadLotusBurst(uname, 2, 100);
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
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      configRef.current = next;
      return next;
    });
    if (typeof patch.prayDurationSec === 'number') {
      const nextDur = Math.max(3, patch.prayDurationSec);
      pilgrimsRef.current = pilgrimsRef.current.map((p) => {
        if (p.state === 'pray_seated') {
          const elapsed = Math.max(
            0,
            (p.totalPrayDuration || nextDur) - p.prayTimer
          );
          const remaining = Math.max(0.5, nextDur - elapsed);
          return {
            ...p,
            totalPrayDuration: nextDur,
            prayTimer: remaining,
          };
        }
        return {
          ...p,
          totalPrayDuration: nextDur,
          prayTimer: nextDur,
        };
      });
      setPilgrims([...pilgrimsRef.current]);
    }
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

  const handleClearEventTtsQueue = useCallback(() => {
    soundEngine.clearEventQueue();
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

        const rawIncomingCfg: Partial<GameConfig> = { ...(parsed.config || {}) };
        if (Array.isArray(rawIncomingCfg.bgmTracks)) {
          rawIncomingCfg.bgmTracks = rawIncomingCfg.bgmTracks.map((t) => {
            if (t && t.url === '__KEEP_BROWSER_AUDIO_DATA__') {
              const prevTrack = configRef.current.bgmTracks.find(
                (pt) => pt.id === t.id
              );
              return { ...t, url: prevTrack?.url ?? null };
            }
            return t;
          });
        }
        if (rawIncomingCfg.bellMp3Url === '__KEEP_BROWSER_AUDIO_DATA__') {
          rawIncomingCfg.bellMp3Url = configRef.current.bellMp3Url;
        }
        if (rawIncomingCfg.woodenFishMp3Url === '__KEEP_BROWSER_AUDIO_DATA__') {
          rawIncomingCfg.woodenFishMp3Url = configRef.current.woodenFishMp3Url;
        }

        const baseConfigPatch: Partial<GameConfig> = {
          ...rawIncomingCfg,
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
      triggerHeadLotusBurst(
        username,
        count >= 50 ? 4 : count >= 10 ? 2 : 1,
        count
      );
    },
    [triggerHeadLotusBurst]
  );

  const handleTriggerFollow = useCallback(
    (username?: string) => {
      const uname = username || pickRandomNpcName();
      syncService.sendCommand('TRIGGER_FOLLOW', { username: uname });
      triggerHeadLotusBurst(uname, 2, 100);
      pushFloatingToast(`🌸 ${uname} vừa Follow (+100 Hoa Sen Đại Lễ)`, true);
    },
    [pickRandomNpcName, pushFloatingToast, triggerHeadLotusBurst]
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
    eventTtsQueue,
    wsStatus,
    peerCounts,
    safetyActionMode,
    safetyCategories,
    customWords,
    safetyLogs,
    setSafetyActionMode: handleChangeSafetyMode,
    clearSafetyLogs: useCallback(() => setSafetyLogs([]), []),
    connectWs: useCallback((url: string) => syncService.connectWebSocket(url), []),
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
    handleClearEventTtsQueue,
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
    handleClearDonors,
  };
}


