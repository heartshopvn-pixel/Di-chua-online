import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Drum,
  MessageSquareQuote,
  Music,
  Plus,
  Repeat,
  RotateCcw,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  BgmTrackItem,
  DharmaArticleItem,
  GameConfig,
  TTSEngineType,
} from '../../types/game';

interface TabAudioProps {
  config: GameConfig;
  ttsStatus: { text: string; active: boolean };
  onUpdateConfig: (patch: Partial<GameConfig>) => void;
  onPlayBell: () => void;
  onPlayWoodenFish: () => void;
  onPanicMute: () => void;
  onTestTTS: () => void;
  onNextDharmaArticle: () => void;
}

export const TabAudio: React.FC<TabAudioProps> = ({
  config,
  ttsStatus,
  onUpdateConfig,
  onPlayBell,
  onPlayWoodenFish,
  onPanicMute,
  onTestTTS,
  onNextDharmaArticle,
}) => {
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  const scanVoices = () => {
    if (!('speechSynthesis' in window)) return;
    const list = window.speechSynthesis.getVoices() || [];
    const sorted = [...list].sort((a, b) => {
      const aVi = a.lang.toLowerCase().includes('vi') ? 1 : 0;
      const bVi = b.lang.toLowerCase().includes('vi') ? 1 : 0;
      return bVi - aVi;
    });
    setSystemVoices(sorted);
  };

  useEffect(() => {
    scanVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = scanVoices;
    }
  }, []);

  // Nhạc nền (BGM) handlers
  const bgmTracks = config.bgmTracks || [];
  const activeBgmTrack =
    bgmTracks.find((t) => t.id === config.activeBgmTrackId) || bgmTracks[0];

  const handleUploadBgmMp3 = (file: File) => {
    const url = URL.createObjectURL(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const newTrack: BgmTrackItem = {
      id: `bgm-custom-${Date.now()}`,
      title: cleanName || 'Nhạc Thiền MP3 Mới',
      url,
    };
    const nextTracks = [...bgmTracks, newTrack];
    onUpdateConfig({
      bgmTracks: nextTracks,
      activeBgmTrackId: newTrack.id,
      bgmEnabled: true,
    });
  };

  const handleRenameActiveBgm = (newTitle: string) => {
    if (!activeBgmTrack) return;
    const nextTracks = bgmTracks.map((t) =>
      t.id === activeBgmTrack.id ? { ...t, title: newTitle } : t
    );
    onUpdateConfig({ bgmTracks: nextTracks });
  };

  const handleDeleteActiveBgm = () => {
    if (!activeBgmTrack || bgmTracks.length <= 1) return;
    const nextTracks = bgmTracks.filter((t) => t.id !== activeBgmTrack.id);
    onUpdateConfig({
      bgmTracks: nextTracks,
      activeBgmTrackId: nextTracks[0].id,
    });
  };

  // Thuyết pháp / Kể chuyện handlers
  const dharmaArticles = config.dharmaArticles || [];
  const activeDharma =
    dharmaArticles.find((a) => a.id === config.activeDharmaId) ||
    dharmaArticles[0];

  const handleUpdateActiveDharma = (patch: Partial<DharmaArticleItem>) => {
    if (!activeDharma) return;
    const nextList = dharmaArticles.map((item) =>
      item.id === activeDharma.id ? { ...item, ...patch } : item
    );
    onUpdateConfig({ dharmaArticles: nextList });
  };

  const handleAddDharmaArticle = () => {
    const idx = dharmaArticles.length + 1;
    const newItem: DharmaArticleItem = {
      id: `dharma-${Date.now()}`,
      title: `Bài ${idx}: Lời Phật Dạy Mới`,
      content:
        'Nam mô A Di Đà Phật. Tâm bình thế giới bình, tâm an vạn sự an. Chúc toàn thể quý Phật tử cùng gia quyến vô lượng an lạc, vô lượng cát tường.',
    };
    onUpdateConfig({
      dharmaArticles: [...dharmaArticles, newItem],
      activeDharmaId: newItem.id,
    });
  };

  const handleDeleteActiveDharma = () => {
    if (!activeDharma || dharmaArticles.length <= 1) return;
    const nextList = dharmaArticles.filter((a) => a.id !== activeDharma.id);
    onUpdateConfig({
      dharmaArticles: nextList,
      activeDharmaId: nextList[0].id,
    });
  };

  const isAutoNext = config.dharmaAutoNext ?? true;

  return (
    <div className="space-y-3.5">
      {/* Thẻ Gộp Trung Tâm Âm Thanh, Thuyết Pháp & Đọc Sự Kiện */}
      <section className="p-3.5 rounded-2xl bg-gradient-to-b from-stone-900/95 to-stone-950 border border-amber-500/40 shadow-xl space-y-3.5">
        {/* Header của thẻ gộp */}
        <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
          <div>
            <h2 className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
              Trung Tâm Âm Thanh, Thuyết Pháp & Đọc Sự Kiện
            </h2>
            <p className="text-[10.5px] text-stone-400">
              Trạng thái:{' '}
              <span
                className={
                  ttsStatus.active
                    ? 'text-emerald-400 font-semibold'
                    : 'text-stone-300'
                }
              >
                {ttsStatus.text}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onTestTTS}
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3" />
              <span>Đọc thử</span>
            </button>
            <button
              type="button"
              onClick={onPanicMute}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer"
            >
              <VolumeX className="w-3 h-3" />
              <span>Ngắt đọc</span>
            </button>
          </div>
        </div>

        {/* 1. NHẠC NỀN + TIẾNG CHUÔNG + TIẾNG GÕ MÕ */}
        <div className="space-y-2">
          {/* 1A. Nhạc nền (Bật/Tắt + List chọn nhạc MP3 + Đặt Title) */}
          <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-stone-100">
                  Nhạc nền Chánh Điện
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10.5px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>+ Thêm MP3</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadBgmMp3(f);
                    }}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.bgmEnabled}
                    onChange={(e) =>
                      onUpdateConfig({ bgmEnabled: e.target.checked })
                    }
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>{config.bgmEnabled ? 'Bật' : 'Tắt'}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-1.5 items-center">
              <select
                value={activeBgmTrack?.id || ''}
                onChange={(e) =>
                  onUpdateConfig({ activeBgmTrackId: e.target.value })
                }
                className="col-span-6 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
              >
                {bgmTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.url ? '(MP3)' : '(Mặc định)'}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={activeBgmTrack?.title || ''}
                onChange={(e) => handleRenameActiveBgm(e.target.value)}
                placeholder="Đặt tên bài nhạc..."
                title="Đặt lại tiêu đề (Title) cho bài nhạc nền đang chọn"
                className="col-span-5 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-amber-200 focus:outline-none focus:border-amber-500"
              />

              <button
                type="button"
                onClick={handleDeleteActiveBgm}
                disabled={bgmTracks.length <= 1}
                title="Xóa bài nhạc này khỏi danh sách"
                className="col-span-1 h-7 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10.5px] text-stone-400">
              <span className="shrink-0">Âm lượng nhạc nền:</span>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={config.bgmVolume ?? 0.4}
                onChange={(e) =>
                  onUpdateConfig({ bgmVolume: parseFloat(e.target.value) })
                }
                className="flex-1 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-stone-200 w-9 text-right">
                {Math.round((config.bgmVolume ?? 0.4) * 100)}%
              </span>
            </div>
          </div>

          {/* 1B. Tiếng chuông (Bật/Tắt + Chọn file MP3 + Khoảng cách gõ chuông) */}
          <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-stone-100 truncate">
                  Tiếng Chuông:
                </span>
                <span className="text-[10.5px] text-amber-300 truncate">
                  {config.bellMp3Title || 'Mặc định'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onPlayBell}
                  className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10.5px] font-semibold text-amber-200 cursor-pointer"
                >
                  Thỉnh thử
                </button>
                <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10.5px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Chọn MP3</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        onUpdateConfig({
                          bellMp3Url: URL.createObjectURL(f),
                          bellMp3Title: f.name,
                        });
                      }
                    }}
                  />
                </label>
                {config.bellMp3Url && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        bellMp3Url: null,
                        bellMp3Title: 'Chuông Chùa Ngân Vang (Mặc định)',
                      })
                    }
                    title="Khôi phục chuông mặc định"
                    className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
                <label className="flex items-center gap-1 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.bellEnabled}
                    onChange={(e) =>
                      onUpdateConfig({ bellEnabled: e.target.checked })
                    }
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>{config.bellEnabled ? 'Bật' : 'Tắt'}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-stone-300">
              <span>Thời gian khoảng cách gõ chuông tự động:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min={2}
                  max={180}
                  step={1}
                  value={config.bellIntervalSec || 25}
                  onChange={(e) =>
                    onUpdateConfig({
                      bellIntervalSec: Math.max(
                        2,
                        parseInt(e.target.value, 10) || 25
                      ),
                    })
                  }
                  className="w-24 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min={2}
                  max={600}
                  value={config.bellIntervalSec || 25}
                  onChange={(e) =>
                    onUpdateConfig({
                      bellIntervalSec: Math.max(
                        2,
                        parseInt(e.target.value, 10) || 25
                      ),
                    })
                  }
                  className="w-14 px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-center font-mono text-amber-300 text-[11px]"
                />
                <span className="text-[10.5px] text-stone-400">giây</span>
              </div>
            </div>
          </div>

          {/* 1C. Tiếng gõ mõ (Bật/Tắt + Chọn file MP3 + Khoảng cách gõ mõ) */}
          <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Drum className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-stone-100 truncate">
                  Tiếng Gõ Mõ:
                </span>
                <span className="text-[10.5px] text-amber-300 truncate">
                  {config.woodenFishMp3Title || 'Mặc định'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onPlayWoodenFish}
                  className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10.5px] font-semibold text-amber-200 cursor-pointer"
                >
                  Gõ thử
                </button>
                <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10.5px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Chọn MP3</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        onUpdateConfig({
                          woodenFishMp3Url: URL.createObjectURL(f),
                          woodenFishMp3Title: f.name,
                        });
                      }
                    }}
                  />
                </label>
                {config.woodenFishMp3Url && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        woodenFishMp3Url: null,
                        woodenFishMp3Title: 'Tiếng Mõ Tụng Kinh (Mặc định)',
                      })
                    }
                    title="Khôi phục tiếng mõ mặc định"
                    className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
                <label className="flex items-center gap-1 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.woodenFishEnabled}
                    onChange={(e) =>
                      onUpdateConfig({ woodenFishEnabled: e.target.checked })
                    }
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>{config.woodenFishEnabled ? 'Bật' : 'Tắt'}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-stone-300">
              <span>Thời gian khoảng cách gõ mõ tự động:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min={0.5}
                  max={30}
                  step={0.5}
                  value={config.woodenFishIntervalSec || 3}
                  onChange={(e) =>
                    onUpdateConfig({
                      woodenFishIntervalSec: Math.max(
                        0.5,
                        parseFloat(e.target.value) || 3
                      ),
                    })
                  }
                  className="w-24 accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min={0.5}
                  max={120}
                  step={0.5}
                  value={config.woodenFishIntervalSec || 3}
                  onChange={(e) =>
                    onUpdateConfig({
                      woodenFishIntervalSec: Math.max(
                        0.5,
                        parseFloat(e.target.value) || 3
                      ),
                    })
                  }
                  className="w-14 px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-center font-mono text-amber-300 text-[11px]"
                />
                <span className="text-[10.5px] text-stone-400">giây</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. BẬT / TẮT CHẾ ĐỘ TRỤ TRÌ BONG BÓNG CHAT (LIVE TEXT CÙNG VỚI VIỆC ĐỌC) */}
        <label className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-400/50 flex items-center justify-between gap-3 cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquareQuote className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-200">
                Chế độ Trụ Trì Bong Bóng Chat (Live Text)
              </div>
              <div className="text-[10.5px] text-stone-300">
                Hiển thị trực tiếp câu đang đọc vào bong bóng chat trên đầu Sư Trụ Trì
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={config.abbotBubbleEnabled}
            onChange={(e) =>
              onUpdateConfig({ abbotBubbleEnabled: e.target.checked })
            }
            className="accent-amber-400 w-4 h-4 rounded shrink-0 cursor-pointer"
          />
        </label>

        {/* 3. CHẾ ĐỘ KỂ CHUYỆN / THUYẾT PHÁP (BẬT/TẮT + NÚT TỰ NEXT BÀI + LIST NHIỀU BÀI) */}
        <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-200">
                  Chế độ Kể chuyện / Thuyết pháp
                </span>
                <span className="text-[10px] text-stone-400 block">
                  {isAutoNext
                    ? 'Đọc hết bài sẽ tự động chuyển sang bài kế tiếp'
                    : 'Đọc hết bài sẽ lặp lại bài hiện tại từ đầu'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Nút bật/tắt Tự Next Bài */}
              <button
                type="button"
                onClick={() =>
                  onUpdateConfig({ dharmaAutoNext: !isAutoNext })
                }
                title={
                  isAutoNext
                    ? 'Đang bật Tự động Next sang bài tiếp theo khi đọc xong'
                    : 'Đang tắt Tự động Next (Chỉ lặp lại 1 bài hiện tại)'
                }
                className={`px-2 py-0.5 rounded border text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  isAutoNext
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                    : 'bg-stone-800 border-stone-700 text-stone-400'
                }`}
              >
                <Repeat className="w-3 h-3" />
                <span>Tự Next bài: {isAutoNext ? 'BẬT' : 'TẮT'}</span>
              </button>

              {/* Nút Next bài ngay lập tức */}
              <button
                type="button"
                onClick={onNextDharmaArticle}
                disabled={dharmaArticles.length <= 1}
                title="Chuyển ngay sang bài thuyết pháp tiếp theo"
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-40 border border-amber-400/50 text-[10.5px] font-bold text-amber-200 flex items-center gap-1 cursor-pointer transition"
              >
                <SkipForward className="w-3 h-3" />
                <span>Next bài</span>
              </button>

              <button
                type="button"
                onClick={handleAddDharmaArticle}
                className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10.5px] font-semibold text-emerald-200 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm bài</span>
              </button>

              <label className="flex items-center gap-1 text-xs font-bold text-emerald-300 cursor-pointer ml-1">
                <input
                  type="checkbox"
                  checked={config.dharmaEnabled}
                  onChange={(e) =>
                    onUpdateConfig({ dharmaEnabled: e.target.checked })
                  }
                  className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                />
                <span>{config.dharmaEnabled ? 'Đang bật' : 'Tắt'}</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1.5 items-center">
            <select
              value={activeDharma?.id || ''}
              onChange={(e) =>
                onUpdateConfig({ activeDharmaId: e.target.value })
              }
              className="col-span-6 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-200 focus:outline-none focus:border-emerald-500"
            >
              {dharmaArticles.map((a, idx) => (
                <option key={a.id} value={a.id}>
                  #{idx + 1} - {a.title}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={activeDharma?.title || ''}
              onChange={(e) =>
                handleUpdateActiveDharma({ title: e.target.value })
              }
              placeholder="Tiêu đề bài thuyết pháp..."
              className="col-span-5 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-emerald-200 font-semibold focus:outline-none focus:border-emerald-500"
            />

            <button
              type="button"
              onClick={handleDeleteActiveDharma}
              disabled={dharmaArticles.length <= 1}
              title="Xóa bài thuyết pháp này"
              className="col-span-1 h-7 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            rows={4}
            value={activeDharma?.content || ''}
            onChange={(e) =>
              handleUpdateActiveDharma({ content: e.target.value })
            }
            placeholder="Nhập văn bản thuyết pháp / mẫu truyện để đọc liên tục..."
            className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
          />
        </div>

        {/* 4. CHẾ ĐỘ ĐỌC SỰ KIỆN "NGƯỜI THẬT" (3 MỤC BẬT/TẮT + THIẾT LẬP NỘI DUNG) */}
        <div className="p-2.5 rounded-xl bg-stone-900/90 border border-emerald-500/35 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">
              Chế độ đọc sự kiện "Người thật"
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              Biến hỗ trợ: [Tên], [Comment]
            </span>
          </div>

          {/* 4.1 Chào mừng người mới */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] text-stone-200 cursor-pointer">
              <span>1. Đọc lời chào mừng người mới vào chánh điện</span>
              <input
                type="checkbox"
                checked={config.realWelcomeTtsEnabled}
                onChange={(e) =>
                  onUpdateConfig({ realWelcomeTtsEnabled: e.target.checked })
                }
                className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={config.realWelcomeTtsTemplate}
              onChange={(e) =>
                onUpdateConfig({ realWelcomeTtsTemplate: e.target.value })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 4.2 Lời chúc người gửi quà */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] text-amber-200 font-semibold cursor-pointer">
              <span>2. Đọc lời chúc cho người gửi quà (Dâng lễ)</span>
              <input
                type="checkbox"
                checked={config.realGiftTtsEnabled}
                onChange={(e) =>
                  onUpdateConfig({ realGiftTtsEnabled: e.target.checked })
                }
                className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={config.realGiftTtsTemplate}
              onChange={(e) =>
                onUpdateConfig({ realGiftTtsTemplate: e.target.value })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-amber-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 4.3 Đọc lời cầu nguyện */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] text-stone-200 cursor-pointer">
              <span>3. Đọc lời cầu nguyện (Bình luận)</span>
              <input
                type="checkbox"
                checked={config.realPrayerTtsEnabled}
                onChange={(e) =>
                  onUpdateConfig({ realPrayerTtsEnabled: e.target.checked })
                }
                className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={config.realPrayerTtsTemplate}
              onChange={(e) =>
                onUpdateConfig({ realPrayerTtsTemplate: e.target.value })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 5. CHẾ ĐỘ ĐỌC SỰ KIỆN "NPC" (TƯƠNG TỰ 3 MỤC BẬT/TẮT GIỐNG NGƯỜI THẬT) */}
        <div className="p-2.5 rounded-xl bg-stone-900/90 border border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300">
              Chế độ đọc sự kiện "NPC"
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              Biến hỗ trợ: [Tên], [Comment]
            </span>
          </div>

          {/* 5.1 Chào mừng NPC mới */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] text-stone-200 cursor-pointer">
              <span>1. Đọc lời chào mừng NPC mới vào chánh điện</span>
              <input
                type="checkbox"
                checked={config.npcWelcomeTtsEnabled}
                onChange={(e) =>
                  onUpdateConfig({ npcWelcomeTtsEnabled: e.target.checked })
                }
                className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={config.npcWelcomeTtsTemplate}
              onChange={(e) =>
                onUpdateConfig({ npcWelcomeTtsTemplate: e.target.value })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-300 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* 5.2 Lời chúc NPC gửi quà */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] text-stone-200 cursor-pointer">
              <span>2. Đọc lời chúc cho NPC gửi quà</span>
              <input
                type="checkbox"
                checked={config.npcGiftTtsEnabled}
                onChange={(e) =>
                  onUpdateConfig({ npcGiftTtsEnabled: e.target.checked })
                }
                className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={config.npcGiftTtsTemplate}
              onChange={(e) =>
                onUpdateConfig({ npcGiftTtsTemplate: e.target.value })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-300 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* 5.3 Đọc lời cầu nguyện của NPC */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-[11px] text-stone-200 cursor-pointer">
              <span>3. Đọc lời cầu nguyện của NPC</span>
              <input
                type="checkbox"
                checked={config.npcPrayerTtsEnabled}
                onChange={(e) =>
                  onUpdateConfig({ npcPrayerTtsEnabled: e.target.checked })
                }
                className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
              />
            </label>
            <input
              type="text"
              value={config.npcPrayerTtsTemplate}
              onChange={(e) =>
                onUpdateConfig({ npcPrayerTtsTemplate: e.target.value })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-300 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* 6. CẤU HÌNH GIỌNG ĐỌC (ENGINE + TỐC ĐỘ / CAO ĐỘ / ÂM LƯỢNG) */}
        <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2">
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-[10.5px] text-stone-400">
              Nguồn phát giọng đọc TTS:
            </label>
            <select
              value={config.ttsEngine}
              onChange={(e) =>
                onUpdateConfig({ ttsEngine: e.target.value as TTSEngineType })
              }
              className="w-full px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="node_edge">
                1. Node.js Edge-TTS AI (HoaiMy / NamMinh - OBS thu trực tiếp)
              </option>
              <option value="google_stream">
                2. Google Translate Stream (Luồng MP3 cho OBS)
              </option>
              <option value="web_speech">
                3. Trình duyệt Web Speech API (0% CPU, không giới hạn)
              </option>
              <option value="monk_zen">
                4. Giọng Thầy Chùa Trầm Ấm (Hạ trầm + Gõ mõ mở đầu)
              </option>
            </select>
          </div>

          {config.ttsEngine === 'node_edge' && (
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={config.nodeVoice}
                onChange={(e) => onUpdateConfig({ nodeVoice: e.target.value })}
                className="px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-200"
              >
                <option value="vi-VN-HoaiMyNeural">HoaiMyNeural (Nữ)</option>
                <option value="vi-VN-NamMinhNeural">NamMinhNeural (Nam)</option>
                <option value="google-vi">google-vi (Proxy)</option>
              </select>
              <input
                type="text"
                value={config.nodeTtsEndpoint}
                onChange={(e) =>
                  onUpdateConfig({ nodeTtsEndpoint: e.target.value })
                }
                className="px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] text-amber-300 font-mono"
              />
            </div>
          )}

          {(config.ttsEngine === 'web_speech' ||
            config.ttsEngine === 'monk_zen') && (
            <div className="flex items-center gap-1.5">
              <select
                value={config.selectedSystemVoiceURI}
                onChange={(e) =>
                  onUpdateConfig({ selectedSystemVoiceURI: e.target.value })
                }
                className="flex-1 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-200"
              >
                <option value="">Tự động ưu tiên giọng Tiếng Việt (vi-VN)</option>
                {systemVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={scanVoices}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10.5px] text-amber-300 shrink-0 cursor-pointer"
              >
                Quét giọng
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <div className="flex justify-between text-[10.5px] text-stone-400">
                <span>Tốc độ</span>
                <span className="text-stone-200 font-mono">
                  {config.ttsRate.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.7}
                max={1.45}
                step={0.05}
                value={config.ttsRate}
                onChange={(e) =>
                  onUpdateConfig({ ttsRate: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10.5px] text-stone-400">
                <span>Cao độ</span>
                <span className="text-stone-200 font-mono">
                  {config.ttsPitch.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={config.ttsPitch}
                onChange={(e) =>
                  onUpdateConfig({ ttsPitch: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10.5px] text-stone-400">
                <span>Âm lượng</span>
                <span className="text-stone-200 font-mono">
                  {Math.round(config.ttsVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={config.ttsVolume}
                onChange={(e) =>
                  onUpdateConfig({ ttsVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
