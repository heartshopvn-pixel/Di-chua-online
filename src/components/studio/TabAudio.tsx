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
  eventTtsQueue?: {
    waitingCount: number;
    isPlayingEvent: boolean;
    currentEventText: string | null;
    queueItems: string[];
  };
  onClearEventTtsQueue?: () => void;
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
  eventTtsQueue,
  onClearEventTtsQueue,
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

  const bgmTracks = config.bgmTracks || [];
  const activeBgmTrack =
    bgmTracks.find((t) => t.id === config.activeBgmTrackId) || bgmTracks[0];

  const handleUploadBgmMp3 = (file: File) => {
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newTrack: BgmTrackItem = {
          id: `bgm-custom-${Date.now()}`,
          title: cleanName || 'Nhạc Thiền MP3 Mới',
          url: reader.result,
        };
        const nextTracks = [...bgmTracks, newTrack];
        onUpdateConfig({
          bgmTracks: nextTracks,
          activeBgmTrackId: newTrack.id,
          bgmEnabled: true,
        });
      }
    };
    reader.readAsDataURL(file);
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
  const waitingCount = eventTtsQueue?.waitingCount ?? 0;
  const isPlayingEvent = eventTtsQueue?.isPlayingEvent ?? false;
  const currentEventText = eventTtsQueue?.currentEventText ?? null;
  const queueItems = eventTtsQueue?.queueItems ?? [];

  return (
    <div className="space-y-3.5">
      {/* 1. HÀNG CHỜ ÂM THANH SỰ KIỆN */}
      <section className="p-3 rounded-xl bg-stone-900/85 border border-amber-500/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <MessageSquareQuote className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-xs font-bold text-amber-200">
              Hàng Chờ Đọc Sự Kiện ({waitingCount}/{config.maxTtsQueueSize ?? 30})
            </h2>
          </div>

          {waitingCount > 0 && onClearEventTtsQueue && (
            <button
              type="button"
              onClick={onClearEventTtsQueue}
              className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-[10px] font-bold text-rose-200 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa chờ ({waitingCount})</span>
            </button>
          )}
        </div>

        {/* Bộ đếm */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-1.5 rounded-lg bg-stone-950/90 border border-amber-500/30 text-center">
            <div className="text-[10px] text-stone-400">Chờ đọc</div>
            <div
              className={`text-base font-extrabold font-mono ${
                waitingCount > 0 ? 'text-amber-300' : 'text-stone-400'
              }`}
            >
              {waitingCount}
            </div>
          </div>

          <div className="p-1.5 rounded-lg bg-stone-950/90 border border-emerald-500/30 text-center">
            <div className="text-[10px] text-stone-400">Đang phát</div>
            <div
              className={`text-base font-extrabold font-mono ${
                isPlayingEvent ? 'text-emerald-400' : 'text-stone-400'
              }`}
            >
              {isPlayingEvent ? 1 : 0}
            </div>
          </div>

          <div className="p-1.5 rounded-lg bg-stone-950/90 border border-sky-500/30 text-center">
            <div className="text-[10px] text-stone-400">Tổng sự kiện</div>
            <div
              className={`text-base font-extrabold font-mono ${
                waitingCount + (isPlayingEvent ? 1 : 0) > 0
                  ? 'text-sky-300'
                  : 'text-stone-400'
              }`}
            >
              {waitingCount + (isPlayingEvent ? 1 : 0)}
            </div>
          </div>
        </div>

        {/* Chi tiết câu đang đọc & danh sách chờ */}
        {(isPlayingEvent || waitingCount > 0) && (
          <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 space-y-1.5">
            {isPlayingEvent && currentEventText && (
              <div className="flex items-start gap-1.5 text-[10.5px]">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[9.5px] shrink-0">
                  ĐANG ĐỌC
                </span>
                <span className="text-emerald-200 line-clamp-2">
                  “{currentEventText}”
                </span>
              </div>
            )}

            {queueItems.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {queueItems.slice(0, 8).map((item, idx) => (
                  <div
                    key={`${idx}-${item.slice(0, 16)}`}
                    className="text-[10px] text-stone-300 bg-stone-900/90 border border-stone-800/80 rounded px-2 py-1 truncate"
                  >
                    <span className="text-amber-400 font-bold mr-1">
                      #{idx + 1}:
                    </span>
                    {item}
                  </div>
                ))}
                {queueItems.length > 8 && (
                  <div className="text-[9.5px] text-stone-500 italic pl-1">
                    ... +{queueItems.length - 8} câu đang chờ
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Giới hạn hàng chờ (đạt giới hạn tự xóa làm mới) & Giới hạn số chữ mỗi câu */}
        <div className="grid grid-cols-1 gap-2">
          <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-cyan-200">
                🔄 Giới hạn hàng chờ (Đạt mốc tự xóa làm mới)
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={config.maxTtsQueueSize ?? 30}
                  onChange={(e) =>
                    onUpdateConfig({
                      maxTtsQueueSize: Math.max(
                        1,
                        Math.min(200, parseInt(e.target.value, 10) || 30)
                      ),
                    })
                  }
                  className="w-12 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-cyan-300 text-right"
                />
                <span className="text-[10.5px] font-mono text-cyan-300">câu</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[10, 20, 30, 50].map((limit) => (
                <button
                  key={limit}
                  type="button"
                  onClick={() => onUpdateConfig({ maxTtsQueueSize: limit })}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                    (config.maxTtsQueueSize ?? 30) === limit
                      ? 'bg-cyan-400 text-stone-950 font-bold'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  {limit}
                </button>
              ))}
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={Math.min(100, Math.max(5, config.maxTtsQueueSize ?? 30))}
                onChange={(e) =>
                  onUpdateConfig({
                    maxTtsQueueSize: Math.max(1, parseInt(e.target.value, 10) || 30),
                  })
                }
                className="flex-1 accent-cyan-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-amber-200">
                ✂️ Số chữ tối đa mỗi câu đọc
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={5}
                  max={60}
                  step={1}
                  value={config.maxTtsWords ?? 25}
                  onChange={(e) =>
                    onUpdateConfig({
                      maxTtsWords: Math.max(
                        5,
                        Math.min(60, parseInt(e.target.value, 10) || 25)
                      ),
                    })
                  }
                  className="w-12 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-amber-300 text-right"
                />
                <span className="text-[10.5px] font-mono text-amber-300">chữ</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[12, 18, 25, 35, 50].map((words) => (
                <button
                  key={words}
                  type="button"
                  onClick={() => onUpdateConfig({ maxTtsWords: words })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                    (config.maxTtsWords ?? 25) === words
                      ? 'bg-amber-400 text-stone-950 font-bold'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  {words}
                </button>
              ))}
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={Math.min(60, Math.max(5, config.maxTtsWords ?? 25))}
                onChange={(e) =>
                  onUpdateConfig({
                    maxTtsWords: Math.max(5, parseInt(e.target.value, 10) || 25),
                  })
                }
                className="flex-1 accent-amber-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. NHẠC NỀN, CHUÔNG, MÕ & TRỤ TRÌ */}
      <section className="p-3 rounded-xl bg-stone-900/85 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-amber-300">
              Nhạc Nền, Chuông & Mõ
            </h2>
            <span className="text-[10.5px] text-stone-400">
              ({ttsStatus.text})
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onTestTTS}
              className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3" />
              <span>Đọc thử</span>
            </button>
            <button
              type="button"
              onClick={onPanicMute}
              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer"
            >
              <VolumeX className="w-3 h-3" />
              <span>Ngắt đọc</span>
            </button>
          </div>
        </div>

        {/* Nhạc nền */}
        <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-stone-100">Nhạc nền</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>+ MP3</span>
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
              <label className="flex items-center gap-1 text-xs font-bold text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bgmEnabled}
                  onChange={(e) =>
                    onUpdateConfig({ bgmEnabled: e.target.checked })
                  }
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
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
              className="col-span-6 px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-200 focus:outline-none"
            >
              {bgmTracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.url ? '(MP3)' : ''}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={activeBgmTrack?.title || ''}
              onChange={(e) => handleRenameActiveBgm(e.target.value)}
              placeholder="Tên bài nhạc..."
              className="col-span-5 px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-amber-200 focus:outline-none"
            />

            <button
              type="button"
              onClick={handleDeleteActiveBgm}
              disabled={bgmTracks.length <= 1}
              className="col-span-1 h-7 rounded bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10.5px] text-stone-400">
            <span className="shrink-0">Âm lượng:</span>
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

        {/* Tiếng chuông */}
        <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-stone-100">Chuông</span>
              <span className="text-[10px] text-amber-300 truncate">
                ({config.bellMp3Title || 'Mặc định'})
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onPlayBell}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-semibold text-amber-200 cursor-pointer"
              >
                Thử
              </button>
              <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>MP3</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onUpdateConfig({
                            bellMp3Url: reader.result,
                            bellMp3Title: f.name,
                          });
                        }
                      };
                      reader.readAsDataURL(f);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {config.bellMp3Url && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      bellMp3Url: null,
                      bellMp3Title: 'Mặc định',
                    })
                  }
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
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span>{config.bellEnabled ? 'Bật' : 'Tắt'}</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-stone-300">
            <span>Chu kỳ gõ tự động:</span>
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
                className="w-12 px-1 py-0.5 rounded bg-stone-900 border border-stone-800 text-center font-mono text-amber-300 text-[11px]"
              />
              <span className="text-[10px] text-stone-400">s</span>
            </div>
          </div>
        </div>

        {/* Tiếng mõ */}
        <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Drum className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-stone-100">Mõ</span>
              <span className="text-[10px] text-amber-300 truncate">
                ({config.woodenFishMp3Title || 'Mặc định'})
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onPlayWoodenFish}
                className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-semibold text-amber-200 cursor-pointer"
              >
                Thử
              </button>
              <label className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] font-semibold text-amber-300 flex items-center gap-1 cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>MP3</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onUpdateConfig({
                            woodenFishMp3Url: reader.result,
                            woodenFishMp3Title: f.name,
                          });
                        }
                      };
                      reader.readAsDataURL(f);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {config.woodenFishMp3Url && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      woodenFishMp3Url: null,
                      woodenFishMp3Title: 'Mặc định',
                    })
                  }
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
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span>{config.woodenFishEnabled ? 'Bật' : 'Tắt'}</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-stone-300">
            <span>Chu kỳ gõ tự động:</span>
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
                className="w-12 px-1 py-0.5 rounded bg-stone-900 border border-stone-800 text-center font-mono text-amber-300 text-[11px]"
              />
              <span className="text-[10px] text-stone-400">s</span>
            </div>
          </div>
        </div>

        {/* Bong bóng chat Trụ trì */}
        <label className="p-2 rounded-lg bg-amber-950/30 border border-amber-400/40 flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400" />
            <span>Bong Bóng Chat Trụ Trì (Live Text)</span>
          </span>
          <input
            type="checkbox"
            checked={config.abbotBubbleEnabled}
            onChange={(e) =>
              onUpdateConfig({ abbotBubbleEnabled: e.target.checked })
            }
            className="accent-amber-400 w-4 h-4 rounded shrink-0 cursor-pointer"
          />
        </label>
      </section>

      {/* 3. KỂ CHUYỆN / THUYẾT PHÁP */}
      <section className="p-3 rounded-xl bg-stone-900/85 border border-stone-800 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <h2 className="text-xs font-bold text-emerald-200">
              Thuyết Pháp / Kể Chuyện
            </h2>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onUpdateConfig({ dharmaAutoNext: !isAutoNext })}
              className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition ${
                isAutoNext
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-stone-800 border-stone-700 text-stone-400'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>Tự Next: {isAutoNext ? 'BẬT' : 'TẮT'}</span>
            </button>

            <button
              type="button"
              onClick={onNextDharmaArticle}
              disabled={dharmaArticles.length <= 1}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 disabled:opacity-40 border border-amber-400/50 text-[10px] font-bold text-amber-200 flex items-center gap-1 cursor-pointer transition"
            >
              <SkipForward className="w-3 h-3" />
              <span>Next</span>
            </button>

            <button
              type="button"
              onClick={handleAddDharmaArticle}
              className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] font-semibold text-emerald-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm</span>
            </button>

            <label className="flex items-center gap-1 text-xs font-bold text-emerald-300 cursor-pointer ml-1">
              <input
                type="checkbox"
                checked={config.dharmaEnabled}
                onChange={(e) =>
                  onUpdateConfig({ dharmaEnabled: e.target.checked })
                }
                className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
              />
              <span>{config.dharmaEnabled ? 'Bật' : 'Tắt'}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-1.5 items-center">
          <select
            value={activeDharma?.id || ''}
            onChange={(e) =>
              onUpdateConfig({ activeDharmaId: e.target.value })
            }
            className="col-span-6 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-200 focus:outline-none"
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
            placeholder="Tiêu đề..."
            className="col-span-5 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-emerald-200 font-semibold focus:outline-none"
          />

          <button
            type="button"
            onClick={handleDeleteActiveDharma}
            disabled={dharmaArticles.length <= 1}
            className="col-span-1 h-7 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <textarea
          rows={3}
          value={activeDharma?.content || ''}
          onChange={(e) =>
            handleUpdateActiveDharma({ content: e.target.value })
          }
          placeholder="Nội dung thuyết pháp..."
          className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 leading-relaxed focus:outline-none resize-y"
        />
      </section>

      {/* 4. MẪU CÂU ĐỌC SỰ KIỆN */}
      <section className="p-3 rounded-xl bg-stone-900/85 border border-emerald-500/35 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-emerald-300">
            Mẫu Câu Đọc Sự Kiện
          </h2>
          <span className="text-[10px] text-amber-300 font-mono bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
            Biến: [Tên], [Comment]
          </span>
        </div>

        {/* MỤC 1: Chào mừng */}
        {(() => {
          const list1 =
            Array.isArray(config.welcomeTtsTemplates) &&
            config.welcomeTtsTemplates.length > 0
              ? config.welcomeTtsTemplates
              : [config.realWelcomeTtsTemplate || 'Chào mừng [Tên] đến kim thiền tự'];
          return (
            <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-emerald-200">
                  1. Chào mừng vào chùa ({list1.length})
                </span>
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.realWelcomeTtsEnabled}
                      onChange={(e) =>
                        onUpdateConfig({ realWelcomeTtsEnabled: e.target.checked })
                      }
                      className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span>Người</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.npcWelcomeTtsEnabled}
                      onChange={(e) =>
                        onUpdateConfig({ npcWelcomeTtsEnabled: e.target.checked })
                      }
                      className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span>NPC</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [
                        ...list1,
                        'Hoan hỷ chào đón Phật tử [Tên] về chùa cầu an',
                      ];
                      onUpdateConfig({
                        welcomeTtsTemplates: next,
                        realWelcomeTtsTemplate: next[0],
                        npcWelcomeTtsTemplate: next[0],
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-[10px] font-bold text-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {list1.map((tpl, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-stone-500 w-4 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={tpl}
                      onChange={(e) => {
                        const next = list1.map((item, i) =>
                          i === idx ? e.target.value : item
                        );
                        onUpdateConfig({
                          welcomeTtsTemplates: next,
                          realWelcomeTtsTemplate: next[0] || '',
                          npcWelcomeTtsTemplate: next[0] || '',
                        });
                      }}
                      className="flex-1 px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-200 focus:outline-none"
                    />
                    {list1.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = list1.filter((_, i) => i !== idx);
                          onUpdateConfig({
                            welcomeTtsTemplates: next,
                            realWelcomeTtsTemplate: next[0] || '',
                            npcWelcomeTtsTemplate: next[0] || '',
                          });
                        }}
                        className="p-1 rounded bg-stone-900 hover:bg-rose-950 text-stone-400 hover:text-rose-300 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* MỤC 2: Dâng lễ */}
        {(() => {
          const list2 =
            Array.isArray(config.giftTtsTemplates) &&
            config.giftTtsTemplates.length > 0
              ? config.giftTtsTemplates
              : [
                  config.realGiftTtsTemplate ||
                    'Cảm ơn [Tên] đã dâng lễ vật, chúc bạn và gia đình bình an và sức khỏe',
                ];
          return (
            <div className="p-2 rounded-lg bg-stone-950/90 border border-amber-500/30 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-amber-200">
                  2. Cảm tạ dâng lễ ({list2.length})
                </span>
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.realGiftTtsEnabled}
                      onChange={(e) =>
                        onUpdateConfig({ realGiftTtsEnabled: e.target.checked })
                      }
                      className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span>Người</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.npcGiftTtsEnabled}
                      onChange={(e) =>
                        onUpdateConfig({ npcGiftTtsEnabled: e.target.checked })
                      }
                      className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span>NPC</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [
                        ...list2,
                        'Tán thán công đức thí chủ [Tên], chúc bạn vạn sự hanh thông cát tường',
                      ];
                      onUpdateConfig({
                        giftTtsTemplates: next,
                        realGiftTtsTemplate: next[0],
                        npcGiftTtsTemplate: next[0],
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-[10px] font-bold text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {list2.map((tpl, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-stone-500 w-4 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={tpl}
                      onChange={(e) => {
                        const next = list2.map((item, i) =>
                          i === idx ? e.target.value : item
                        );
                        onUpdateConfig({
                          giftTtsTemplates: next,
                          realGiftTtsTemplate: next[0] || '',
                          npcGiftTtsTemplate: next[0] || '',
                        });
                      }}
                      className="flex-1 px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-amber-200 focus:outline-none"
                    />
                    {list2.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = list2.filter((_, i) => i !== idx);
                          onUpdateConfig({
                            giftTtsTemplates: next,
                            realGiftTtsTemplate: next[0] || '',
                            npcGiftTtsTemplate: next[0] || '',
                          });
                        }}
                        className="p-1 rounded bg-stone-900 hover:bg-rose-950 text-stone-400 hover:text-rose-300 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* MỤC 3: Cầu nguyện */}
        {(() => {
          const list3 =
            Array.isArray(config.prayerTtsTemplates) &&
            config.prayerTtsTemplates.length > 0
              ? config.prayerTtsTemplates
              : [config.realPrayerTtsTemplate || '[Tên] cầu nguyện: [Comment]'];
          return (
            <div className="p-2 rounded-lg bg-stone-950/90 border border-stone-800 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-stone-200">
                  3. Lời cầu nguyện ({list3.length})
                </span>
                <div className="flex items-center gap-2.5">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.realPrayerTtsEnabled}
                      onChange={(e) =>
                        onUpdateConfig({ realPrayerTtsEnabled: e.target.checked })
                      }
                      className="accent-emerald-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span>Người</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.npcPrayerTtsEnabled}
                      onChange={(e) =>
                        onUpdateConfig({ npcPrayerTtsEnabled: e.target.checked })
                      }
                      className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span>NPC</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [
                        ...list3,
                        'Phật tử [Tên] thành tâm ước nguyện: [Comment]',
                      ];
                      onUpdateConfig({
                        prayerTtsTemplates: next,
                        realPrayerTtsTemplate: next[0],
                        npcPrayerTtsTemplate: next[0],
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-[10px] font-bold text-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {list3.map((tpl, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-stone-500 w-4 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={tpl}
                      onChange={(e) => {
                        const next = list3.map((item, i) =>
                          i === idx ? e.target.value : item
                        );
                        onUpdateConfig({
                          prayerTtsTemplates: next,
                          realPrayerTtsTemplate: next[0] || '',
                          npcPrayerTtsTemplate: next[0] || '',
                        });
                      }}
                      className="flex-1 px-2 py-1 rounded bg-stone-900 border border-stone-800 text-[11px] text-stone-200 focus:outline-none"
                    />
                    {list3.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = list3.filter((_, i) => i !== idx);
                          onUpdateConfig({
                            prayerTtsTemplates: next,
                            realPrayerTtsTemplate: next[0] || '',
                            npcPrayerTtsTemplate: next[0] || '',
                          });
                        }}
                        className="p-1 rounded bg-stone-900 hover:bg-rose-950 text-stone-400 hover:text-rose-300 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      {/* 5. CẤU HÌNH GIỌNG ĐỌC & ÂM VANG (XẾP THEO ĐỘ ỔN ĐỊNH TỪ TRÊN XUỐNG) */}
      <section className="p-3 rounded-xl bg-stone-900/85 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-amber-200">
            Giọng Đọc & Âm Vang (Ưu tiên ổn định từ trên xuống)
          </h2>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-[9.5px] font-bold text-emerald-300">
            Đã bật Cân Bằng Âm & Nạp Trước 0ms
          </span>
        </div>

        {/* Nguồn phát xếp theo thứ tự ổn định nhất từ trên xuống */}
        <div className="space-y-1">
          <div className="text-[10px] text-stone-400 font-medium">
            Nguồn phát (Xếp hạng ổn định 1 → 4):
          </div>
          <select
            value={config.ttsEngine}
            onChange={(e) =>
              onUpdateConfig({ ttsEngine: e.target.value as TTSEngineType })
            }
            className="w-full px-2 py-1.5 rounded-lg bg-stone-950 border border-amber-500/40 text-xs text-stone-100 font-semibold focus:outline-none focus:border-amber-400"
          >
            <option value="web_speech">
              1. [Ổn định #1 - 0ms] Web Speech Hệ Thống (Microsoft An / Google VN)
            </option>
            <option value="google_stream">
              2. [Ổn định #2 - Chuẩn OBS/TLS] Google Cloud Stream Đa Máy Chủ (GTX + Cache)
            </option>
            <option value="node_edge">
              3. [Ổn định #3 - Local Node] Node.js TTS (Google GTX / Edge AI HoaiMy, NamMinh)
            </option>
            <option value="monk_zen">
              4. [Phong cách Thiền] Giọng Sư Thầy Trầm Ấm (Kèm tiếng Mõ mở đầu)
            </option>
          </select>
        </div>

        {/* Lựa chọn giọng đọc chi tiết cho Google Cloud Stream */}
        {config.ttsEngine === 'google_stream' && (
          <div className="space-y-1">
            <div className="text-[10px] text-stone-400 font-medium">
              Chọn máy chủ & màu giọng Google Stream (Ưu tiên từ trên xuống):
            </div>
            <select
              value={
                config.nodeVoice?.startsWith('google-')
                  ? config.nodeVoice
                  : 'google-vi-gtx'
              }
              onChange={(e) => onUpdateConfig({ nodeVoice: e.target.value })}
              className="w-full px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-amber-200 font-medium"
            >
              <option value="google-vi-gtx">
                1. Google Cloud GTX — Nữ Chuẩn Rõ Chữ (Nhanh & Ổn định #1)
              </option>
              <option value="google-vi-twob">
                2. Google Translate TW-OB — Nữ Dịu Dàng (Máy chủ độc lập #2)
              </option>
              <option value="google-vi-slow">
                3. Google Nữ Trang Nghiêm — Nhịp Chậm Thuyết Pháp (ttsspeed=0.24)
              </option>
              <option value="google-vi-warm">
                4. Google Trầm Ấm Chánh Điện — Hạ Tần Số Ấm & Dày Giọng
              </option>
            </select>
          </div>
        )}

        {/* Lựa chọn giọng đọc chi tiết cho Node.js Local TTS */}
        {config.ttsEngine === 'node_edge' && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-stone-400 font-medium">
              Chọn giọng Node.js (Xếp theo độ ổn định từ trên xuống):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <select
                value={config.nodeVoice}
                onChange={(e) => onUpdateConfig({ nodeVoice: e.target.value })}
                className="px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-amber-200 font-medium"
              >
                <option value="google-vi-gtx">
                  1. Google Cloud GTX (Ổn định #1 - 0 lỗi mạng)
                </option>
                <option value="google-vi">
                  2. Google Translate TW-OB (Ổn định #2 - Nữ chuẩn)
                </option>
                <option value="google-vi-slow">
                  3. Google Nữ Trang Nghiêm (Nhịp chậm)
                </option>
                <option value="google-vi-warm">
                  4. Google Trầm Ấm Chánh Điện (Dày tiếng)
                </option>
                <option value="vi-VN-HoaiMyNeural">
                  5. Edge AI - Hoài My Neural (Nữ truyền cảm)
                </option>
                <option value="vi-VN-NamMinhNeural">
                  6. Edge AI - Nam Minh Neural (Nam trầm ấm)
                </option>
              </select>
              <input
                type="text"
                value={config.nodeTtsEndpoint}
                onChange={(e) =>
                  onUpdateConfig({ nodeTtsEndpoint: e.target.value })
                }
                placeholder="http://localhost:3000/tts"
                className="px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-amber-300 font-mono"
              />
            </div>
          </div>
        )}

        {/* Lựa chọn giọng hệ thống khi dùng Web Speech hoặc Giọng Sư Thầy */}
        {(config.ttsEngine === 'web_speech' ||
          config.ttsEngine === 'monk_zen') && (
          <div className="space-y-1">
            <div className="text-[10px] text-stone-400 font-medium">
              Chọn giọng Tiếng Việt trong máy ({systemVoices.length} giọng khả dụng):
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={config.selectedSystemVoiceURI}
                onChange={(e) =>
                  onUpdateConfig({ selectedSystemVoiceURI: e.target.value })
                }
                className="flex-1 px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-200"
              >
                <option value="">
                  ★ Tự động chọn giọng Tiếng Việt tốt nhất (vi-VN)
                </option>
                {systemVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.lang.toLowerCase().includes('vi') ? '🇻🇳 ' : ''}
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={scanVoices}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-[10.5px] font-semibold text-amber-300 shrink-0 cursor-pointer"
              >
                Quét giọng
              </button>
            </div>
          </div>
        )}

        {/* Preset Tông Giọng 1-chạm */}
        <div className="space-y-1 pt-0.5">
          <div className="text-[10px] text-stone-400 font-medium">
            Chọn nhanh Tông Giọng mẫu:
          </div>
          <div className="grid grid-cols-5 gap-1">
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  ttsRate: 1.05,
                  ttsPitch: 1.0,
                  ttsReverb: 0.1,
                })
              }
              className="px-1.5 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-[10px] font-semibold text-stone-200 cursor-pointer truncate"
            >
              Nữ Chuẩn
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  ttsRate: 0.95,
                  ttsPitch: 1.1,
                  ttsReverb: 0.2,
                })
              }
              className="px-1.5 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-[10px] font-semibold text-pink-300 cursor-pointer truncate"
            >
              Nữ Dịu
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  ttsRate: 0.95,
                  ttsPitch: 0.82,
                  ttsReverb: 0.25,
                })
              }
              className="px-1.5 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-[10px] font-semibold text-sky-300 cursor-pointer truncate"
            >
              Nam Trầm
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  ttsRate: 0.88,
                  ttsPitch: 0.72,
                  ttsReverb: 0.4,
                })
              }
              className="px-1.5 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-amber-500/40 text-[10px] font-semibold text-amber-300 cursor-pointer truncate"
            >
              Sư Thầy
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  ttsRate: 1.12,
                  ttsPitch: 1.22,
                  ttsReverb: 0.15,
                })
              }
              className="px-1.5 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-[10px] font-semibold text-emerald-300 cursor-pointer truncate"
            >
              Chú Tiểu
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800">
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

          <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800">
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

          <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800">
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

          <div className="p-2 rounded-lg bg-stone-950/80 border border-amber-500/30">
            <div className="flex justify-between text-[10.5px] text-amber-200">
              <span className="font-semibold">Âm vang (Reverb)</span>
              <span className="text-amber-300 font-mono font-bold">
                {Math.round((config.ttsReverb ?? 0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.ttsReverb ?? 0}
              onChange={(e) =>
                onUpdateConfig({ ttsReverb: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
