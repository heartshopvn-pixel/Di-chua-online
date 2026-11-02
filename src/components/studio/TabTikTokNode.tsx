import React, { useState } from 'react';
import { BellRing, Check, Copy, ExternalLink, Plug } from 'lucide-react';
import { NODE_SERVER_CODE } from '../../config/constants';
import { syncService, WsConnectionStatus } from '../../services/syncService';

interface TabTikTokNodeProps {
  wsStatus: WsConnectionStatus;
  onConnectWs: (url: string) => void;
}

export const TabTikTokNode: React.FC<TabTikTokNodeProps> = ({ wsStatus, onConnectWs }) => {
  const [wsUrl, setWsUrl] = useState('ws://localhost:8080');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyServer = () => {
    navigator.clipboard.writeText(NODE_SERVER_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Section 1: WebSocket Connector */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-200">
            Kết nối WebSocket Node.js (tiktok-live-connector)
          </h2>
          <span className="text-[11px] text-stone-400">
            {wsStatus === 'connected'
              ? 'Đã kết nối Live'
              : wsStatus === 'connecting'
              ? 'Đang kết nối...'
              : wsStatus === 'error'
              ? 'Lỗi kết nối'
              : 'Chế độ giả lập'}
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => onConnectWs(wsUrl)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition"
          >
            <Plug className="w-3.5 h-3.5" />
            <span>Kết nối</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => {
              setWsUrl('ws://localhost:8080');
              onConnectWs('ws://localhost:8080');
            }}
            className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[10px] text-stone-300 cursor-pointer"
          >
            Node.js (ws://localhost:8080)
          </button>
          <button
            type="button"
            onClick={() => {
              setWsUrl('ws://localhost:21213');
              onConnectWs('ws://localhost:21213');
            }}
            className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-amber-500/40 text-[10px] text-amber-300 cursor-pointer"
          >
            TikFinity App (ws://localhost:21213)
          </button>
        </div>
      </section>

      {/* Section 1.5: Cảnh báo tự động mở Focus-timer khi đứt kết nối / sập Live */}
      <section className="p-3 rounded-xl bg-rose-950/35 border border-rose-500/45 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-rose-400 animate-pulse" />
            <h2 className="text-xs font-bold text-rose-200">
              Báo Động Tự Động Khi Node Đứt Kết Nối / Sập Live
            </h2>
          </div>
          <button
            type="button"
            onClick={() => syncService.triggerFocusTimerAlert(true)}
            className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Test mở Focus-timer</span>
          </button>
        </div>
        <p className="text-[11px] text-stone-300 leading-relaxed">
          Khi <code className="text-amber-300">server.js</code> phát hiện đứt kết nối TikTok Live (<code className="text-rose-300">disconnected</code>), kết thúc / sập phiên Live (<code className="text-rose-300">streamEnd</code>), hoặc khi cửa sổ CMD bị tắt đột ngột, hệ thống sẽ tự động bật trình duyệt mở ngay link báo động:
        </p>
        <div className="px-2.5 py-1.5 rounded bg-stone-950/90 border border-rose-500/30 font-mono text-[10.5px] text-amber-300 break-all select-all">
          https://heartsmithvn.github.io/Focus-timer/?ring=1
        </div>
      </section>

      <hr className="border-stone-800/80" />

      {/* Section 2: Quick OBS Setup Checklist */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-stone-200">Quy trình phát OBS Studio chuẩn</h2>
        <ol className="space-y-1.5 text-[11px] text-stone-300 list-decimal list-inside bg-stone-900/50 border border-stone-800 rounded-lg p-3">
          <li>
            Trong OBS, thêm <strong>Browser Source</strong> (540×960) và bấm phím{' '}
            <code className="text-amber-300">F2</code> để ẩn bảng điều khiển.
          </li>
          <li>
            Tích chọn <strong>Control audio via OBS</strong> và đặt{' '}
            <strong>Monitor Off</strong> để tiếng phát lên Live mà không dội ra loa ngoài.
          </li>
          <li>
            Trên tab Chrome điều khiển này, bật nút{' '}
            <strong>Tắt tiếng riêng Tab này</strong> ở thanh trên cùng để làm việc cá nhân.
          </li>
        </ol>
      </section>

      <hr className="border-stone-800/80" />

      {/* Section 3: Node.js Bridge Code */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-stone-200">
              Mã nguồn <code className="text-amber-300">server.js</code> (TikTok Live + Edge-TTS + Báo động Focus-timer)
            </h2>
            <p className="text-[10px] text-stone-400 font-mono mt-0.5">
              npm i tiktok-live-connector ws express cors msedge-tts
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyServer}
            className="px-2.5 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] font-semibold text-amber-300 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copiedCode ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copiedCode ? 'Đã chép server.js' : 'Chép server.js'}</span>
          </button>
        </div>

        <pre className="p-3 rounded-lg bg-stone-900 border border-stone-800 text-[10px] font-mono text-amber-200/90 overflow-x-auto max-h-64 leading-relaxed select-all">
          {NODE_SERVER_CODE}
        </pre>
      </section>
    </div>
  );
};
