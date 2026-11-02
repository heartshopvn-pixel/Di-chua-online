import React, { useState } from 'react';
import {
  Users,
  Gamepad2,
  MessageSquare,
  Bell,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Send,
  Edit3,
  Check,
  X,
  Shuffle,
  Volume2,
  ImagePlus,
  Upload,
} from 'lucide-react';
import {
  ControlledTargetId,
  GameConfig,
  PilgrimData,
  TempleMonkData,
} from '../../types/game';

interface TabNpcProps {
  config: GameConfig;
  pilgrims: PilgrimData[];
  monks: TempleMonkData[];
  npcNames: string[];
  npcPrayers: string[];
  npcAvatars: string[];
  controlledTarget: ControlledTargetId;
  onUpdateConfig: (partial: Partial<GameConfig>) => void;
  onSelectControlledTarget: (target: ControlledTargetId) => void;
  onUpdateNpcNames: (names: string[]) => void;
  onResetNpcNames: () => void;
  onUpdateNpcPrayers: (prayers: string[]) => void;
  onResetNpcPrayers: () => void;
  onUpdateNpcAvatars: (avatars: string[]) => void;
  onResetNpcAvatars: () => void;
  onRandomizeActiveNpcAvatars: () => void;
  onControlledWoodenFish: () => void;
  onSendControlledChat: (text: string) => void;
}

export const TabNpc: React.FC<TabNpcProps> = ({
  config,
  pilgrims,
  monks,
  npcNames,
  npcPrayers,
  npcAvatars,
  controlledTarget,
  onUpdateConfig,
  onSelectControlledTarget,
  onUpdateNpcNames,
  onResetNpcNames,
  onUpdateNpcPrayers,
  onResetNpcPrayers,
  onUpdateNpcAvatars,
  onResetNpcAvatars,
  onRandomizeActiveNpcAvatars,
  onControlledWoodenFish,
  onSendControlledChat,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');
  const [newPrayerInput, setNewPrayerInput] = useState('');
  const [newAvatarUrlInput, setNewAvatarUrlInput] = useState('');

  // Inline edit state for NPC Names
  const [editingNameIdx, setEditingNameIdx] = useState<number | null>(null);
  const [editingNameVal, setEditingNameVal] = useState('');

  // Inline edit state for NPC Prayers
  const [editingPrayerIdx, setEditingPrayerIdx] = useState<number | null>(null);
  const [editingPrayerVal, setEditingPrayerVal] = useState('');

  const handleSendChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !controlledTarget) return;
    onSendControlledChat(chatInput.trim());
    setChatInput('');
  };

  const targetStr = typeof controlledTarget === 'string' ? controlledTarget : '';

  const handleRandomPossessNpc = () => {
    const botPilgrims = pilgrims.filter(
      (p) =>
        p.isBot &&
        p.state !== 'leave_side_to_aisle' &&
        p.state !== 'leave_down_exit'
    );
    const pool =
      botPilgrims.length > 0
        ? botPilgrims
        : pilgrims.filter(
            (p) =>
              p.state !== 'leave_side_to_aisle' && p.state !== 'leave_down_exit'
          );
    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    onSelectControlledTarget(`pilgrim:${picked.id}`);
  };

  const getControlledLabel = () => {
    if (!targetStr) return 'Chưa chọn nhân vật (AI tự động)';
    if (targetStr.startsWith('monk:')) {
      const monkId = targetStr.replace('monk:', '');
      const m = monks.find((item) => item.id === monkId);
      return m ? m.name : 'Chư Tăng';
    }
    if (targetStr.startsWith('pilgrim:')) {
      const pid = Number(targetStr.replace('pilgrim:', ''));
      const found = pilgrims.find((p) => p.id === pid);
      if (found) return `${found.username} (${found.isVip ? 'VIP' : 'Phật tử'})`;
    }
    return 'Nhân vật đã rời sân';
  };

  // Name handlers
  const handleAddName = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newNameInput.trim();
    if (!val) return;
    if (!npcNames.includes(val)) {
      onUpdateNpcNames([val, ...npcNames]);
    }
    setNewNameInput('');
  };

  const handleDeleteName = (idx: number) => {
    onUpdateNpcNames(npcNames.filter((_, i) => i !== idx));
  };

  const handleSaveEditName = (idx: number) => {
    const val = editingNameVal.trim();
    if (val) {
      const next = [...npcNames];
      next[idx] = val;
      onUpdateNpcNames(next);
    }
    setEditingNameIdx(null);
  };

  // Prayer handlers
  const handleAddPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newPrayerInput.trim();
    if (!val) return;
    if (!npcPrayers.includes(val)) {
      onUpdateNpcPrayers([val, ...npcPrayers]);
    }
    setNewPrayerInput('');
  };

  const handleDeletePrayer = (idx: number) => {
    onUpdateNpcPrayers(npcPrayers.filter((_, i) => i !== idx));
  };

  const handleSaveEditPrayer = (idx: number) => {
    const val = editingPrayerVal.trim();
    if (val) {
      const next = [...npcPrayers];
      next[idx] = val;
      onUpdateNpcPrayers(next);
    }
    setEditingPrayerIdx(null);
  };

  const handleUploadTxtList = (
    e: React.ChangeEvent<HTMLInputElement>,
    onApply: (lines: string[]) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const lines = reader.result
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          onApply(Array.from(new Set(lines)));
        }
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* 1. MỤC ĐIỀU KHIỂN TRỰC TIẾP NPC / TRỤ TRÌ / CHÚ TIỂU */}
      <div className="bg-gradient-to-br from-cyan-950/50 via-[#1b120e] to-[#1b120e] border border-cyan-500/40 rounded-lg p-3.5 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Điều Khiển NPC / Trụ Trì / Chú Tiểu
            </h3>
          </div>
          {targetStr && (
            <button
              type="button"
              onClick={() => onSelectControlledTarget(null)}
              className="px-2 py-0.5 rounded bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 text-[10px] font-bold transition"
            >
              Thoát nhập vai
            </button>
          )}
        </div>

        <p className="text-[11px] text-amber-200/75 leading-relaxed">
          Chọn <strong className="text-cyan-300">Sư Trụ Trì, Chú Tiểu</strong> hoặc bất kỳ{' '}
          <strong className="text-cyan-300">NPC</strong> nào đang trên sân để trực tiếp điều khiển:
          bấm <kbd className="px-1.5 py-0.5 bg-black/60 border border-cyan-500/40 rounded text-cyan-300 font-mono text-[10px]">W A S D</kbd> để di chuyển, giữ{' '}
          <kbd className="px-1.5 py-0.5 bg-black/60 border border-emerald-500/40 rounded text-emerald-300 font-mono text-[10px]">Shift</kbd> để <strong className="text-emerald-300">đi chậm</strong> (= tốc độ đi bình thường của Chú Tiểu & Sư Trụ Trì khi không bị điều khiển), bấm{' '}
          <kbd className="px-1.5 py-0.5 bg-black/60 border border-amber-500/40 rounded text-amber-300 font-mono text-[10px]">Q</kbd> để gõ mõ, và nhập chat bên dưới.
        </p>

        {/* Bộ chọn nhân vật nhập vai */}
        <div className="grid grid-cols-3 gap-1.5">
          {monks.map((m) => {
            const monkTargetId: ControlledTargetId = `monk:${m.id}`;
            const active = targetStr === monkTargetId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() =>
                  onSelectControlledTarget(active ? null : monkTargetId)
                }
                className={`px-2 py-2 rounded border text-[11px] font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                  active
                    ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                    : 'bg-black/40 border-amber-500/20 text-amber-200/80 hover:border-cyan-400/50'
                }`}
              >
                <span>{m.name}</span>
                <span className="text-[9px] font-normal opacity-75">
                  {active ? 'Đang điều khiển' : 'Bấm để nhập vai'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chọn NPC từ danh sách đang ở sân hoặc ngẫu nhiên */}
        <div className="flex gap-1.5">
          <select
            value={targetStr.startsWith('pilgrim:') ? targetStr : ''}
            onChange={(e) => {
              const val = e.target.value;
              onSelectControlledTarget(val ? (val as ControlledTargetId) : null);
            }}
            className="flex-1 bg-black/60 border border-cyan-500/30 rounded px-2.5 py-1.5 text-xs text-amber-100 focus:outline-none focus:border-cyan-400"
          >
            <option value="">-- Chọn Phật tử / NPC trên sân ({pilgrims.length}) --</option>
            {pilgrims.map((p) => (
              <option key={p.id} value={`pilgrim:${p.id}`}>
                {p.username} {p.isBot ? '(NPC)' : '(Khách)'} {p.isVip ? '★ VIP' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRandomPossessNpc}
            disabled={pilgrims.length === 0}
            className="px-2.5 py-1.5 rounded bg-cyan-800/50 hover:bg-cyan-700/60 disabled:opacity-40 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
            title="Nhập vào 1 NPC ngẫu nhiên"
          >
            <Shuffle className="w-3.5 h-3.5" />
            NPC Ngẫu Nhiên
          </button>
        </div>

        {/* Trạng thái nhân vật đang điều khiển + Gõ mõ + Nhập chat */}
        <div className="bg-black/45 border border-cyan-500/25 rounded-md p-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-amber-200/80">
              Đang nhập vai:{' '}
              <span className="font-bold text-cyan-300">{getControlledLabel()}</span>
            </div>
            <button
              type="button"
              onClick={onControlledWoodenFish}
              disabled={!controlledTarget}
              className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 disabled:opacity-40 border border-amber-400/50 text-amber-200 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
            >
              <Bell className="w-3 h-3 text-amber-300" />
              Gõ Mõ (Phím Q)
            </button>
          </div>

          {/* Ô nhập chat cho nhân vật đang điều khiển */}
          <form onSubmit={handleSendChatSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!controlledTarget}
              placeholder={
                controlledTarget
                  ? 'Nhập câu chat / lời khấn cho nhân vật đang điều khiển...'
                  : 'Hãy chọn 1 NPC / Trụ trì ở trên trước khi nhập chat...'
              }
              className="flex-1 bg-black/60 border border-amber-500/30 rounded px-2.5 py-1.5 text-xs text-amber-100 placeholder:text-amber-200/35 focus:outline-none focus:border-cyan-400 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!controlledTarget || !chatInput.trim()}
              className="px-3 py-1.5 rounded bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Chat
            </button>
          </form>

          {/* Nút chọn nhanh lời cầu nguyện mẫu để chat */}
          {controlledTarget && npcPrayers.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {npcPrayers.slice(0, 3).map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSendControlledChat(sample)}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/25 text-amber-200/85 truncate max-w-[165px] transition"
                  title={sample}
                >
                  "{sample}"
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. TẦN SUẤT CẦU NGUYỆN & SỐ LƯỢNG NPC TỰ ĐỘNG */}
      <div className="bg-[#1b120e] border border-amber-500/20 rounded-lg p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Tần Suất Cầu Nguyện & Đám Đông NPC
            </h3>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-amber-200">
            <input
              type="checkbox"
              checked={config.autoCrowd}
              onChange={(e) => onUpdateConfig({ autoCrowd: e.target.checked })}
              className="accent-amber-500 rounded"
            />
            Bật NPC tự động
          </label>
        </div>

        {/* Tần suất cầu nguyện của NPC */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-amber-200/80">Tần suất NPC cầu nguyện mới:</span>
            <span className="font-bold text-amber-400">
              Mỗi {(config.npcPrayIntervalSec ?? 6).toFixed(1)} giây
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={0.5}
            value={config.npcPrayIntervalSec ?? 6}
            onChange={(e) =>
              onUpdateConfig({ npcPrayIntervalSec: Number(e.target.value) })
            }
            className="w-full accent-amber-500"
          />
          <p className="text-[10px] text-amber-200/50 mt-0.5">
            Cứ mỗi khoảng thời gian này, 1 NPC đang ngồi bái lạy sẽ bốc ngẫu nhiên 1 lời cầu nguyện mới từ danh sách bên dưới.
          </p>
        </div>

        {/* Tần suất NPC mới bước vào chùa */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-amber-200/80">Tốc độ NPC mới bước vào chùa:</span>
            <span className="font-bold text-amber-400">
              Mỗi {(config.npcSpawnIntervalSec ?? 2.5).toFixed(1)} giây
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={15}
            step={0.5}
            value={config.npcSpawnIntervalSec ?? 2.5}
            onChange={(e) =>
              onUpdateConfig({ npcSpawnIntervalSec: Number(e.target.value) })
            }
            className="w-full accent-amber-500"
          />
        </div>

        {/* Số lượng NPC mục tiêu trên sân */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-amber-200/80">Số NPC duy trì:</span>
              <span className="font-bold text-amber-400">{config.botTargetCrowd}</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={config.botTargetCrowd}
              onChange={(e) =>
                onUpdateConfig({ botTargetCrowd: Number(e.target.value) })
              }
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-amber-200/80">Tỷ lệ NPC VIP:</span>
              <span className="font-bold text-amber-400">{config.botVipPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config.botVipPercent}
              onChange={(e) =>
                onUpdateConfig({ botVipPercent: Number(e.target.value) })
              }
              className="w-full accent-amber-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-200/85 pt-1">
          <input
            type="checkbox"
            checked={config.botSpeakTTS}
            onChange={(e) => onUpdateConfig({ botSpeakTTS: e.target.checked })}
            className="accent-amber-500"
          />
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          Đọc giọng nói (TTS) cho cả lời cầu nguyện của NPC
        </label>
      </div>

      {/* 3. DANH SÁCH LỜI CẦU NGUYỆN / COMMENT CỦA NPC */}
      <div className="bg-[#1b120e] border border-amber-500/20 rounded-lg p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/10 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 truncate">
              Danh Sách Comment / Cầu Nguyện NPC ({npcPrayers.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label
              className="text-[10px] font-bold text-emerald-200 hover:text-emerald-100 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 cursor-pointer transition"
              title="Tải file .txt (mỗi dòng 1 câu comment/cầu nguyện) để cập nhật danh sách"
            >
              <Upload className="w-3 h-3 text-emerald-400" />
              <span>Cập nhật bằng file .txt</span>
              <input
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => handleUploadTxtList(e, onUpdateNpcPrayers)}
              />
            </label>
            <button
              type="button"
              onClick={onResetNpcPrayers}
              className="text-[10px] text-amber-300/70 hover:text-amber-200 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/20 cursor-pointer"
              title="Khôi phục danh sách lời cầu nguyện mặc định"
            >
              <RotateCcw className="w-3 h-3" />
              Mặc định
            </button>
          </div>
        </div>

        <form onSubmit={handleAddPrayer} className="flex gap-1.5">
          <input
            type="text"
            value={newPrayerInput}
            onChange={(e) => setNewPrayerInput(e.target.value)}
            placeholder="Thêm lời cầu nguyện mới..."
            className="flex-1 bg-black/50 border border-amber-500/30 rounded px-2.5 py-1.5 text-xs text-amber-100 placeholder:text-amber-200/35 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm
          </button>
        </form>

        <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {npcPrayers.map((prayer, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-1.5 bg-black/40 border border-amber-500/15 rounded px-2.5 py-1.5 text-xs group"
            >
              {editingPrayerIdx === idx ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editingPrayerVal}
                    onChange={(e) => setEditingPrayerVal(e.target.value)}
                    className="flex-1 bg-black/80 border border-amber-400 rounded px-2 py-0.5 text-xs text-amber-100"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEditPrayer(idx)}
                    className="p-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPrayerIdx(null)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-amber-100/90 flex-1 leading-snug">{prayer}</span>
                  <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPrayerIdx(idx);
                        setEditingPrayerVal(prayer);
                      }}
                      className="p-1 text-amber-300/70 hover:text-amber-200"
                      title="Sửa"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePrayer(idx)}
                      className="p-1 text-red-400/70 hover:text-red-300"
                      title="Xóa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. DANH SÁCH TÊN NPC */}
      <div className="bg-[#1b120e] border border-amber-500/20 rounded-lg p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/10 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 truncate">
              Danh Sách Tên NPC ({npcNames.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <label
              className="text-[10px] font-bold text-emerald-200 hover:text-emerald-100 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 cursor-pointer transition"
              title="Tải file .txt (mỗi dòng 1 tên NPC) để cập nhật danh sách tên"
            >
              <Upload className="w-3 h-3 text-emerald-400" />
              <span>Cập nhật bằng file .txt</span>
              <input
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => handleUploadTxtList(e, onUpdateNpcNames)}
              />
            </label>
            <button
              type="button"
              onClick={onResetNpcNames}
              className="text-[10px] text-amber-300/70 hover:text-amber-200 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/20 cursor-pointer"
              title="Khôi phục danh sách tên mặc định"
            >
              <RotateCcw className="w-3 h-3" />
              Mặc định
            </button>
          </div>
        </div>

        <form onSubmit={handleAddName} className="flex gap-1.5">
          <input
            type="text"
            value={newNameInput}
            onChange={(e) => setNewNameInput(e.target.value)}
            placeholder="Thêm tên NPC mới (VD: Phật Tử Tâm An)..."
            className="flex-1 bg-black/50 border border-amber-500/30 rounded px-2.5 py-1.5 text-xs text-amber-100 placeholder:text-amber-200/35 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm
          </button>
        </form>

        <div className="max-h-44 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1 custom-scrollbar">
          {npcNames.map((name, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-1 bg-black/40 border border-amber-500/15 rounded px-2 py-1 text-xs group"
            >
              {editingNameIdx === idx ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editingNameVal}
                    onChange={(e) => setEditingNameVal(e.target.value)}
                    className="w-full bg-black/80 border border-amber-400 rounded px-1.5 py-0.5 text-[11px] text-amber-100"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEditName(idx)}
                    className="text-emerald-400 shrink-0"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNameIdx(null)}
                    className="text-red-400 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-amber-100/90 truncate text-[11px]" title={name}>
                    {name}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-75 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNameIdx(idx);
                        setEditingNameVal(name);
                      }}
                      className="p-0.5 text-amber-300/70 hover:text-amber-200"
                      title="Sửa tên"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteName(idx)}
                      className="p-0.5 text-red-400/70 hover:text-red-300"
                      title="Xóa tên"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5. KHO AVATAR NPC (POOL NGẪU NHIÊN) */}
      <div className="bg-[#1b120e] border border-amber-500/20 rounded-lg p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Kho Avatar NPC — Pool Ngẫu Nhiên ({npcAvatars.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRandomizeActiveNpcAvatars}
              className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 cursor-pointer"
              title="Đổi ngẫu nhiên avatar từ Pool cho tất cả NPC đang ở trên sân"
            >
              <Shuffle className="w-3 h-3" />
              Đổi cho NPC trên sân
            </button>
            <button
              type="button"
              onClick={onResetNpcAvatars}
              className="text-[10px] text-amber-300/70 hover:text-amber-200 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/20 cursor-pointer"
              title="Khôi phục kho avatar mặc định"
            >
              <RotateCcw className="w-3 h-3" />
              Mặc định
            </button>
          </div>
        </div>

        <p className="text-[10.5px] text-amber-200/70 leading-relaxed">
          Mỗi khi NPC mới bước vào chùa, hệ thống sẽ bốc ngẫu nhiên 1 ảnh từ kho này làm Avatar bên trái tên nhân vật. Có thể tải lên nhiều ảnh cùng lúc.
        </p>

        <div className="flex items-center gap-1.5">
          <label className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer">
            <ImagePlus className="w-3.5 h-3.5" />
            <span>+ Tải Lên Nhiều Ảnh Avatar</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                Promise.all(
                  files.map(
                    (f) =>
                      new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () =>
                          resolve(String(reader.result || URL.createObjectURL(f)));
                        reader.onerror = () => resolve(URL.createObjectURL(f));
                        reader.readAsDataURL(f);
                      })
                  )
                ).then((newUrls) => {
                  onUpdateNpcAvatars([...newUrls, ...npcAvatars]);
                });
                e.target.value = '';
              }}
            />
          </label>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = newAvatarUrlInput.trim();
              if (!val) return;
              onUpdateNpcAvatars([val, ...npcAvatars]);
              setNewAvatarUrlInput('');
            }}
            className="flex gap-1 flex-1 min-w-0"
          >
            <input
              type="text"
              value={newAvatarUrlInput}
              onChange={(e) => setNewAvatarUrlInput(e.target.value)}
              placeholder="Hoặc dán link ảnh Avatar..."
              className="flex-1 min-w-0 bg-black/50 border border-amber-500/30 rounded px-2 py-1.5 text-xs text-amber-100 placeholder:text-amber-200/35 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded bg-stone-800 hover:bg-stone-700 border border-amber-500/30 text-amber-200 font-bold text-xs shrink-0 cursor-pointer"
            >
              Thêm
            </button>
          </form>
        </div>

        <div className="max-h-40 overflow-y-auto grid grid-cols-6 gap-2 pt-1 pr-1 custom-scrollbar">
          {npcAvatars.map((url, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-lg bg-black/60 border border-amber-500/25 overflow-hidden flex items-center justify-center"
            >
              <img
                src={url}
                alt={`NPC Avatar ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  onUpdateNpcAvatars(npcAvatars.filter((_, i) => i !== idx))
                }
                title="Xóa avatar này khỏi Pool"
                className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 hover:text-red-300 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
