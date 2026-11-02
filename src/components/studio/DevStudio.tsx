import React, { useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Crosshair,
  Download,
  Gamepad2,
  Maximize2,
  Move,
  PanelRightClose,
  Sliders,
  ShieldCheck,
  MapPin,
  Radio,
  RefreshCw,
  Tv,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CameraFocusState,
  CameraQueueItem,
  ControlledTargetId,
  CustomAssetsConfig,
  DevTabId,
  GameConfig,
  GridConfig,
  HudLayoutConfig,
  KneelSlot,
  PilgrimData,
  SafetyActionMode,
  SafetyCategory,
  SafetyLogEntry,
  TempleMonkData,
} from '../../types/game';
import { WsConnectionStatus } from '../../services/syncService';
import { TabControl } from './TabControl';
import { TabAudio } from './TabAudio';
import { TabNpc } from './TabNpc';
import { TabSafety } from './TabSafety';
import { TabMapEditor } from './TabMapEditor';
import { TabTikTokNode } from './TabTikTokNode';
import { TabCamera } from './TabCamera';

interface DevStudioProps {
  activeTab: DevTabId;
  onSelectTab: (tab: DevTabId) => void;
  onCloseStudio: () => void;
  isLocalTabMuted: boolean;
  onToggleLocalMute: () => void;
  wsStatus: WsConnectionStatus;
  peerCounts: { totalPeers: number; obsPeers: number };
  onConnectWs: (url: string) => void;
  config: GameConfig;
  onUpdateConfig: (patch: Partial<GameConfig>) => void;
  onUpdateGrid: (patch: Partial<GridConfig>) => void;
  onUpdateHudLayout: (patch: Partial<HudLayoutConfig>) => void;
  realCount: number;
  botCount: number;
  queueCount: number;
  grandEventProgress: number;
  ttsStatus: { text: string; active: boolean };
  onSpawnRandom: (isVip: boolean) => void;
  onSpawnBatch: (count: number) => void;
  onLeaveAll: () => void;
  onSpawnCustom: (
    username: string,
    prayer: string,
    isVip: boolean,
    coins?: number,
    avatarUrl?: string | null
  ) => void;
  onPlayBell: () => void;
  onPlayWoodenFish: () => void;
  onPanicMute: () => void;
  onTestTTS: () => void;
  onNextDharmaArticle: () => void;
  onTriggerLike: (count: number, username?: string) => void;
  onTriggerFollow: (username?: string) => void;
  onTriggerGrandEvent: () => void;
  onTriggerGiftCombo: (
    mode: 'streak_50_roses' | 'instant_50_roses' | 'multi_user_combo_storm',
    customUsername?: string,
    customPrayer?: string,
    customAvatarUrl?: string | null
  ) => void;
  pilgrims: PilgrimData[];
  monks: TempleMonkData[];
  npcNames: string[];
  npcPrayers: string[];
  npcAvatars: string[];
  controlledTarget: ControlledTargetId;
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
  safetyActionMode: SafetyActionMode;
  safetyCategories: SafetyCategory[];
  customWords: string[];
  safetyLogs: SafetyLogEntry[];
  onChangeSafetyMode: (mode: SafetyActionMode) => void;
  onToggleSafetyCategory: (key: string, enabled: boolean) => void;
  onAddCustomWords: (raw: string) => void;
  onRemoveCustomWord: (word: string) => void;
  onResetCustomWords: () => void;
  onClearSafetyLogs: () => void;
  onSpawnTrollTest: () => void;
  vipSlots: KneelSlot[];
  normalSlots: KneelSlot[];
  customAssets: CustomAssetsConfig;
  onUploadAsset: (key: keyof CustomAssetsConfig, file: File) => void;
  onResetAsset: (key: keyof CustomAssetsConfig) => void;
  onSaveBackupJson: () => void;
  onLoadBackupJson: (rawJsonText: string) => { ok: boolean; message: string };
  donorsCount?: number;
  onClearDonors?: () => void;
  eventTtsQueue: {
    waitingCount: number;
    isPlayingEvent: boolean;
    currentEventText: string | null;
    queueItems: string[];
  };
  onClearEventTtsQueue: () => void;
  cameraFocus: CameraFocusState;
  cameraQueue: CameraQueueItem[];
  onSkipCameraTarget: () => void;
  onResetCameraView: () => void;
  onClearCameraQueue: () => void;
  onRemoveCameraQueueItem: (queueId: string) => void;
  onFocusPilgrimNow: (pilgrimId: number) => void;
  onPushFullSyncToLive?: () => void;
}

export const DevStudio: React.FC<DevStudioProps> = ({
  activeTab,
  onSelectTab,
  onCloseStudio,
  isLocalTabMuted,
  onToggleLocalMute,
  wsStatus,
  peerCounts,
  onConnectWs,
  config,
  onUpdateConfig,
  onUpdateGrid,
  onUpdateHudLayout,
  realCount,
  botCount,
  queueCount,
  grandEventProgress,
  ttsStatus,
  onSpawnRandom,
  onSpawnBatch,
  onLeaveAll,
  onSpawnCustom,
  onPlayBell,
  onPlayWoodenFish,
  onPanicMute,
  onTestTTS,
  onNextDharmaArticle,
  onTriggerLike,
  onTriggerFollow,
  onTriggerGrandEvent,
  onTriggerGiftCombo,
  pilgrims,
  monks,
  npcNames,
  npcPrayers,
  npcAvatars,
  controlledTarget,
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
  safetyActionMode,
  safetyCategories,
  customWords,
  safetyLogs,
  onChangeSafetyMode,
  onToggleSafetyCategory,
  onAddCustomWords,
  onRemoveCustomWord,
  onResetCustomWords,
  onClearSafetyLogs,
  onSpawnTrollTest,
  vipSlots,
  normalSlots,
  customAssets,
  onUploadAsset,
  onResetAsset,
  onSaveBackupJson,
  onLoadBackupJson,
  donorsCount = 0,
  onClearDonors,
  eventTtsQueue,
  onClearEventTtsQueue,
  cameraFocus,
  cameraQueue,
  onSkipCameraTarget,
  onResetCameraView,
  onClearCameraQueue,
  onRemoveCameraQueueItem,
  onFocusPilgrimNow,
  onPushFullSyncToLive,
}) => {
  const [copiedObsLink, setCopiedObsLink] = useState(false);
  const [pushedLiveSync, setPushedLiveSync] = useState(false);
  const [backupNotice, setBackupNotice] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const showBackupFeedback = (ok: boolean, text: string) => {
    setBackupNotice({ ok, text });
    setTimeout(() => {
      setBackupNotice(null);
    }, 4000);
  };

  const handleTopBarSaveJson = () => {
    onSaveBackupJson();
    showBackupFeedback(true, 'Đã tải xuống file cấu hình .json!');
  };

  const handleTopBarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = onLoadBackupJson(reader.result);
        showBackupFeedback(res.ok, res.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getObsCleanUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('obs', '1');
    return url.toString();
  };

  const handleCopyObsLink = () => {
    navigator.clipboard.writeText(getObsCleanUrl());
    setCopiedObsLink(true);
    setTimeout(() => setCopiedObsLink(false), 2500);
  };

  return (
    <aside className="w-[465px] max-w-full shrink-0 h-full bg-stone-950 border-l border-stone-800 flex flex-col z-40">
      {/* Studio Top Bar */}
      <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold text-stone-100 truncate">
              Đi Chùa Online Studio
            </h1>
            <span className="text-stone-600" aria-hidden="true">·</span>
            <span className="text-[11px] text-stone-400 whitespace-nowrap">
              {wsStatus === 'connected' ? 'TikTok Live' : 'Giả lập'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() =>
              onUpdateHudLayout({ editLayoutMode: !config.hudLayout.editLayoutMode })
            }
            title="Kéo di chuyển & bấm góc chỉnh kích thước các bảng hiển thị"
            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              config.hudLayout.editLayoutMode
                ? 'bg-amber-400 text-stone-950 font-semibold'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
            }`}
          >
            <Move className="w-3 h-3" />
            <span>Sửa Bảng</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateConfig({ showZoneBounds: !config.showZoneBounds })
            }
            title="Hiện vùng giới hạn di chuyển (Bấm vào cạnh hình chữ nhật để chỉnh kích thước vùng)"
            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              config.showZoneBounds
                ? 'bg-fuchsia-400 text-stone-950 font-semibold'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
            }`}
          >
            <Maximize2 className="w-3 h-3" />
            <span>Vùng</span>
          </button>

          <button
            type="button"
            onClick={() => onUpdateConfig({ showWaypoints: !config.showWaypoints })}
            title="Ẩn/Hiện các vòng tròn vị trí (Ghế ngồi, Lư hương, Mâm quả)"
            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              config.showWaypoints
                ? 'bg-emerald-400 text-stone-950 font-semibold'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            <span>Vòng vị trí</span>
          </button>

          <button
            type="button"
            onClick={onCloseStudio}
            title="Ẩn bảng điều khiển (Phím tắt F2)"
            className="px-2 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[11px] font-medium text-stone-300 flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <PanelRightClose className="w-3 h-3" />
            <span>F2</span>
          </button>
        </div>
      </div>

      {/* Mode 3 Bar: Dual-Tab Remote Control + Save/Load JSON Backup */}
      <div className="px-4 py-2.5 bg-stone-900/70 border-b border-stone-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-stone-200 truncate">
              Điều khiển 2 Tab (OBS + Admin)
            </span>
            <span className="text-stone-600" aria-hidden="true">·</span>
            <span
              className={`text-[11px] font-mono tabular-nums whitespace-nowrap ${
                peerCounts.obsPeers > 0 ? 'text-emerald-400 font-semibold' : 'text-stone-400'
              }`}
            >
              {peerCounts.obsPeers > 0
                ? `${peerCounts.obsPeers} màn hình OBS đang mở`
                : `${peerCounts.totalPeers} tab đang mở`}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onPushFullSyncToLive && (
              <button
                type="button"
                onClick={() => {
                  onPushFullSyncToLive();
                  setPushedLiveSync(true);
                  setTimeout(() => setPushedLiveSync(false), 2000);
                }}
                title="Đẩy ngay lập tức toàn bộ vị trí bảng, ghế ngồi và cấu hình hiện tại từ trình duyệt này sang màn hình TikTok Live Studio mà không cần copy lại link"
                className="px-2 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-stone-950 text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer whitespace-nowrap"
              >
                {pushedLiveSync ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Đã đẩy sang Live!</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Đồng bộ Live</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyObsLink}
              title="Sao chép link chỉ hiển thị màn hình Game 9:16 để dán vào OBS hoặc tab thứ 2"
              className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer whitespace-nowrap"
            >
              {copiedObsLink ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Đã chép Link OBS</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Link OBS (?obs=1)</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-800/80">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTopBarSaveJson}
              title="Xuất toàn bộ cấu hình, vị trí ghế, bảng, NPC và âm thanh ra file .json"
              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-[11px] font-extrabold flex items-center gap-1 shrink-0 transition cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Download className="w-3 h-3" />
              <span>Save JSON (.json)</span>
            </button>

            <label
              title="Nạp lại file cấu hình .json đã lưu từ máy tính"
              className="px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3 h-3 text-cyan-300" />
              <span>Load JSON (.json)</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleTopBarFileChange}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onToggleLocalMute}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer whitespace-nowrap ${
              isLocalTabMuted
                ? 'bg-rose-600 text-white'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
            }`}
          >
            {isLocalTabMuted ? (
              <>
                <VolumeX className="w-3 h-3" />
                <span>Tab này: Đã tắt tiếng</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>Tab này: Có tiếng</span>
              </>
            )}
          </button>
        </div>

        {backupNotice && (
          <div
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold flex items-center justify-between ${
              backupNotice.ok
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
            }`}
          >
            <span>{backupNotice.text}</span>
          </div>
        )}
      </div>

      {/* Clean Segmented Navigation Tabs (7 Tabs) */}
      <div className="px-3 pt-3 pb-2 border-b border-stone-800 bg-stone-950">
        <div className="grid grid-cols-7 gap-1 p-1 bg-stone-900 rounded-lg border border-stone-800/80">
          <button
            type="button"
            onClick={() => onSelectTab('control')}
            className={`py-1.5 px-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'control'
                ? 'bg-stone-800 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Điều khiển</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('camera')}
            className={`py-1.5 px-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'camera'
                ? 'bg-stone-800 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Camera className="w-3 h-3" />
            <span>
              Camera{cameraQueue.length > 0 ? ` (${cameraQueue.length})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('audio')}
            className={`py-1.5 px-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'audio'
                ? 'bg-stone-800 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>Âm thanh</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('npc')}
            className={`py-1.5 px-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'npc'
                ? 'bg-stone-800 text-cyan-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Gamepad2 className="w-3 h-3" />
            <span>NPC {controlledTarget ? '●' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('safety')}
            className={`py-1.5 px-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'safety'
                ? 'bg-stone-800 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Lọc ({safetyLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('map')}
            className={`py-1.5 px-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'map'
                ? 'bg-stone-800 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <MapPin className="w-3 h-3" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('tiktok')}
            className={`py-1.5 px-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'tiktok'
                ? 'bg-stone-800 text-amber-300 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>TikTok</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'control' && (
          <TabControl
            config={config}
            realCount={realCount}
            botCount={botCount}
            queueCount={queueCount}
            grandEventProgress={grandEventProgress}
            onUpdateConfig={onUpdateConfig}
            onUpdateHudLayout={onUpdateHudLayout}
            onSpawnRandom={onSpawnRandom}
            onSpawnBatch={onSpawnBatch}
            onLeaveAll={onLeaveAll}
            onSpawnCustom={onSpawnCustom}
            onTriggerLike={onTriggerLike}
            onTriggerFollow={onTriggerFollow}
            onTriggerGrandEvent={onTriggerGrandEvent}
            onTriggerGiftCombo={onTriggerGiftCombo}
            onSaveBackupJson={onSaveBackupJson}
            onLoadBackupJson={onLoadBackupJson}
            donorsCount={donorsCount}
            onClearDonors={onClearDonors}
          />
        )}

        {activeTab === 'audio' && (
          <TabAudio
            config={config}
            ttsStatus={ttsStatus}
            eventTtsQueue={eventTtsQueue}
            onClearEventTtsQueue={onClearEventTtsQueue}
            onUpdateConfig={onUpdateConfig}
            onPlayBell={onPlayBell}
            onPlayWoodenFish={onPlayWoodenFish}
            onPanicMute={onPanicMute}
            onTestTTS={onTestTTS}
            onNextDharmaArticle={onNextDharmaArticle}
          />
        )}

        {activeTab === 'npc' && (
          <TabNpc
            config={config}
            pilgrims={pilgrims}
            monks={monks}
            npcNames={npcNames}
            npcPrayers={npcPrayers}
            npcAvatars={npcAvatars}
            controlledTarget={controlledTarget}
            onUpdateConfig={onUpdateConfig}
            onSelectControlledTarget={onSelectControlledTarget}
            onUpdateNpcNames={onUpdateNpcNames}
            onResetNpcNames={onResetNpcNames}
            onUpdateNpcPrayers={onUpdateNpcPrayers}
            onResetNpcPrayers={onResetNpcPrayers}
            onUpdateNpcAvatars={onUpdateNpcAvatars}
            onResetNpcAvatars={onResetNpcAvatars}
            onRandomizeActiveNpcAvatars={onRandomizeActiveNpcAvatars}
            onControlledWoodenFish={onControlledWoodenFish}
            onSendControlledChat={onSendControlledChat}
          />
        )}

        {activeTab === 'safety' && (
          <TabSafety
            actionMode={safetyActionMode}
            categories={safetyCategories}
            customWords={customWords}
            logs={safetyLogs}
            onChangeActionMode={onChangeSafetyMode}
            onToggleCategory={onToggleSafetyCategory}
            onAddCustomWords={onAddCustomWords}
            onRemoveCustomWord={onRemoveCustomWord}
            onResetCustomWords={onResetCustomWords}
            onClearLogs={onClearSafetyLogs}
            onSpawnTrollTest={onSpawnTrollTest}
          />
        )}

        {activeTab === 'map' && (
          <TabMapEditor
            config={config}
            vipSlots={vipSlots}
            normalSlots={normalSlots}
            customAssets={customAssets}
            onUpdateConfig={onUpdateConfig}
            onUpdateGrid={onUpdateGrid}
            onUpdateHudLayout={onUpdateHudLayout}
            onUploadAsset={onUploadAsset}
            onResetAsset={onResetAsset}
            onSaveBackupJson={onSaveBackupJson}
            onLoadBackupJson={onLoadBackupJson}
          />
        )}

        {activeTab === 'camera' && (
          <TabCamera
            config={config}
            cameraFocus={cameraFocus}
            cameraQueue={cameraQueue}
            pilgrims={pilgrims}
            onUpdateConfig={onUpdateConfig}
            onSkipCameraTarget={onSkipCameraTarget}
            onResetCameraView={onResetCameraView}
            onClearCameraQueue={onClearCameraQueue}
            onRemoveCameraQueueItem={onRemoveCameraQueueItem}
            onFocusPilgrimNow={onFocusPilgrimNow}
          />
        )}

        {activeTab === 'tiktok' && (
          <TabTikTokNode wsStatus={wsStatus} onConnectWs={onConnectWs} />
        )}
      </div>
    </aside>
  );
};

