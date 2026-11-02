import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckSquare,
  Clock,
  Crosshair,
  FastForward,
  Flame,
  ListOrdered,
  Lock,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  User,
  Bot,
  Zap,
} from 'lucide-react';
import {
  CameraFocusState,
  CameraQueueItem,
  GameConfig,
  PilgrimData,
} from '../../types/game';

interface TabCameraProps {
  config: GameConfig;
  cameraFocus: CameraFocusState;
  cameraQueue: CameraQueueItem[];
  pilgrims: PilgrimData[];
  onUpdateConfig: (patch: Partial<GameConfig>) => void;
  onSkipCameraTarget: () => void;
  onResetCameraView: () => void;
  onClearCameraQueue: () => void;
  onRemoveCameraQueueItem: (queueId: string) => void;
  onFocusPilgrimNow: (pilgrimId: number) => void;
}

export const TabCamera: React.FC<TabCameraProps> = ({
  config,
  cameraFocus,
  cameraQueue,
  pilgrims,
  onUpdateConfig,
  onSkipCameraTarget,
  onResetCameraView,
  onClearCameraQueue,
  onRemoveCameraQueueItem,
  onFocusPilgrimNow,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 150);
    return () => clearInterval(timer);
  }, []);

  const activeTargetPilgrim =
    cameraFocus.pilgrimId !== null && nowMs < cameraFocus.until
      ? pilgrims.find((p) => p.id === cameraFocus.pilgrimId) || null
      : null;

  const remainingHoldSec =
    activeTargetPilgrim && cameraFocus.until > nowMs
      ? Math.max(0, (cameraFocus.until - nowMs) / 1000)
      : 0;

  const remainingLockSec =
    activeTargetPilgrim &&
    cameraFocus.lockedUntil &&
    cameraFocus.lockedUntil > nowMs
      ? Math.max(0, (cameraFocus.lockedUntil - nowMs) / 1000)
      : 0;

  const activeStagePilgrims = pilgrims.filter(
    (p) => p.state !== 'leave_down_exit'
  );

  const getReasonBadge = (reason?: string) => {
    if (reason === 'special_gift') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/60 text-[10px] font-bold text-amber-200 flex items-center gap-1 shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
          Lễ Đặc Biệt
        </span>
      );
    }
    if (reason === 'gift') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-pink-500/25 border border-pink-400/60 text-[10px] font-bold text-pink-200 flex items-center gap-1 shrink-0">
          <Flame className="w-2.5 h-2.5 text-pink-300" />
          Dâng Lễ
        </span>
      );
    }
    if (reason === 'manual') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-purple-500/25 border border-purple-400/60 text-[10px] font-bold text-purple-200 flex items-center gap-1 shrink-0">
          <Crosshair className="w-2.5 h-2.5 text-purple-300" />
          Chỉ định
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-bold text-cyan-200 flex items-center gap-1 shrink-0">
        <MessageSquare className="w-2.5 h-2.5 text-cyan-300" />
        Comment
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. TRẠNG THÁI CAMERA TRỰC TIẾP */}
      <section className="p-3 rounded-xl bg-gradient-to-br from-amber-950/40 via-stone-900 to-stone-950 border border-amber-500/40 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-200">
              Trạng Thái Camera Trực Tiếp (60fps Smooth Rig)
            </h2>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold border ${
              activeTargetPilgrim
                ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                : 'bg-stone-900 border-stone-700 text-stone-300'
            }`}
          >
            {activeTargetPilgrim
              ? `ĐANG ZOOM ${(config.cameraZoomScale ?? 2.25).toFixed(2)}x`
              : 'TOÀN CẢNH 1.00x'}
          </span>
        </div>

        {activeTargetPilgrim ? (
          <div className="p-2.5 rounded-lg bg-stone-950/90 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="text-xs font-extrabold text-amber-100 truncate">
                  {activeTargetPilgrim.username}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${
                    activeTargetPilgrim.isBot
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {activeTargetPilgrim.isBot ? 'NPC' : 'Người thật'}
                </span>
              </div>
              {getReasonBadge(cameraFocus.reason)}
            </div>

            {activeTargetPilgrim.prayer && (
              <div className="text-[11px] text-stone-300 italic bg-stone-900/80 px-2.5 py-1 rounded border border-stone-800 truncate">
                “{activeTargetPilgrim.prayer}”
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-mono pt-1">
              <span className="text-cyan-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Giữ mục tiêu còn: <b>{remainingHoldSec.toFixed(1)}s</b>
              </span>
              {remainingLockSec > 0 ? (
                <span className="text-amber-300 flex items-center gap-1 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Khóa Lễ Đặc Biệt: {remainingLockSec.toFixed(1)}s
                </span>
              ) : (
                <span className="text-stone-400">
                  Hàng chờ: <b>{cameraQueue.length}</b> mục tiêu
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-stone-950/75 border border-stone-800 text-xs text-stone-400 flex items-center justify-between">
            <span>
              Camera đang ở góc máy toàn cảnh mặc định. Sẽ tự động pan & zoom mượt khi có mục tiêu mới.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSkipCameraTarget}
            disabled={!activeTargetPilgrim && cameraQueue.length === 0}
            className="py-1.5 px-2.5 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 disabled:opacity-40 border border-cyan-400/50 text-xs font-bold text-cyan-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5 text-cyan-300" />
            <span>Skip tới mục tiêu kế ({cameraQueue.length})</span>
          </button>

          <button
            type="button"
            onClick={onResetCameraView}
            className="py-1.5 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Zoom ra mặc định</span>
          </button>
        </div>
      </section>

      {/* 2. CHẾ ĐỘ THEO DÕI COMMENT (BẬT / TẮT + TÍCH CHỌN NGƯỜI / NPC + THỜI GIAN GIỮ) */}
      <section className="p-3 rounded-xl bg-stone-900/80 border border-cyan-500/35 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chế Độ Theo Dõi Comment (Pan & Zoom Khóa Mục Tiêu)</span>
            </h3>
            <p className="text-[10.5px] text-stone-400 mt-0.5">
              Mỗi khi có comment thì pan camera zoom mượt lại gần người đó và khóa theo bước chân
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                cameraFollowCommentEnabled: !config.cameraFollowCommentEnabled,
              })
            }
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
              config.cameraFollowCommentEnabled
                ? 'bg-emerald-500 text-stone-950 shadow-sm'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            {config.cameraFollowCommentEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
          </button>
        </div>

        {/* Tích chọn: Người thật / NPC */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                cameraFollowRealUser: !config.cameraFollowRealUser,
              })
            }
            className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              config.cameraFollowRealUser
                ? 'bg-emerald-950/60 border-emerald-400/60 text-emerald-200'
                : 'bg-stone-950/60 border-stone-800 text-stone-400'
            }`}
          >
            {config.cameraFollowRealUser ? (
              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-stone-500 shrink-0" />
            )}
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Theo dõi: Người thật</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                cameraFollowNpc: !config.cameraFollowNpc,
              })
            }
            className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              config.cameraFollowNpc
                ? 'bg-amber-950/60 border-amber-400/60 text-amber-200'
                : 'bg-stone-950/60 border-stone-800 text-stone-400'
            }`}
          >
            {config.cameraFollowNpc ? (
              <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-stone-500 shrink-0" />
            )}
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span>Theo dõi: NPC</span>
          </button>
        </div>

        {/* Thời gian giữ camera trước khi thay đổi mục tiêu */}
        <div className="p-2.5 rounded-lg bg-stone-950/90 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-stone-200">
                ⏱️ Thời gian giữ Camera trước khi đổi mục tiêu
              </div>
              <div className="text-[10px] text-stone-400">
                Hết thời gian này sẽ chuyển sang người tiếp theo trong hàng chờ (nếu trống sẽ zoom mượt ra toàn cảnh)
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                max={60}
                step={1}
                value={config.cameraHoldDurationSec ?? 5}
                onChange={(e) =>
                  onUpdateConfig({
                    cameraHoldDurationSec: Math.max(
                      1,
                      Math.min(60, parseInt(e.target.value, 10) || 5)
                    ),
                  })
                }
                className="w-12 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-cyan-300 text-right"
              />
              <span className="text-[11px] font-mono text-cyan-300">giây</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              {[3, 5, 8, 12, 20].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateConfig({ cameraHoldDurationSec: sec })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                    (config.cameraHoldDurationSec ?? 5) === sec
                      ? 'bg-cyan-400 text-stone-950 font-bold'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={Math.min(30, Math.max(1, config.cameraHoldDurationSec ?? 5))}
              onChange={(e) =>
                onUpdateConfig({
                  cameraHoldDurationSec: Math.max(1, parseInt(e.target.value, 10) || 5),
                })
              }
              className="flex-1 accent-cyan-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* 3. CHẾ ĐỘ ĐẨY (PUSH MODE KHI CÓ NGƯỜI DÂNG LỄ & KHÓA 3S LỄ ĐẶC BIỆT) */}
      <section className="p-3 rounded-xl bg-stone-900/80 border border-amber-500/35 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Chế Độ Đẩy: Ưu Tiên Tuyệt Đối Khi Có Người Dâng Lễ</span>
            </h3>
            <p className="text-[10.5px] text-stone-400 mt-0.5">
              Khi có người dâng lễ thì skip camera hiện tại, di chuyển camera đến người dâng lễ ngay tức khắc. Với lễ đặc biệt thì vẫn khóa camera 3s mới tới mục tiêu kế.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                cameraPushOnGiftEnabled: !config.cameraPushOnGiftEnabled,
              })
            }
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer shrink-0 ${
              config.cameraPushOnGiftEnabled
                ? 'bg-amber-400 text-stone-950 shadow-sm'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            {config.cameraPushOnGiftEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
          </button>
        </div>

        <div className="p-2.5 rounded-lg bg-stone-950/90 border border-stone-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Thời gian khóa bảo vệ Lễ Đặc Biệt (10+ Xu)</span>
              </div>
              <div className="text-[10px] text-stone-400">
                Mặc định 3 giây: Đảm bảo người dâng Lễ Đặc Biệt luôn được giữ khung hình tối thiểu 3s trước khi nhảy sang mục tiêu kế tiếp
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                max={30}
                step={1}
                value={config.cameraSpecialGiftLockSec ?? 3}
                onChange={(e) =>
                  onUpdateConfig({
                    cameraSpecialGiftLockSec: Math.max(
                      1,
                      Math.min(30, parseInt(e.target.value, 10) || 3)
                    ),
                  })
                }
                className="w-12 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-xs font-mono font-bold text-amber-300 text-right"
              />
              <span className="text-[11px] font-mono text-amber-300">giây</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[2, 3, 4, 5, 8].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onUpdateConfig({ cameraSpecialGiftLockSec: sec })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                  (config.cameraSpecialGiftLockSec ?? 3) === sec
                    ? 'bg-amber-400 text-stone-950 font-bold'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
              >
                {sec}s {sec === 3 ? '(Chuẩn)' : ''}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ĐỘ PHÓNG ĐẠI, TỐC ĐỘ LƯỚT & ĐIỀU CHỈNH TRỌNG TÂM KHI KHÓA CAMERA */}
      <section className="p-3 rounded-xl bg-stone-900/70 border border-stone-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>Tinh Chỉnh Zoom, Độ Mượt & Trọng Tâm Khi Khóa Camera</span>
          </h3>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                cameraFocusOffsetX: 0,
                cameraFocusOffsetY: -44,
              })
            }
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] font-semibold text-amber-300 cursor-pointer transition"
          >
            Đặt lại trọng tâm (0, -44)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 space-y-1">
            <div className="flex justify-between text-[11px] text-stone-300">
              <span>Độ Zoom gần</span>
              <span className="text-amber-300 font-mono font-bold">
                {(config.cameraZoomScale ?? 2.25).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={1.4}
              max={3.2}
              step={0.05}
              value={config.cameraZoomScale ?? 2.25}
              onChange={(e) =>
                onUpdateConfig({ cameraZoomScale: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800 space-y-1">
            <div className="flex justify-between text-[11px] text-stone-300">
              <span>Tốc độ lướt Camera</span>
              <span className="text-cyan-300 font-mono font-bold">
                {(config.cameraSmoothSpeed ?? 4.5).toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={1.5}
              max={10.0}
              step={0.5}
              value={config.cameraSmoothSpeed ?? 4.5}
              onChange={(e) =>
                onUpdateConfig({ cameraSmoothSpeed: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Điều chỉnh Trọng Tâm Camera (Offset X / Offset Y) khi khóa vào nhân vật */}
        <div className="p-2.5 rounded-lg bg-stone-950/90 border border-amber-500/30 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-amber-200">
                🎯 Trọng tâm khung hình khi khóa nhân vật (Offset X / Y)
              </div>
              <div className="text-[10px] text-stone-400">
                Dịch chuyển tâm nhìn của Camera so với vị trí đứng của nhân vật để tránh bị che bởi bảng HUD hoặc bình luận TikTok
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 font-mono text-[10px] text-amber-300 shrink-0">
              X: {config.cameraFocusOffsetX ?? 0}px · Y: {config.cameraFocusOffsetY ?? -44}px
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Trục X: Ngang */}
            <div className="p-2 rounded bg-stone-900/90 border border-stone-800 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-stone-300 font-semibold">
                  Trọng tâm Ngang (Trái ↔ Phải)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={-180}
                    max={180}
                    step={2}
                    value={config.cameraFocusOffsetX ?? 0}
                    onChange={(e) =>
                      onUpdateConfig({
                        cameraFocusOffsetX: Math.max(
                          -180,
                          Math.min(180, parseInt(e.target.value, 10) || 0)
                        ),
                      })
                    }
                    className="w-12 px-1 py-0.5 rounded bg-stone-950 border border-stone-700 text-[10.5px] font-mono font-bold text-amber-300 text-right"
                  />
                  <span className="text-[10px] font-mono text-stone-400">px</span>
                </div>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={2}
                value={config.cameraFocusOffsetX ?? 0}
                onChange={(e) =>
                  onUpdateConfig({
                    cameraFocusOffsetX: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full accent-amber-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[
                  { label: 'Lệch Trái (-60)', val: -60 },
                  { label: 'Giữa (0)', val: 0 },
                  { label: 'Lệch Phải (+60)', val: 60 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ cameraFocusOffsetX: preset.val })
                    }
                    className={`flex-1 py-0.5 px-1 rounded text-[9.5px] font-mono cursor-pointer transition ${
                      (config.cameraFocusOffsetX ?? 0) === preset.val
                        ? 'bg-amber-400 text-stone-950 font-bold'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trục Y: Dọc */}
            <div className="p-2 rounded bg-stone-900/90 border border-stone-800 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-stone-300 font-semibold">
                  Trọng tâm Dọc (Cao ↕ Thấp)
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={-220}
                    max={140}
                    step={2}
                    value={config.cameraFocusOffsetY ?? -44}
                    onChange={(e) =>
                      onUpdateConfig({
                        cameraFocusOffsetY: Math.max(
                          -220,
                          Math.min(
                            140,
                            Number.isNaN(parseInt(e.target.value, 10))
                              ? -44
                              : parseInt(e.target.value, 10)
                          )
                        ),
                      })
                    }
                    className="w-12 px-1 py-0.5 rounded bg-stone-950 border border-stone-700 text-[10.5px] font-mono font-bold text-cyan-300 text-right"
                  />
                  <span className="text-[10px] font-mono text-stone-400">px</span>
                </div>
              </div>
              <input
                type="range"
                min={-220}
                max={140}
                step={2}
                value={config.cameraFocusOffsetY ?? -44}
                onChange={(e) =>
                  onUpdateConfig({
                    cameraFocusOffsetY: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[
                  { label: 'Cao (-90)', val: -90 },
                  { label: 'Chuẩn (-44)', val: -44 },
                  { label: 'Chân (0)', val: 0 },
                  { label: 'Thấp (+40)', val: 40 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ cameraFocusOffsetY: preset.val })
                    }
                    className={`flex-1 py-0.5 px-1 rounded text-[9.5px] font-mono cursor-pointer transition ${
                      (config.cameraFocusOffsetY ?? -44) === preset.val
                        ? 'bg-cyan-400 text-stone-950 font-bold'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HÀNG CHỜ DI CHUYỂN CAMERA (CAMERA QUEUE) */}
      <section className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">
              Hàng Chờ Di Chuyển Camera ({cameraQueue.length})
            </h3>
          </div>
          {cameraQueue.length > 0 && (
            <button
              type="button"
              onClick={onClearCameraQueue}
              className="px-2 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa hàng chờ</span>
            </button>
          )}
        </div>

        {cameraQueue.length === 0 ? (
          <div className="py-4 text-center text-xs text-stone-500 bg-stone-950/60 rounded-lg border border-stone-800/70">
            Hàng chờ đang trống. Khi có nhiều người comment / dâng lễ liên tiếp, danh sách chờ sẽ hiển thị tại đây.
          </div>
        ) : (
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {cameraQueue.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-stone-950/90 border border-stone-800 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-stone-100 truncate">
                    {item.username}
                  </span>
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded shrink-0 ${
                      item.isBot
                        ? 'bg-amber-950/60 text-amber-300'
                        : 'bg-emerald-950/60 text-emerald-300'
                    }`}
                  >
                    {item.isBot ? 'NPC' : 'Người'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {getReasonBadge(item.reason)}
                  <button
                    type="button"
                    onClick={() => onFocusPilgrimNow(item.pilgrimId)}
                    title="Chuyển camera tới người này ngay lập tức"
                    className="px-1.5 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-400/40 text-[10px] font-bold text-cyan-200 cursor-pointer"
                  >
                    Zoom ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveCameraQueueItem(item.id)}
                    title="Xóa khỏi hàng chờ"
                    className="p-1 text-stone-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chọn nhanh 1 nhân vật bất kỳ đang trên sân để test khóa Camera */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              const pid = Number(e.target.value);
              if (pid) {
                onFocusPilgrimNow(pid);
                e.target.value = '';
              }
            }}
            className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
          >
            <option value="">
              🎯 Bấm chọn nhanh Phật tử trên sân để khóa Camera ({activeStagePilgrims.length} vị)...
            </option>
            {activeStagePilgrims.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username} ({p.isBot ? 'NPC' : 'Người thật'}
                {p.isVip ? ' · Ghế VIP' : ' · Ghế thường'})
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
};
