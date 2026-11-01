import React, { useState } from 'react';
import { Check, Copy, Plug } from 'lucide-react';
import { NODE_SERVER_CODE } from '../../config/constants';
import { WsConnectionStatus } from '../../services/syncService';

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
              Mã nguồn <code className="text-amber-300">server.js</code> (TikTok Live + Edge-TTS)
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
