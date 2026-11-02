import React, { useState } from 'react';
import { BellRing, Check, Copy, ExternalLink, Plug, Unplug } from 'lucide-react';
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
    <div className="space-y-4">
      {/* 1. Kết nối WebSocket */}
      <section className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-stone-200">
            Kết Nối WebSocket TikTok Live
          </h2>
          <span
            className={`text-[11px] font-semibold ${
              wsStatus === 'connected'
                ? 'text-emerald-400'
                : wsStatus === 'connecting'
                ? 'text-amber-300'
                : wsStatus === 'error'
                ? 'text-rose-400'
                : 'text-stone-400'
            }`}
          >
            {wsStatus === 'connected'
              ? 'Đã kết nối Live'
              : wsStatus === 'connecting'
              ? 'Đang kết nối...'
              : wsStatus === 'error'
              ? 'Lỗi kết nối'
              : 'Giả lập'}
          </span>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => onConnectWs(wsUrl)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer transition"
          >
            <Plug className="w-3.5 h-3.5" />
            <span>Kết nối</span>
          </button>
          <button
            type="button"
            onClick={() => syncService.disconnectWebSocket()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer transition"
          >
            <Unplug className="w-3.5 h-3.5" />
            <span>Ngắt kết nối</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setWsUrl('ws://localhost:8080');
              onConnectWs('ws://localhost:8080');
            }}
            className="px-2 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-stone-700 text-[10px] text-stone-300 cursor-pointer"
          >
            Node.js (ws://localhost:8080)
          </button>
          <button
            type="button"
            onClick={() => {
              setWsUrl('ws://localhost:21213');
              onConnectWs('ws://localhost:21213');
            }}
            className="px-2 py-1 rounded bg-stone-950 hover:bg-stone-800 border border-amber-500/40 text-[10px] text-amber-300 cursor-pointer"
          >
            TikFinity (ws://localhost:21213)
          </button>
        </div>
      </section>

      {/* 2. Báo động mất kết nối */}
      <section className="p-3 rounded-xl bg-rose-950/35 border border-rose-500/45 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-rose-400 animate-pulse" />
            <h2 className="text-xs font-bold text-rose-200">
              Báo Động Khi Đứt Kết Nối / Sập Live
            </h2>
          </div>
          <button
            type="button"
            onClick={() => syncService.triggerFocusTimerAlert(true)}
            className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Test mở chuông</span>
          </button>
        </div>
        <div className="px-2.5 py-1.5 rounded bg-stone-950/90 border border-rose-500/30 font-mono text-[10.5px] text-amber-300 break-all select-all">
          https://heartsmithvn.github.io/Focus-timer/?ring=1
        </div>
      </section>

      {/* 3. Mã nguồn server.js */}
      <section className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-stone-200">
              Mã Nguồn <code className="text-amber-300">server.js</code>
            </h2>
            <p className="text-[10px] text-stone-400 font-mono mt-0.5">
              npm i tiktok-live-connector ws express cors msedge-tts
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyServer}
            className="px-2.5 py-1 rounded-md bg-stone-950 hover:bg-stone-800 border border-stone-700 text-[11px] font-semibold text-amber-300 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copiedCode ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copiedCode ? 'Đã chép' : 'Chép server.js'}</span>
          </button>
        </div>

        <pre className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-[10px] font-mono text-amber-200/90 overflow-x-auto max-h-64 leading-relaxed select-all">
          {NODE_SERVER_CODE}
        </pre>
      </section>
    </div>
  );
};
