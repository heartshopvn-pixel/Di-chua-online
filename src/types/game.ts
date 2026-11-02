export type TTSEngineType = 'node_edge' | 'google_stream' | 'web_speech' | 'monk_zen';

export type SafetyActionMode = 'purify' | 'block' | 'mask';

export type OfferingGiftType = 'incense' | 'rose' | 'lotus' | 'tray' | 'special_tray';

export interface RectBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
  vipCount: number;
  vipRows?: number;
  yTop: number;
  yBottom: number;
  topWidth: number;
  bottomWidth: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface HudBoxPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BgmTrackItem {
  id: string;
  title: string;
  url: string | null;
  presetType?: 'zen_bowl' | 'lotus_flute';
}

export interface DharmaArticleItem {
  id: string;
  title: string;
  content: string;
}

export interface GuideTaskItem {
  id: string;
  label: string;
  shortDesc: string;
  modelType?: OfferingGiftType | 'none';
  colorTheme?: 'pink' | 'amber' | 'yellow' | 'emerald' | 'stone' | 'cyan';
}

export interface HudLayoutConfig {
  templeSign: HudBoxPosition;
  leaderboardBox: HudBoxPosition;
  guideBox: HudBoxPosition;
  toastBox: HudBoxPosition;
  grandEventBox: HudBoxPosition;
  pilgrimCountBox: HudBoxPosition;
  noticeBoardBox: HudBoxPosition;
  leaderboardTitle: string;
  guideTitle: string;
  grandEventTitle: string;
  pilgrimCountTitle: string;
  noticeBoardTitle: string;
  noticeBoardContent: string;
  noticeBoardFontSize: number;
  grandEventFontSize?: number;
  leaderboardFontSize?: number;
  guideFontSize?: number;
  pilgrimCountFontSize?: number;
  toastFontSize?: number;
  showTempleSign?: boolean;
  showGrandEventBox?: boolean;
  showPilgrimCountBox?: boolean;
  showLeaderboardBox?: boolean;
  showGuideBox?: boolean;
  showNoticeBoardBox?: boolean;
  showToastBox?: boolean;
  showNewPilgrimToast?: boolean;
  leaderboardMaxRanks?: number;
  hudOpacity?: number;
  noticeBoardOpacity?: number;
  grandEventOpacity?: number;
  leaderboardOpacity?: number;
  guideOpacity?: number;
  pilgrimCountOpacity?: number;
  toastOpacity?: number;
  templeSignOpacity?: number;
  guideItems?: GuideTaskItem[];
  editLayoutMode: boolean;
}

export interface CustomAssetsConfig {
  customBgUrl: string | null;
  templeSignPngUrl: string | null;
  pilgrimFemaleSpritesheetUrl: string | null;
  pilgrimMaleSpritesheetUrl: string | null;
  abbotSpritesheetUrl: string | null;
  seniorNoviceSpritesheetUrl: string | null;
  juniorNoviceSpritesheetUrl: string | null;
  offeringIncenseUrl: string | null;
  offeringRoseUrl: string | null;
  offeringLotusUrl: string | null;
  offeringTrayUrl: string | null;
}

export interface GameConfig {
  ttsEnabled: boolean;
  ttsVipOnly: boolean;
  ttsEngine: TTSEngineType;
  nodeVoice: string;
  nodeTtsEndpoint: string;
  selectedSystemVoiceURI: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsTemplate: string;

  // Nhạc nền, Chuông & Mõ
  bgmEnabled: boolean;
  bgmVolume: number;
  bgmTracks: BgmTrackItem[];
  activeBgmTrackId: string;

  bellEnabled: boolean;
  bellMp3Url: string | null;
  bellMp3Title: string;
  bellIntervalSec: number;

  woodenFishEnabled: boolean;
  woodenFishMp3Url: string | null;
  woodenFishMp3Title: string;
  woodenFishIntervalSec: number;

  // Chế độ kể chuyện / thuyết pháp (Đọc lặp lại hoặc tự động next sang bài kế tiếp)
  dharmaEnabled: boolean;
  dharmaAutoNext: boolean;
  dharmaArticles: DharmaArticleItem[];
  activeDharmaId: string;

  // Chế độ đọc sự kiện gộp chung Người thật & NPC (Mỗi mục 1, 2, 3 tích chọn đối tượng & kho mẫu câu ngẫu nhiên)
  realWelcomeTtsEnabled: boolean;
  realWelcomeTtsTemplate: string;
  npcWelcomeTtsEnabled: boolean;
  npcWelcomeTtsTemplate: string;
  welcomeTtsTemplates: string[];

  realGiftTtsEnabled: boolean;
  realGiftTtsTemplate: string;
  npcGiftTtsEnabled: boolean;
  npcGiftTtsTemplate: string;
  giftTtsTemplates: string[];

  realPrayerTtsEnabled: boolean;
  realPrayerTtsTemplate: string;
  npcPrayerTtsEnabled: boolean;
  npcPrayerTtsTemplate: string;
  prayerTtsTemplates: string[];

  // Chế độ Trụ trì bong bóng chat (Live text trong bong bóng chat cùng với việc đọc)
  abbotBubbleEnabled: boolean;

  showWaypoints: boolean;
  showZoneBounds: boolean;
  maxStageCapacity: number;
  autoCrowd: boolean;
  botTargetCrowd: number;
  botVipPercent: number;
  botSpeakTTS: boolean;
  npcSpawnIntervalSec: number;
  npcPrayIntervalSec: number;
  prayDurationSec: number;
  vipPrayDurationSec: number;
  normalPrayDurationSec: number;

  // Cấu hình Camera thông minh (Theo dõi comment, Chế độ đẩy lễ vật & Zoom mượt)
  cameraFollowCommentEnabled: boolean;
  cameraFollowRealUser: boolean;
  cameraFollowNpc: boolean;
  cameraHoldDurationSec: number;
  cameraPushOnGiftEnabled: boolean;
  cameraSpecialGiftLockSec: number;
  cameraZoomScale: number;
  cameraSmoothSpeed: number;
  cameraFocusOffsetX: number;
  cameraFocusOffsetY: number;

  characterScale: number;
  nameTagFontFamily: string;
  nameTagScale: number;
  chatBubbleFontFamily: string;
  chatBubbleScale: number;
  chatBubbleDurationSec: number;
  grandEventTarget: number;
  maxFlyingLotuses: number;
  spawnPoint: Point2D;
  exitPoint: Point2D;
  incenseBurner: Point2D;
  offeringTrayPos: Point2D;
  monkZone: RectBounds;
  redPrayZones: {
    left: RectBounds;
    right: RectBounds;
  };
  grid: GridConfig;
  hudLayout: HudLayoutConfig;
}

export interface KneelSlot {
  id: string;
  x: number;
  y: number;
  side: 'left' | 'right';
  row?: number;
  col?: number;
  isVip: boolean;
  occupiedById: number | null;
}

/**
 * Orthogonal 2D States for Pilgrims:
 * - walk_in_up: Đi thẳng dọc 1 trong 3 làn thảm đỏ từ cửa lên trước lư hương (Khách thường: frame 2,3; Khách dâng lễ: frame 7 đội lễ vật)
 * - throw_offering_at_burner: Khách dâng lễ ném model lễ vật từ tay vào lư hương -> tan biến + bung tỏa hoa sen hồng nhỏ
 * - ceremony_at_burner: Đứng thắp nhang trước lư hương (frame 4: 1s cho khách dâng lễ, ~1.2s cho khách thường)
 * - walk_to_vip_check: Khách dâng lễ đi từ lư hương xuống ngang hàng ghế VIP
 * - wait_for_vip_slot: Khách dâng lễ đứng chờ ở hàng ghế VIP khi chưa có slot VIP trống, có slot trống thì vào ngay
 * - walk_side_to_slot: Đi ngang sang trái/phải vào cột chỗ ngồi (Mặt bên: frame 8, 9)
 * - walk_vert_to_slot: Đi dọc xuống/lên đúng đệm ngồi (Mặt trước 0,1 hoặc Mặt lưng 2,3)
 * - pray_seated: Bắt đầu bái vài cái (frame 6) xong ngồi yên chắp tay (frame 5) hết thời gian ngồi (tối thiểu 3s)
 * - leave_side_to_aisle: Đi ngang ra 1 trong 3 làn thảm đỏ (Mặt bên: frame 8, 9)
 * - leave_down_exit: Đi dọc theo làn thảm đỏ xuống cửa ra về (Mặt trước: frame 0, 1)
 * - manual_control: Đang được người dùng điều khiển trực tiếp bằng phím AWSD / Q
 */
export type PilgrimState =
  | 'walk_in_up'
  | 'throw_offering_at_burner'
  | 'ceremony_at_burner'
  | 'walk_to_vip_check'
  | 'wait_for_vip_slot'
  | 'walk_carpet_to_slot_y'
  | 'walk_side_to_slot'
  | 'walk_vert_to_slot'
  | 'pray_seated'
  | 'leave_side_to_aisle'
  | 'leave_down_exit'
  | 'manual_control';

/**
 * Pilgrim Spritesheet Frame Index (0 -> 9):
 * 0: mặt trước - đi - bước chân trái
 * 1: mặt trước - đi - bước chân phải
 * 2: mặt lưng - đi - bước chân trái
 * 3: mặt lưng - đi - bước chân phải
 * 4: mặt lưng - đứng - thắp nhang
 * 5: mặt lưng - ngồi - chắp tay
 * 6: mặt lưng - quỳ lạy
 * 7: mặt lưng - dâng đồ cúng (2 tay vươn lên đỡ vật nặng)
 * 8: mặt bên - bước chân trái
 * 9: mặt bên - bước chân phải
 */
export type PilgrimFrameIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface PilgrimData {
  id: number;
  username: string;
  prayer: string;
  gender: 'female' | 'male';
  isVip: boolean;
  isBot: boolean;
  coins: number;
  offeringType: OfferingGiftType;
  slotId: string | null;
  x: number;
  y: number;
  laneX: number;
  slotX: number;
  slotY: number;
  speed: number;
  state: PilgrimState;
  stateTimer: number;
  prayTimer: number;
  totalPrayDuration: number;
  animTime: number;
  facingLeft: boolean;
  avatarColor: string;
  avatarUrl?: string | null;
  hairSeed: number;
  hasGoldenAura?: boolean;
  isCarryingGift?: boolean;
  hasComment?: boolean;
  comboCount?: number;
  giftName?: string;
  comboPopKey?: number;
  lotusBurstUntil?: number;
  lotusBurstKey?: number;
  chatBubbleUntil?: number;
  manualMoveDir?: 'up' | 'down' | 'left' | 'right' | 'idle' | 'wooden_fish';
  woodenFishRippleUntil?: number;
  hasSatOnce?: boolean;
}

export interface BurnerLotusBurstFX {
  id: string;
  x: number;
  y: number;
  createdAt: number;
}

export interface FlyingLotusFX {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  createdAt: number;
}

export type CameraFocusReason = 'comment' | 'gift' | 'special_gift' | 'manual';

export interface CameraQueueItem {
  id: string;
  pilgrimId: number;
  username: string;
  reason: CameraFocusReason;
  isBot: boolean;
  holdSec: number;
  lockSec: number;
  addedAt: number;
}

export interface CameraFocusState {
  pilgrimId: number | null;
  username?: string;
  reason?: CameraFocusReason;
  isBot?: boolean;
  startedAt?: number;
  until: number;
  lockedUntil?: number;
}

/**
 * Monk (Trụ trì, Chú tiểu lớn, Chú tiểu nhỏ) Spritesheet Frame Index (0 -> 7):
 * 0: mặt trước - đi - bước chân trái
 * 1: mặt trước - đi - bước chân phải
 * 2: mặt lưng - đi - bước chân trái
 * 3: mặt lưng - đi - bước chân phải
 * 4: mặt bên - bước chân trái - tay chắp trước ngực
 * 5: mặt bên - bước chân phải - tay chắp trước ngực
 * 6: mặt bên - ngồi gõ mõ - tay vung mõ
 * 7: mặt bên - ngồi gõ mõ - tay gõ dùi vào mõ
 */
export type MonkFrameIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type MonkRole = 'abbot' | 'senior_novice' | 'junior_novice';

export interface TempleMonkData {
  id: string;
  role: MonkRole;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  moveAxis: 'x' | 'y' | 'idle' | 'chant_wooden_fish';
  facingLeft: boolean;
  pauseTimer: number;
  animTime: number;
  speed: number;
  chatText?: string;
  chatBubbleUntil?: number;
  woodenFishRippleUntil?: number;
}

export type ControlledTargetId =
  | null
  | `monk:${string}`
  | `pilgrim:${number}`;

export interface FloatingToastItem {
  id: string;
  text: string;
  isVip: boolean;
  createdAt: number;
  replaceKey?: string;
}

export interface QueuedPilgrimRequest {
  username: string;
  prayer: string;
  isVip: boolean;
  coins: number;
  isBot: boolean;
  avatarUrl?: string | null;
  comboCount?: number;
  giftName?: string;
}

export interface SafetyCategory {
  key: string;
  name: string;
  enabled: boolean;
  words: string[];
}

export interface SafetyLogEntry {
  id: string;
  time: string;
  user: string;
  detail: string;
}

export interface DonorEntry {
  username: string;
  coins: number;
}

export type DevTabId =
  | 'control'
  | 'camera'
  | 'audio'
  | 'npc'
  | 'safety'
  | 'map'
  | 'tiktok';

export interface StudioBackupData {
  version?: number;
  exportedAt?: string;
  config?: Partial<GameConfig>;
  incenseBurner?: Point2D;
  offeringTrayPos?: Point2D;
  monkZone?: RectBounds;
  redPrayZones?: { left: RectBounds; right: RectBounds };
  hudLayout?: Partial<HudLayoutConfig>;
  grid?: Partial<GridConfig>;
  vipSlots?: Array<{ id: string; x: number; y: number; side?: 'left' | 'right' }>;
  normalSlots?: Array<{
    id: string;
    x: number;
    y: number;
    side?: 'left' | 'right';
    row?: number;
    col?: number;
  }>;
  npcNames?: string[];
  npcPrayers?: string[];
  npcAvatars?: string[];
  customAssets?: Partial<CustomAssetsConfig>;
  safetyActionMode?: SafetyActionMode;
  safetyCategories?: SafetyCategory[];
  customWords?: string[];
}

export interface SyncPacket {
  type: 'ADMIN_SYNC';
  action:
    | 'SPAWN_PILGRIM'
    | 'SPAWN_BATCH'
    | 'LEAVE_ALL'
    | 'PLAY_BELL'
    | 'PLAY_WOODEN_FISH'
    | 'PANIC_MUTE'
    | 'TEST_TTS'
    | 'UPDATE_CONFIG'
    | 'UPDATE_GRID'
    | 'UPDATE_WAYPOINT'
    | 'UPDATE_WAYPOINTS_BATCH'
    | 'UPDATE_SAFETY'
    | 'UPDATE_HUD_LAYOUT'
    | 'UPDATE_ZONES'
    | 'UPDATE_NPC_LISTS'
    | 'CAMERA_CMD'
    | 'TRIGGER_LIKE'
    | 'TRIGGER_FOLLOW'
    | 'TRIGGER_GRAND_EVENT'
    | 'ENTITY_CHAT'
    | 'CONTROL_STATE'
    | 'NPC_PRAY_EVENT'
    | 'NEXT_DHARMA'
    | 'CLEAR_TTS_QUEUE'
    | 'CLEAR_DONORS'
    | 'UPDATE_CUSTOM_ASSETS'
    | 'REQUEST_FULL_SYNC'
    | 'RESTORE_BACKUP';
  payload: Record<string, any>;
  ts: number;
}

