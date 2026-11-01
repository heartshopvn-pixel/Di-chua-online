import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Connected SSE clients (Admin Tabs + OBS Browser Source Windows)
  const clients = new Set<{ id: string; role: string; res: Response }>();

  const broadcastPeerCount = () => {
    const obsCount = Array.from(clients).filter((c) => c.role === 'obs').length;
    const totalCount = clients.size;
    const msg = `data: ${JSON.stringify({
      type: 'PEER_STATUS',
      totalPeers: totalCount,
      obsPeers: obsCount,
    })}\n\n`;
    clients.forEach((c) => {
      try {
        c.res.write(msg);
      } catch {
        // Ignore write error
      }
    });
  };

  // Real-time SSE Stream for syncing Admin Tab -> OBS Browser Source (?obs=1)
  app.get('/api/sync-stream', (req: Request, res: Response) => {
    const clientId = String(req.query.clientId || Math.random());
    const role = String(req.query.role || 'admin');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientObj = { id: clientId, role, res };
    clients.add(clientObj);
    broadcastPeerCount();

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        // Ignore
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAlive);
      clients.delete(clientObj);
      broadcastPeerCount();
    });
  });

  // Receive command from Admin Tab and broadcast to all OBS / Live screens
  app.post('/api/sync-command', (req: Request, res: Response) => {
    const { senderId, packet } = req.body || {};
    if (!packet) {
      res.status(400).json({ ok: false });
      return;
    }

    const payloadStr = `data: ${JSON.stringify(packet)}\n\n`;
    clients.forEach((c) => {
      if (c.id !== senderId) {
        try {
          c.res.write(payloadStr);
        } catch {
          // Ignore
        }
      }
    });

    res.json({ ok: true, deliveredTo: Math.max(0, clients.size - 1) });
  });

  // Built-in TTS Audio Proxy for OBS Browser Source compatibility
  app.get('/api/tts', async (req: Request, res: Response) => {
    try {
      const text = String(req.query.text || 'Nam mô A Di Đà Phật').slice(0, 200);
      const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(
        text
      )}`;
      const response = await fetch(gUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        res.status(502).end();
        return;
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch {
      res.status(500).end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
