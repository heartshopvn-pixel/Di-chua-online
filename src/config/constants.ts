import {
  BgmTrackItem,
  CustomAssetsConfig,
  DharmaArticleItem,
  DonorEntry,
  GameConfig,
  KneelSlot,
  TempleMonkData,
} from '../types/game';

export const DEFAULT_BG_IMAGE =
  './assets/aistudio/Grand_Buddhist_Temple_with_Towering_Golden_Halo_06591c77.png';

export const DEFAULT_SPRITESHEETS: CustomAssetsConfig = {
  customBgUrl: null,
  templeSignPngUrl: null,
  pilgrimFemaleSpritesheetUrl: './assets/aistudio/baked/pilgrim_female_strip.png',
  pilgrimMaleSpritesheetUrl: './assets/aistudio/baked/pilgrim_male_strip.png',
  abbotSpritesheetUrl: './assets/aistudio/baked/abbot_strip.png',
  seniorNoviceSpritesheetUrl: './assets/aistudio/baked/senior_novice_strip.png',
  juniorNoviceSpritesheetUrl: './assets/aistudio/baked/junior_novice_strip.png',
  offeringIncenseUrl: null,
  offeringRoseUrl: null,
  offeringLotusUrl: null,
  offeringTrayUrl: null,
};

/**
 * Khu vực màu tím hồng dành cho Trụ trì & người trong chùa di chuyển:
 * y từ 472 đến 565, x từ 50 đến 490
 */
export const MONK_ZONE_BOUNDS = {
  minX: 55,
  maxX: 485,
  minY: 480,
  maxY: 562,
};

/**
 * 2 Khu vực màu đỏ hai bên thảm để người dân tập trung ngồi bái lạy:
 * - Bên trái thảm đỏ: x từ 30 đến 220, y từ 645 đến 925
 * - Bên phải thảm đỏ: x từ 320 đến 510, y từ 645 đến 925
 */
export const RED_PRAY_ZONES = {
  left: { minX: 30, maxX: 220, minY: 645, maxY: 925 },
  right: { minX: 320, maxX: 510, minY: 645, maxY: 925 },
};

export const INITIAL_MONKS: TempleMonkData[] = [
  {
    id: 'monk-abbot',
    role: 'abbot',
    name: 'Sư Trụ Trì',
    x: 185,
    y: 525,
    targetX: 355,
    targetY: 525,
    moveAxis: 'x',
    facingLeft: false,
    pauseTimer: 0,
    animTime: 0,
    speed: 38,
  },
  {
    id: 'monk-senior-novice',
    role: 'senior_novice',
    name: 'Chú Tiểu Lớn',
    x: 110,
    y: 505,
    targetX: 110,
    targetY: 552,
    moveAxis: 'y',
    facingLeft: false,
    pauseTimer: 0,
    animTime: 0.4,
    speed: 44,
  },
  {
    id: 'monk-junior-novice',
    role: 'junior_novice',
    name: 'Chú Tiểu Nhỏ',
    x: 430,
    y: 545,
    targetX: 335,
    targetY: 545,
    moveAxis: 'x',
    facingLeft: true,
    pauseTimer: 0,
    animTime: 1.1,
    speed: 48,
  },
];

export const DEFAULT_BGM_TRACKS: BgmTrackItem[] = [
  {
    id: 'bgm-zen-1',
    title: 'Nhạc Thiền Chuông Ngọc Thanh Tịnh (Mặc định)',
    url: null,
    presetType: 'zen_bowl',
  },
  {
    id: 'bgm-zen-2',
    title: 'Tiếng Sáo Hoa Sen Tĩnh Tâm',
    url: null,
    presetType: 'lotus_flute',
  },
];

export const DEFAULT_DHARMA_ARTICLES: DharmaArticleItem[] = [
  {
    id: 'dharma-1',
    title: 'Bài 1: Tâm An Vạn Sự An',
    content:
      'Nam mô Bổn Sư Thích Ca Mâu Ni Phật. Giữa dòng đời vạn biến, người biết giữ tâm bình lặng trước sóng gió chính là người giàu có nhất. Khi tâm an tĩnh, trí tuệ tự khắc sáng soi, mọi phiền muộn đều hóa thành mây khói. Chúc đại chúng thân tâm thường an lạc, gia đạo thuận hòa, vạn sự cát tường.',
  },
  {
    id: 'dharma-2',
    title: 'Bài 2: Luật Nhân Quả & Lòng Biết Ơn',
    content:
      'Gieo nhân lành ắt gặt quả ngọt. Một lời nói ái ngữ, một niệm thiện lành gửi đến tha nhân đều là hạt giống phước báu vô lượng. Sống biết ơn cha mẹ, trân quý hiện tại, mở lòng từ bi với muôn loài thì đi đến đâu cũng gặp thiện duyên, bình an tự khắc tìm về.',
  },
  {
    id: 'dharma-3',
    title: 'Bài 3: Buông Bỏ Phiền Não Giữa Đời Thường',
    content:
      'Đời người ngắn ngủi như chớp mắt, hơn thua được mất rồi cũng trả lại cho thế gian. Học cách mỉm cười trước nghịch cảnh, buông bớt chấp niệm nặng nề để lòng nhẹ tựa hoa sen. Cầu nguyện cho tất cả Phật tử hiện diện nơi chánh điện Kim Thiền Tự luôn khỏe mạnh và bình an.',
  },
];

export const DEFAULT_CONFIG: GameConfig = {
  ttsEnabled: true,
  ttsVipOnly: true,
  ttsEngine: 'web_speech',
  nodeVoice: 'vi-VN-HoaiMyNeural',
  nodeTtsEndpoint: 'http://localhost:3000/tts',
  selectedSystemVoiceURI: '',
  ttsRate: 1.05,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  ttsTemplate: 'Phật tử {name} thành tâm cầu nguyện: {prayer}',

  // Nhạc nền, Chuông & Mõ
  bgmEnabled: false,
  bgmVolume: 0.4,
  bgmTracks: DEFAULT_BGM_TRACKS,
  activeBgmTrackId: 'bgm-zen-1',

  bellEnabled: true,
  bellMp3Url: null,
  bellMp3Title: 'Chuông Chùa Ngân Vang (Mặc định)',
  bellIntervalSec: 25,

  woodenFishEnabled: true,
  woodenFishMp3Url: null,
  woodenFishMp3Title: 'Tiếng Mõ Tụng Kinh (Mặc định)',
  woodenFishIntervalSec: 3,

  // Chế độ kể chuyện / thuyết pháp
  dharmaEnabled: false,
  dharmaAutoNext: true,
  dharmaArticles: DEFAULT_DHARMA_ARTICLES,
  activeDharmaId: 'dharma-1',

  // Chế độ đọc sự kiện gộp chung (Người thật & NPC dùng chung kho câu ngẫu nhiên theo mục 1, 2, 3)
  realWelcomeTtsEnabled: false,
  realWelcomeTtsTemplate: 'Chào mừng [Tên] đến kim thiền tự',
  npcWelcomeTtsEnabled: false,
  npcWelcomeTtsTemplate: 'Chào mừng [Tên] đến kim thiền tự',
  welcomeTtsTemplates: [
    'Chào mừng [Tên] đến Kim Thiền Tự lễ Phật cầu an',
    'Hoan hỷ chào đón Phật tử [Tên] về chánh điện Kim Thiền Tự',
    'Nam mô A Di Đà Phật, chào mừng [Tên] hữu duyên ghé thăm chùa',
  ],

  realGiftTtsEnabled: true,
  realGiftTtsTemplate:
    'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe',
  npcGiftTtsEnabled: false,
  npcGiftTtsTemplate:
    'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe',
  giftTtsTemplates: [
    'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe',
    'Tán thán công đức của thí chủ [Tên], chúc gia đạo vạn sự cát tường, tài lộc hanh thông',
    'Cảm ơn tấm lòng thành của [Tên], nguyện cầu mười phương Chư Phật gia hộ cho bạn luôn bình an',
  ],

  realPrayerTtsEnabled: false,
  realPrayerTtsTemplate: '[Tên] cầu nguyện: [Comment]',
  npcPrayerTtsEnabled: false,
  npcPrayerTtsTemplate: '[Tên] cầu nguyện: [Comment]',
  prayerTtsTemplates: [
    '[Tên] thành tâm cầu nguyện: [Comment]',
    'Phật tử [Tên] gửi lời ước nguyện: [Comment]',
    'Nguyện cho lời cầu của [Tên] sớm thành hiện thực: [Comment]',
  ],

  // Chế độ Trụ trì bong bóng chat (Live text trong bong bóng chat cùng với việc đọc)
  abbotBubbleEnabled: true,

  showWaypoints: false,
  showZoneBounds: false,
  maxStageCapacity: 36,
  autoCrowd: true,
  botTargetCrowd: 24,
  botVipPercent: 20,
  botSpeakTTS: false,
  npcSpawnIntervalSec: 2.5,
  npcPrayIntervalSec: 6.0,
  prayDurationSec: 22,
  characterScale: 1.0,
  nameTagFontFamily: 'Inter, system-ui, sans-serif',
  nameTagScale: 1.0,
  chatBubbleFontFamily: 'Inter, system-ui, sans-serif',
  chatBubbleScale: 1.0,
  chatBubbleDurationSec: 12,
  grandEventTarget: 1000,
  spawnPoint: { x: 270, y: 950 },
  exitPoint: { x: 270, y: 955 },
  incenseBurner: { x: 270, y: 485 },
  offeringTrayPos: { x: 270, y: 442 },
  monkZone: { ...MONK_ZONE_BOUNDS },
  redPrayZones: {
    left: { ...RED_PRAY_ZONES.left },
    right: { ...RED_PRAY_ZONES.right },
  },
  grid: {
    rows: 6,
    cols: 8,
    vipCount: 8,
    yTop: 655,
    yBottom: 905,
    topWidth: 440,
    bottomWidth: 470,
  },
  hudLayout: {
    // Hình vàng: Bảng tên chùa (PNG cắt nền, không text)
    templeSign: { x: 195, y: 78, width: 150, height: 58 },
    // Hình trắng trên: Bảng xếp hạng (Tiêu đề: Bảng công đức)
    leaderboardBox: { x: 392, y: 84, width: 136, height: 64 },
    // Hình trắng dưới: Bảng hướng dẫn (7 dòng ngắn gọn kèm model quà bên trái)
    guideBox: { x: 392, y: 154, width: 136, height: 192 },
    // Bảng Sự kiện Đại lễ (Góc trên bên trái, có thanh tích lũy + hoa sen hồng nhấp nháy)
    grandEventBox: { x: 12, y: 84, width: 168, height: 62 },
    // Bảng đếm số Phật tử: x/x (Bên trái dưới Bảng Đại Lễ)
    pilgrimCountBox: { x: 12, y: 152, width: 136, height: 32 },
    // Bảng Thông Báo cố định (Cho phép sửa nội dung, chỉnh size chữ, ẩn/hiện)
    noticeBoardBox: { x: 12, y: 190, width: 168, height: 76 },
    // Hình đen bên trái: Bảng thông báo trôi lên rồi mờ biến mất
    toastBox: { x: 12, y: 274, width: 168, height: 38 },
    leaderboardTitle: 'Bảng công đức',
    guideTitle: 'Bảng hướng dẫn',
    grandEventTitle: 'Sự kiện Đại Lễ',
    pilgrimCountTitle: 'Phật tử',
    noticeBoardTitle: 'Bảng thông báo',
    noticeBoardContent:
      'Chào mừng Phật tử thập phương về Kim Thiền Tự lễ Phật, cầu bình an & sức khỏe 🙏',
    noticeBoardFontSize: 10,
    grandEventFontSize: 10,
    leaderboardFontSize: 10,
    guideFontSize: 9,
    pilgrimCountFontSize: 10,
    toastFontSize: 10,
    showTempleSign: true,
    showGrandEventBox: true,
    showPilgrimCountBox: true,
    showLeaderboardBox: true,
    showGuideBox: true,
    showNoticeBoardBox: true,
    showToastBox: true,
    showNewPilgrimToast: true,
    leaderboardMaxRanks: 5,
    hudOpacity: 0.88,
    editLayoutMode: false,
  },
};

/**
 * 8 Vị trí hàng xanh dương phía trước (4 trái + 4 phải) dành cho khách VIP / Dâng lễ
 */
export const INITIAL_VIP_SLOTS: KneelSlot[] = [
  { id: 'vip-0', x: 48, y: 598, side: 'left', isVip: true, occupiedById: null },
  { id: 'vip-1', x: 96, y: 598, side: 'left', isVip: true, occupiedById: null },
  { id: 'vip-2', x: 146, y: 598, side: 'left', isVip: true, occupiedById: null },
  { id: 'vip-3', x: 196, y: 598, side: 'left', isVip: true, occupiedById: null },
  { id: 'vip-4', x: 344, y: 598, side: 'right', isVip: true, occupiedById: null },
  { id: 'vip-5', x: 394, y: 598, side: 'right', isVip: true, occupiedById: null },
  { id: 'vip-6', x: 444, y: 598, side: 'right', isVip: true, occupiedById: null },
  { id: 'vip-7', x: 492, y: 598, side: 'right', isVip: true, occupiedById: null },
];

export const INITIAL_DONORS: DonorEntry[] = [];

export const AVATAR_COLORS = [
  '#d97706',
  '#059669',
  '#2563eb',
  '#db2777',
  '#7c3aed',
  '#dc2626',
];

function makeSvgAvatarDataUri(bg: string, fg: string, accent: string, symbol: 'lotus' | 'female' | 'male'): string {
  const inner =
    symbol === 'lotus'
      ? `<path d="M32 10 C24 22 20 34 32 46 C44 34 40 22 32 10 Z" fill="${fg}"/><path d="M32 46 C16 42 10 30 16 20 C24 26 26 36 32 46 Z" fill="${accent}"/><path d="M32 46 C48 42 54 30 48 20 C40 26 38 36 32 46 Z" fill="${accent}"/><circle cx="32" cy="38" r="5" fill="#fef08a"/>`
      : symbol === 'female'
      ? `<circle cx="32" cy="24" r="11" fill="#fde68a"/><path d="M20 22 C20 11 44 11 44 22 C44 17 38 14 32 14 C26 14 20 17 20 22 Z" fill="#1c1917"/><circle cx="42" cy="14" r="4.5" fill="${accent}"/><path d="M16 54 C16 40 48 40 48 54 Z" fill="${fg}"/>`
      : `<circle cx="32" cy="24" r="11" fill="#fcd34d"/><path d="M21 21 C21 12 43 12 43 21 C41 16 23 16 21 21 Z" fill="#1c1917"/><path d="M15 54 C15 40 49 40 49 54 Z" fill="${fg}"/><circle cx="32" cy="45" r="3" fill="${accent}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/>${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_NPC_AVATARS: string[] = [
  makeSvgAvatarDataUri('#831843', '#fbcfe8', '#f472b6', 'female'),
  makeSvgAvatarDataUri('#1e3a8a', '#93c5fd', '#fbbf24', 'male'),
  makeSvgAvatarDataUri('#064e3b', '#a7f3d0', '#34d399', 'lotus'),
  makeSvgAvatarDataUri('#78350f', '#fde68a', '#f59e0b', 'female'),
  makeSvgAvatarDataUri('#4c1d95', '#ddd6fe', '#c084fc', 'male'),
  makeSvgAvatarDataUri('#7f1d1d', '#fecaca', '#fbbf24', 'lotus'),
];

export const FONT_FAMILY_OPTIONS = [
  { label: 'Mặc định (Inter / Sans-serif)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Cổ Phong / Trang Trọng (Serif)', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'Kinh Điển / Thư Pháp (Palatino)', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { label: 'Bo Tròn Mềm Mại (Rounded)', value: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, sans-serif' },
  { label: 'Đậm Nét Hiện Đại (Arial Black / Impact)', value: '"Arial Black", Gadget, sans-serif' },
  { label: 'Kỹ Thuật Số (Monospace)', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
] as const;

export const SAMPLE_NAMES = [
  'Nguyễn Thị Yến Nhi',
  'Trần Minh Khang',
  'Lê Hoàng Bảo',
  'Phạm Thu Hà',
  'Vũ Đức Đạt',
  'Phương Ngọc Ánh',
  'Hoàng Gia Huy',
  'Đặng Khánh Linh',
  'Bùi Thanh Tùng',
  'Ngô Mỹ Duyên',
  'Anh Bắc ROMEO',
  'Tối Bên Chùa',
  'Đỗ Quang Minh',
  'Hồ Thảo Vy',
  'Lý Hải Đăng',
  'Trương Bảo Ngọc',
];

export const SAMPLE_PRAYERS = [
  'Cầu cho gia đình con năm nay bình an, mạnh khỏe ạ 🙏',
  'Mong cho con buôn may bán đắt, khách khứa tấp nập',
  'Cầu cho con thi giữa kì Toán Lý đạt điểm tốt nhất',
  'Nam Mô A Di Đà Phật, cầu cho cha mẹ bách niên giai lão',
  'Cầu cho mai con chốt được nhiều đơn hàng suôn sẻ',
  'Xin vía năm nay tìm được ý trung nhân chân thành',
  'Ước mai đề thi dễ, làm bài trúng tủ 100%',
  'Cầu bình an, tai qua nạn khỏi, tâm thanh tịnh',
  'Xin bề trên phù hộ tháng mới công việc hanh thông',
  'Thành tâm lễ Phật, cầu cho mọi người trong phòng live bình an',
];

export const NODE_SERVER_CODE = `// File: server.js (Tích hợp TikTok Live v1/v2 + Giọng đọc AI HoaiMy/NamMinh miễn phí)
const express = require('express');
const cors = require('cors');
const tiktokPkg = require('tiktok-live-connector');
const TikTokConnector = tiktokPkg.WebcastPushConnection || tiktokPkg.TikTokLiveConnection;
const { WebSocketServer } = require('ws');

let MsEdgeTTS, OUTPUT_FORMAT;
try {
  ({ MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts'));
} catch (e) {}

// 1. Tạo Server HTTP cấp phát Giọng Đọc AI Miễn Phí cho Web & OBS Browser Source
const app = express();
app.use(cors());

app.get('/tts', async (req, res) => {
  try {
    const text = (req.query.text || 'Nam mô A Di Đà Phật').slice(0, 220);
    const voice = req.query.voice || 'vi-VN-HoaiMyNeural';

    if (voice === 'google-vi' || !MsEdgeTTS) {
      const gUrl = \`https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=\${encodeURIComponent(text)}\`;
      const response = await fetch(gUrl);
      res.setHeader('Content-Type', 'audio/mpeg');
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_Mono_MP3);
    res.setHeader('Content-Type', 'audio/mpeg');
    const readable = tts.toStream(text);
    readable.pipe(res);
  } catch (err) {
    console.error('TTS Error:', err.message);
    res.status(500).end();
  }
});

app.listen(3000, () => console.log('Server Giọng Đọc AI đang chạy tại: http://localhost:3000/tts'));

// 2. Tạo WebSocket Server truyền sự kiện TikTok Live + Đồng bộ Tab Admin sang OBS
const TIKTOK_USERNAME = "ten_id_tiktok_cua_ban"; // Đổi thành ID TikTok đang Live (không có chữ @)
const SIGN_API_KEY = ""; // (Tùy chọn) Dán API Key miễn phí từ https://www.eulerstream.com nếu bị lỗi 403 SignatureError

const wss = new WebSocketServer({ port: 8080 });
const tiktok = new TikTokConnector(TIKTOK_USERNAME, {
  enableExtendedGiftInfo: false,
  ...(SIGN_API_KEY ? { signApiKey: SIGN_API_KEY } : {})
});

function broadcast(data, excludeWs = null) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === 1) client.send(json);
  });
}

function getUserName(data) {
  return (
    data?.user?.nickname ||
    data?.user?.uniqueId ||
    data?.nickname ||
    data?.uniqueId ||
    'Phật Tử'
  );
}

function getUserAvatar(data) {
  const u = data?.user || data?.userDetails || data || {};
  const candidates = [
    u.profilePictureUrl,
    u.avatarUrl,
    u.profilePicture?.url?.[0],
    u.profilePicture?.urls?.[0],
    u.profilePicture?.urlList?.[0],
    u.avatarThumb?.url?.[0],
    u.avatarThumb?.urls?.[0],
    u.avatarThumb?.urlList?.[0],
    u.avatarMedium?.url?.[0],
    u.avatarMedium?.urls?.[0],
    u.avatarMedium?.urlList?.[0],
    data?.profilePictureUrl,
    data?.avatarUrl,
    data?.profilePicture?.url?.[0],
    data?.profilePicture?.urls?.[0],
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c;
  }
  const searchBoxes = [u.profilePicture, u.avatarThumb, data?.profilePicture];
  for (const box of searchBoxes) {
    if (box && typeof box === 'object') {
      for (const val of Object.values(box)) {
        if (typeof val === 'string' && val.startsWith('http')) return val;
        if (Array.isArray(val)) {
          const found = val.find(item => typeof item === 'string' && item.startsWith('http'));
          if (found) return found;
        }
      }
    }
  }
  return null;
}

wss.on('connection', ws => {
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'ADMIN_SYNC') broadcast(msg, ws);
    } catch (e) {}
  });
});

tiktok.connect().then(state => {
  console.log(\`Đã kết nối phòng Live: \${state.roomId || TIKTOK_USERNAME}\`);
}).catch(err => console.error('Lỗi kết nối TikTok:', err));

tiktok.on('chat', data => {
  broadcast({
    type: 'chat',
    username: getUserName(data),
    avatarUrl: getUserAvatar(data),
    comment: data.comment || ''
  });
});

const giftStreakTracker = new Map();

tiktok.on('gift', data => {
  const username = getUserName(data);
  const giftId = data?.giftId || data?.gift?.id || data?.giftDetails?.giftName || data?.giftName || 'default';
  const streakKey = \`\${username}_\${giftId}\`;
  const diamondCount = Number(
    data?.giftDetails?.diamondCount ??
    data?.gift?.diamondCount ??
    data?.extendedGiftInfo?.diamond_count ??
    data?.diamondCount ??
    1
  ) || 1;
  const repeatCount = Math.max(1, Number(data?.repeatCount ?? data?.comboCount ?? 1) || 1);
  const prevCount = giftStreakTracker.get(streakKey) || 0;
  const deltaCount = repeatCount > prevCount ? repeatCount - prevCount : (data?.repeatEnd ? 0 : repeatCount);

  if (data?.repeatEnd) {
    giftStreakTracker.delete(streakKey);
  } else {
    giftStreakTracker.set(streakKey, repeatCount);
    setTimeout(() => giftStreakTracker.delete(streakKey), 8000);
  }

  if (deltaCount <= 0) return;

  broadcast({
    type: 'gift',
    username,
    avatarUrl: getUserAvatar(data),
    giftName: data?.giftDetails?.giftName || data?.gift?.name || data?.giftName || 'Lễ vật',
    coins: Math.max(1, diamondCount * deltaCount)
  });
});

tiktok.on('like', data => {
  broadcast({
    type: 'like',
    username: getUserName(data),
    avatarUrl: getUserAvatar(data),
    likeCount: data.likeCount || 1
  });
});

tiktok.on('follow', data => {
  broadcast({
    type: 'follow',
    username: getUserName(data),
    avatarUrl: getUserAvatar(data)
  });
});`;


