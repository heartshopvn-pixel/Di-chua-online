import { CameraFocusReason, GameConfig } from '../types/game';

export type TTSStatusListener = (
  statusText: string,
  active: boolean,
  spokenText?: string
) => void;

export interface TTSQueueItemMeta {
  pilgrimId?: number;
  username?: string;
  reason?: CameraFocusReason;
  isBot?: boolean;
}

export interface TTSQueueItem {
  id: string;
  text: string;
  isPriority: boolean;
  addedAt: number;
  meta?: TTSQueueItemMeta;
}

export interface EventTtsQueueSnapshot {
  waitingCount: number;
  isPlayingEvent: boolean;
  currentEventText: string;
  queueItems: string[];
  activeItem: TTSQueueItem | null;
  detailedQueue: TTSQueueItem[];
}

export type EventTtsQueueListener = (snapshot: EventTtsQueueSnapshot) => void;

export type DharmaArticleChangeListener = (nextArticleId: string) => void;

/**
 * Làm sạch comment trước khi đưa vào TTS:
 * 1. Loại bỏ toàn bộ icon / emoji / ký tự biểu tượng để tránh TTS đọc tên icon dài dòng gây trễ camera.
 * 2. Thu gọn các từ/cụm từ bị spam lặp lại liên tiếp trong cùng 1 câu.
 * 3. Giới hạn tối đa maxWords chữ trong câu đọc.
 */
export function sanitizeAndLimitSpeechText(
  rawText: string,
  maxWords = 25
): string {
  if (!rawText) return '';
  // Bỏ emoji, pictographs, dingbats, variation selectors
  let cleaned = String(rawText)
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u2600-\u27BF\uFE00-\uFE0F\u200D]/gu,
      ' '
    )
    .replace(/[~`!@#$%^&*()_+={}[\]|\\:;"'<>/]+/g, ' ')
    .replace(/([.,?-])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  // Thu gọn từ hoặc cụm 2-3 từ lặp lại liên tiếp (VD: "xin lộc xin lộc xin lộc" -> "xin lộc")
  const rawWords = cleaned.split(/\s+/).filter(Boolean);
  const dedupedWords: string[] = [];
  for (let i = 0; i < rawWords.length; i++) {
    const w = rawWords[i];
    const prev1 = dedupedWords[dedupedWords.length - 1];
    const prev2 = dedupedWords[dedupedWords.length - 2];
    if (
      prev1 &&
      prev2 &&
      w.toLowerCase() === prev1.toLowerCase() &&
      w.toLowerCase() === prev2.toLowerCase()
    ) {
      continue;
    }
    dedupedWords.push(w);
  }

  // Kiểm tra lặp cụm nửa câu (VD copy-paste 2-3 lần cùng 1 mệnh đề trong 1 comment)
  let collapsed = dedupedWords.join(' ');
  collapsed = collapsed.replace(
    /\b(\S+(?:\s+\S+){1,5})(?:\s+\1\b)+/gi,
    '$1'
  );

  const finalWords = collapsed.split(/\s+/).filter(Boolean);
  const limit = Math.max(3, Math.min(100, Number(maxWords) || 25));
  if (finalWords.length > limit) {
    return finalWords.slice(0, limit).join(' ');
  }
  return finalWords.join(' ');
}

function splitDharmaIntoSentences(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];
  const parts = rawText
    .split(/(?<=[.!?;\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [rawText.trim()];

  // Chia nhỏ thêm nếu có câu quá dài (>180 ký tự) để đọc tự nhiên và hiện bong bóng chat Trụ trì vừa vặn
  const result: string[] = [];
  for (const p of parts) {
    if (p.length <= 180) {
      result.push(p);
    } else {
      const sub = p
        .split(/(?<=[,，])\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
      let acc = '';
      for (const chunk of sub) {
        if ((acc + ' ' + chunk).trim().length <= 160) {
          acc = (acc ? acc + ', ' : '') + chunk;
        } else {
          if (acc) result.push(acc);
          acc = chunk;
        }
      }
      if (acc) result.push(acc);
    }
  }
  return result.length > 0 ? result : [rawText.trim()];
}

class TempleSoundService {
  private ctx: AudioContext | null = null;
  private ttsQueue: TTSQueueItem[] = [];
  private activeEventItem: TTSQueueItem | null = null;
  private isSpeaking = false;
  private isSpeakingDharma = false;
  private currentEventText = '';
  private currentAudio: HTMLAudioElement | null = null;
  private speechTokenSeq = 0;
  private mutedSimTimer: ReturnType<typeof setTimeout> | null = null;
  private recentSpokenMap = new Map<string, number>();
  private statusListeners = new Set<TTSStatusListener>();
  private queueListeners = new Set<EventTtsQueueListener>();
  private dharmaChangeListeners = new Set<DharmaArticleChangeListener>();

  // Nhạc nền (BGM) state
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmUrl: string | null = null;
  private synthBgmInterval: ReturnType<typeof setInterval> | null = null;
  private activeSynthPreset: string | null = null;

  // Chế độ kể chuyện / thuyết pháp state
  private dharmaIndex = 0;
  private lastDharmaArticleId = '';
  private lastDharmaContent = '';
  private dharmaNextTimer: ReturnType<typeof setTimeout> | null = null;
  private latestConfig: GameConfig | null = null;

  private localTabMuted = (() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('obs') === '1' || p.get('view') === 'live') {
        return false; // OBS Live screen always has audio enabled
      }
    }
    return sessionStorage.getItem('chua_silent_admin_tab') === 'true';
  })();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        try {
          if (this.ctx && this.ctx.state === 'suspended') {
            void this.ctx.resume();
          }
          if (this.bgmAudio && this.bgmAudio.paused && this.latestConfig?.bgmEnabled && !this.localTabMuted) {
            void this.bgmAudio.play().catch(() => {});
          }
        } catch {
          // Ignore
        }
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private reverbImpulseBuffer: AudioBuffer | null = null;

  private getReverbImpulse(): AudioBuffer | null {
    this.initCtx();
    if (!this.ctx) return null;
    if (this.reverbImpulseBuffer) return this.reverbImpulseBuffer;
    try {
      const rate = this.ctx.sampleRate;
      const length = Math.floor(rate * 1.8);
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2.4);
          data[i] = (Math.random() * 2 - 1) * decay * 0.55;
        }
      }
      this.reverbImpulseBuffer = impulse;
      return impulse;
    } catch {
      return null;
    }
  }

  private audioBlobCache = new Map<string, string>();
  private inFlightPrefetches = new Map<string, Promise<string | null>>();
  private readonly MAX_BLOB_CACHE = 45;

  private getOrFetchAudioBlobUrl(url: string, timeoutMs = 2400): Promise<string | null> {
    const cached = this.audioBlobCache.get(url);
    if (cached) {
      this.audioBlobCache.delete(url);
      this.audioBlobCache.set(url, cached);
      return Promise.resolve(cached);
    }
    const existingPromise = this.inFlightPrefetches.get(url);
    if (existingPromise) return existingPromise;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const p = fetch(url, { signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timer);
        if (!res.ok) return null;
        const blob = await res.blob();
        if (!blob || blob.size < 128) return null;
        const blobUrl = URL.createObjectURL(blob);
        if (this.audioBlobCache.size >= this.MAX_BLOB_CACHE) {
          const oldestKey = this.audioBlobCache.keys().next().value;
          if (oldestKey) {
            const oldBlobUrl = this.audioBlobCache.get(oldestKey);
            if (oldBlobUrl) {
              try {
                URL.revokeObjectURL(oldBlobUrl);
              } catch {
                // Ignore
              }
            }
            this.audioBlobCache.delete(oldestKey);
          }
        }
        this.audioBlobCache.set(url, blobUrl);
        return blobUrl;
      })
      .catch(() => {
        clearTimeout(timer);
        return null;
      })
      .finally(() => {
        this.inFlightPrefetches.delete(url);
      });

    this.inFlightPrefetches.set(url, p);
    return p;
  }

  private buildStreamUrlForEngine(text: string, config: GameConfig): string | null {
    const shortText = text.slice(0, 195);
    const voice = config.nodeVoice || 'google-vi-gtx';
    if (config.ttsEngine === 'google_stream') {
      return `/api/tts?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(shortText)}`;
    }
    if (config.ttsEngine === 'node_edge') {
      const endpoint = config.nodeTtsEndpoint || 'http://localhost:3000/tts';
      return `${endpoint}?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(shortText)}`;
    }
    return null;
  }

  private prefetchNextQueueItems(config: GameConfig) {
    if (this.localTabMuted) return;
    if (config.ttsEngine !== 'google_stream' && config.ttsEngine !== 'node_edge') return;
    const upcoming = this.ttsQueue.slice(0, 2);
    for (const item of upcoming) {
      const streamUrl = this.buildStreamUrlForEngine(item.text, config);
      if (streamUrl) {
        void this.getOrFetchAudioBlobUrl(streamUrl, 3000);
      }
    }
  }

  /**
   * Chuẩn hóa âm lượng đồng đều 100% (Chống lúc lớn lúc nhỏ) bằng DynamicsCompressorNode
   * kết hợp bộ lọc âm sắc ấm (Warm EQ) và tiếng vang Chánh Điện (Convolver Reverb)
   */
  private attachVoiceProcessingGraph(
    audio: HTMLAudioElement,
    config: GameConfig
  ) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const source = this.ctx.createMediaElementSource(audio);

      // 1. Bộ lọc âm sắc (Tone Shaping EQ theo cao độ / giọng ấm)
      const toneFilter = this.ctx.createBiquadFilter();
      const isWarmVoice =
        config.nodeVoice === 'google-vi-warm' || (config.ttsPitch ?? 1) < 0.92;
      if (isWarmVoice) {
        toneFilter.type = 'lowshelf';
        toneFilter.frequency.value = 320;
        toneFilter.gain.value = 3.5;
      } else {
        toneFilter.type = 'peaking';
        toneFilter.frequency.value = 2400;
        toneFilter.Q.value = 1.0;
        toneFilter.gain.value = 1.8; // Tăng độ rõ chữ tiếng Việt
      }

      // 2. Bộ cân bằng âm lượng tự động (Dynamics Compressor - Triệt tiêu lúc to lúc nhỏ)
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 18;
      compressor.ratio.value = 4.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;

      // 3. Makeup Gain để bù âm lượng chuẩn sau nén
      const masterGain = this.ctx.createGain();
      masterGain.gain.value = Math.max(0.1, Math.min(1.5, (config.ttsVolume ?? 1) * 1.28));

      source.connect(toneFilter);
      toneFilter.connect(compressor);
      compressor.connect(masterGain);

      const wetLevel = Math.max(0, Math.min(1, config.ttsReverb ?? 0));
      const impulse = wetLevel > 0.01 ? this.getReverbImpulse() : null;

      if (impulse && wetLevel > 0.01) {
        const dryGain = this.ctx.createGain();
        const wetGain = this.ctx.createGain();
        const convolver = this.ctx.createConvolver();
        convolver.buffer = impulse;

        dryGain.gain.value = 1.0;
        wetGain.gain.value = wetLevel * 0.85;

        masterGain.connect(dryGain);
        dryGain.connect(this.ctx.destination);

        masterGain.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(this.ctx.destination);
      } else {
        masterGain.connect(this.ctx.destination);
      }
    } catch {
      // Ignore if MediaElementSource cannot attach
    }
  }

  private playSubtleTempleReverbAmbience(reverbAmount: number, volume: number) {
    const wet = Math.max(0, Math.min(1, reverbAmount || 0));
    if (wet <= 0.02 || this.localTabMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [220, 329.63, 440];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        const peak = 0.032 * wet * volume / (idx + 1);
        gain.gain.setValueAtTime(0.0002, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6 + wet * 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.7 + wet * 1.2);
      });
    } catch {
      // Ignore
    }
  }

  public isTabMuted(): boolean {
    return this.localTabMuted;
  }

  public setTabMuted(muted: boolean) {
    this.localTabMuted = muted;
    sessionStorage.setItem('chua_silent_admin_tab', muted ? 'true' : 'false');
    if (muted) {
      this.stopBgmInternal();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (this.currentAudio) {
        try {
          this.currentAudio.onended = null;
          this.currentAudio.onerror = null;
          this.currentAudio.pause();
          this.currentAudio.removeAttribute('src');
          this.currentAudio = null;
        } catch {
          // Ignore
        }
      }
    } else if (this.latestConfig) {
      this.syncConfig(this.latestConfig);
    }
  }

  public subscribeStatus(fn: TTSStatusListener) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  public subscribeEventQueue(fn: EventTtsQueueListener) {
    this.queueListeners.add(fn);
    fn(this.getEventQueueSnapshot());
    return () => this.queueListeners.delete(fn);
  }

  public getEventQueueSnapshot(): EventTtsQueueSnapshot {
    const isPlayingEvent = this.isSpeaking && !this.isSpeakingDharma;
    return {
      waitingCount: this.ttsQueue.length,
      isPlayingEvent,
      currentEventText: isPlayingEvent ? this.currentEventText : '',
      queueItems: this.ttsQueue.map((item) => item.text),
      activeItem: isPlayingEvent ? this.activeEventItem : null,
      detailedQueue: [...this.ttsQueue],
    };
  }

  private emitEventQueue() {
    const snap = this.getEventQueueSnapshot();
    this.queueListeners.forEach((fn) => fn(snap));
  }

  public clearEventQueue() {
    this.ttsQueue = [];
    if (this.isSpeaking && !this.isSpeakingDharma) {
      this.stopCurrentUtteranceOnly();
      if (this.latestConfig?.dharmaEnabled) {
        this.scheduleNextDharmaStep(250);
      }
    }
    this.emitEventQueue();
  }

  public skipCurrentEvent(config?: GameConfig) {
    const cfg = config || this.latestConfig;
    if (this.isSpeaking && !this.isSpeakingDharma) {
      this.stopCurrentUtteranceOnly();
      if (cfg) {
        this.processQueue(cfg);
      }
    } else if (this.ttsQueue.length > 0 && cfg) {
      this.processQueue(cfg);
    } else {
      this.emitEventQueue();
    }
  }

  public removeEventQueueItemById(id: string) {
    this.ttsQueue = this.ttsQueue.filter((item) => item.id !== id);
    this.emitEventQueue();
  }

  public subscribeDharmaArticleChange(fn: DharmaArticleChangeListener) {
    this.dharmaChangeListeners.add(fn);
    return () => this.dharmaChangeListeners.delete(fn);
  }

  private emitStatus(text: string, active: boolean, spokenText?: string) {
    this.statusListeners.forEach((fn) => fn(text, active, spokenText));
  }

  private emitDharmaArticleChange(nextArticleId: string) {
    this.dharmaChangeListeners.forEach((fn) => fn(nextArticleId));
  }

  public getBusyState(): boolean {
    return this.isSpeaking || this.ttsQueue.length > 0;
  }

  /**
   * Đồng bộ cấu hình Nhạc nền & Thuyết pháp khi config thay đổi
   */
  public syncConfig(config: GameConfig) {
    const prevDharmaEnabled = this.latestConfig?.dharmaEnabled;
    const prevActiveDharmaId = this.latestConfig?.activeDharmaId;
    this.latestConfig = config;

    this.syncBgm(config);

    // Nếu tắt chế độ thuyết pháp khi đang đọc thuyết pháp -> ngắt câu thuyết pháp hiện tại ngay
    if (prevDharmaEnabled && !config.dharmaEnabled) {
      if (this.dharmaNextTimer) {
        clearTimeout(this.dharmaNextTimer);
        this.dharmaNextTimer = null;
      }
      if (this.isSpeakingDharma) {
        this.stopCurrentUtteranceOnly();
      }
    } else if (config.dharmaEnabled) {
      if (prevActiveDharmaId && prevActiveDharmaId !== config.activeDharmaId) {
        this.dharmaIndex = 0;
        if (this.isSpeakingDharma) {
          this.stopCurrentUtteranceOnly();
        }
      }
      if (!this.isSpeaking && this.ttsQueue.length === 0) {
        this.scheduleNextDharmaStep(200);
      }
    }
  }

  private stopCurrentUtteranceOnly() {
    this.speechTokenSeq++;
    this.isSpeaking = false;
    this.isSpeakingDharma = false;
    this.currentEventText = '';
    this.activeEventItem = null;
    if (this.mutedSimTimer) {
      clearTimeout(this.mutedSimTimer);
      this.mutedSimTimer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
        this.currentAudio = null;
      } catch {
        // Ignore
      }
    }
    this.emitStatus('Sẵn sàng', false, '');
    this.emitEventQueue();
  }

  private stopBgmInternal() {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio = null;
      } catch {
        // Ignore
      }
    }
    this.currentBgmUrl = null;
    if (this.synthBgmInterval) {
      clearInterval(this.synthBgmInterval);
      this.synthBgmInterval = null;
    }
    this.activeSynthPreset = null;
  }

  public syncBgm(config: GameConfig) {
    if (!config.bgmEnabled || this.localTabMuted) {
      this.stopBgmInternal();
      return;
    }

    const tracks = config.bgmTracks || [];
    const activeTrack =
      tracks.find((t) => t.id === config.activeBgmTrackId) || tracks[0];
    if (!activeTrack) {
      this.stopBgmInternal();
      return;
    }

    const vol = Math.max(0.05, Math.min(1, config.bgmVolume ?? 0.4));

    if (activeTrack.url) {
      // Phát file MP3 người dùng chọn
      if (this.synthBgmInterval) {
        clearInterval(this.synthBgmInterval);
        this.synthBgmInterval = null;
        this.activeSynthPreset = null;
      }
      if (this.currentBgmUrl !== activeTrack.url || !this.bgmAudio) {
        if (this.bgmAudio) {
          try {
            this.bgmAudio.pause();
          } catch {
            // Ignore
          }
        }
        const audio = new Audio(activeTrack.url);
        audio.loop = true;
        audio.volume = vol;
        this.bgmAudio = audio;
        this.currentBgmUrl = activeTrack.url;
        audio.play().catch(() => {
          // Chờ tương tác người dùng đầu tiên
        });
      } else {
        this.bgmAudio.volume = vol;
        if (this.bgmAudio.paused) {
          this.bgmAudio.play().catch(() => {});
        }
      }
    } else {
      // Phát nhạc thiền định mặc định bằng WebAudio (khi chưa nạp file MP3 ngoài)
      if (this.bgmAudio) {
        try {
          this.bgmAudio.pause();
          this.bgmAudio = null;
        } catch {
          // Ignore
        }
        this.currentBgmUrl = null;
      }
      const preset = activeTrack.presetType || 'zen_bowl';
      if (this.activeSynthPreset !== preset || !this.synthBgmInterval) {
        if (this.synthBgmInterval) clearInterval(this.synthBgmInterval);
        this.activeSynthPreset = preset;
        this.playZenAmbientNote(preset, vol);
        this.synthBgmInterval = setInterval(() => {
          if (!this.latestConfig?.bgmEnabled || this.localTabMuted) return;
          const latestVol = Math.max(
            0.05,
            Math.min(1, this.latestConfig?.bgmVolume ?? 0.4)
          );
          this.playZenAmbientNote(preset, latestVol);
        }, 2800);
      }
    }
  }

  private playZenAmbientNote(preset: string, volume: number) {
    if (this.localTabMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const pentatonic =
        preset === 'lotus_flute'
          ? [293.66, 329.63, 392.0, 440.0, 523.25, 587.33]
          : [196.0, 220.0, 261.63, 293.66, 329.63, 392.0];
      const baseFreq = pentatonic[Math.floor(Math.random() * pentatonic.length)];

      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      subOsc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      subOsc.frequency.setValueAtTime(baseFreq * 1.5, now);

      const peak = 0.08 * volume;
      gain.gain.setValueAtTime(0.0005, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 3.4);

      osc.connect(gain);
      subOsc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + 3.5);
      subOsc.stop(now + 3.5);
    } catch {
      // Ignore audio unlock errors
    }
  }

  public playBell(volume = 1.0, customMp3Url?: string | null, forcePlay = false) {
    if (this.localTabMuted) return;
    const cfg = this.latestConfig;
    if (!forcePlay && cfg && !cfg.bellEnabled) return;

    const mp3Url = customMp3Url !== undefined ? customMp3Url : cfg?.bellMp3Url;
    if (mp3Url) {
      try {
        const audio = new Audio(mp3Url);
        audio.volume = Math.max(0.05, Math.min(1, volume));
        audio.play().catch(() => {});
        return;
      } catch {
        // Fallback to synth bell
      }
    }

    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [261.6, 523.2, 784.0, 1046.5];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);

        const startGain = (0.28 / (idx + 1)) * volume;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(startGain, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6 - idx * 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 3.7);
      });
    } catch {
      // Ignore audio unlock errors before first interaction
    }
  }

  public playWoodenFish(volume = 1.0, customMp3Url?: string | null, forcePlay = false) {
    if (this.localTabMuted) return;
    const cfg = this.latestConfig;
    if (!forcePlay && cfg && !cfg.woodenFishEnabled) return;

    const mp3Url =
      customMp3Url !== undefined ? customMp3Url : cfg?.woodenFishMp3Url;
    if (mp3Url) {
      try {
        const audio = new Audio(mp3Url);
        audio.volume = Math.max(0.05, Math.min(1, volume));
        audio.play().catch(() => {});
        return;
      } catch {
        // Fallback to synth wooden fish
      }
    }

    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(590, now);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.085);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32 * volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio unlock errors
    }
  }

  public stopImmediate() {
    this.speechTokenSeq++;
    this.ttsQueue = [];
    this.activeEventItem = null;
    this.isSpeaking = false;
    this.isSpeakingDharma = false;
    this.currentEventText = '';
    if (this.mutedSimTimer) {
      clearTimeout(this.mutedSimTimer);
      this.mutedSimTimer = null;
    }
    if (this.dharmaNextTimer) {
      clearTimeout(this.dharmaNextTimer);
      this.dharmaNextTimer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
        this.currentAudio = null;
      } catch {
        // Ignore
      }
    }
    this.emitStatus('Đã ngắt đọc', false, '');
    this.emitEventQueue();
  }

  /**
   * Định dạng mẫu câu sự kiện có chứa [Tên] / {name} và [Comment] / {prayer}
   * Tích hợp tự động lọc icon spam & giới hạn số chữ tối đa (maxWords)
   */
  public formatEventTemplate(
    template: string,
    username: string,
    comment = '',
    maxWords?: number
  ): string {
    const limit =
      maxWords ?? this.latestConfig?.maxTtsWords ?? 25;
    const cleanComment = comment
      ? sanitizeAndLimitSpeechText(comment, limit)
      : '';
    const safeTpl = (template || '').trim();
    if (!safeTpl) return `${username} ${cleanComment}`.trim();
    return safeTpl
      .replace(/\[Tên\]|\[tên\]|\[Ten\]|\[ten\]|\{name\}/g, username)
      .replace(/\[Comment\]|\[comment\]|\{prayer\}|\{comment\}/g, cleanComment)
      .replace(/\s+/g, ' ')
      .trim();
  }

  public formatPrayerSpeech(
    username: string,
    prayer: string,
    isVip: boolean,
    template: string,
    maxWords?: number
  ): string {
    const tpl = template || '[Tên] cầu nguyện: [Comment]';
    const prefix = isVip ? 'Nam mô A Di Đà Phật. ' : '';
    return prefix + this.formatEventTemplate(tpl, username, prayer, maxWords);
  }

  public enqueueTTS(
    text: string,
    isPriority: boolean,
    config: GameConfig,
    meta?: TTSQueueItemMeta
  ) {
    this.latestConfig = config;
    const cleanText = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    // Chống đọc lặp 2 lần cùng 1 câu do lag mạng hoặc sự kiện trùng lặp trong 6 giây
    const normKey = cleanText.toLowerCase();
    const now = Date.now();
    for (const [k, t] of this.recentSpokenMap.entries()) {
      if (now - t > 6500) {
        this.recentSpokenMap.delete(k);
      }
    }
    if (
      !meta?.reason ||
      meta.reason !== 'manual'
    ) {
      const lastSpokenAt = this.recentSpokenMap.get(normKey);
      if (lastSpokenAt && now - lastSpokenAt < 6000) {
        return;
      }
      if (
        this.currentEventText.trim().toLowerCase() === normKey ||
        this.ttsQueue.some((item) => item.text.trim().toLowerCase() === normKey)
      ) {
        return;
      }
    }
    this.recentSpokenMap.set(normKey, now);

    const queueItem: TTSQueueItem = {
      id: `tts_${now}_${Math.random().toString(36).slice(2, 7)}`,
      text: cleanText,
      isPriority,
      addedAt: now,
      meta,
    };

    // Khi hàng chờ đạt giới hạn (mặc định 30) thì xóa sạch hàng chờ cũ để đảm bảo bình luận luôn tươi mới
    const maxQueueSize = Math.max(1, Math.min(200, config.maxTtsQueueSize ?? 30));
    if (this.ttsQueue.length >= maxQueueSize) {
      this.ttsQueue = [];
    }

    if (isPriority) {
      // Đẩy lên đầu hàng chờ nhưng xếp theo thứ tự giữa các câu ưu tiên
      const firstNonPriorityIdx = this.ttsQueue.findIndex((q) => !q.isPriority);
      if (firstNonPriorityIdx === -1) {
        this.ttsQueue.push(queueItem);
      } else {
        this.ttsQueue.splice(firstNonPriorityIdx, 0, queueItem);
      }
    } else {
      this.ttsQueue.push(queueItem);
    }

    // Nếu đang đọc bài thuyết pháp (Dharma) thì ngắt thuyết pháp ngay lập tức để nhường câu cầu nguyện/dâng lễ đọc luôn, tránh chồng âm thanh
    if (this.dharmaNextTimer) {
      clearTimeout(this.dharmaNextTimer);
      this.dharmaNextTimer = null;
    }
    if (this.isSpeakingDharma) {
      this.stopCurrentUtteranceOnly();
    }

    this.prefetchNextQueueItems(config);
    this.emitEventQueue();
    this.processQueue(config);
  }

  private scheduleNextDharmaStep(delayMs = 350) {
    if (this.dharmaNextTimer) {
      clearTimeout(this.dharmaNextTimer);
    }
    this.dharmaNextTimer = setTimeout(() => {
      this.dharmaNextTimer = null;
      if (this.latestConfig) {
        this.processQueue(this.latestConfig);
      }
    }, delayMs);
  }

  public skipToNextDharmaArticle(config: GameConfig): string | null {
    const articles = config.dharmaArticles || [];
    if (articles.length === 0) return null;
    const curIdx = articles.findIndex((a) => a.id === config.activeDharmaId);
    const nextIdx = curIdx >= 0 ? (curIdx + 1) % articles.length : 0;
    const nextArticle = articles[nextIdx];
    this.dharmaIndex = 0;
    this.lastDharmaArticleId = nextArticle.id;
    this.lastDharmaContent = nextArticle.content;
    if (this.latestConfig) {
      this.latestConfig = {
        ...this.latestConfig,
        activeDharmaId: nextArticle.id,
      };
    }
    if (this.isSpeakingDharma) {
      this.stopCurrentUtteranceOnly();
      this.scheduleNextDharmaStep(150);
    }
    this.emitDharmaArticleChange(nextArticle.id);
    return nextArticle.id;
  }

  private getNextDharmaSentence(config: GameConfig): string | null {
    if (!config.dharmaEnabled) return null;
    const articles = config.dharmaArticles || [];
    let activeIdx = articles.findIndex((a) => a.id === config.activeDharmaId);
    if (activeIdx < 0) activeIdx = 0;
    let active = articles[activeIdx];
    if (!active || !active.content.trim()) return null;

    if (
      this.lastDharmaArticleId !== active.id ||
      this.lastDharmaContent !== active.content
    ) {
      this.lastDharmaArticleId = active.id;
      this.lastDharmaContent = active.content;
      this.dharmaIndex = 0;
    }

    let sentences = splitDharmaIntoSentences(active.content);
    if (sentences.length === 0) return null;

    if (this.dharmaIndex >= sentences.length) {
      if ((config.dharmaAutoNext ?? true) && articles.length > 1) {
        const nextIdx = (activeIdx + 1) % articles.length;
        const nextArticle = articles[nextIdx];
        if (nextArticle && nextArticle.content.trim()) {
          active = nextArticle;
          this.lastDharmaArticleId = active.id;
          this.lastDharmaContent = active.content;
          this.dharmaIndex = 0;
          if (this.latestConfig) {
            this.latestConfig = {
              ...this.latestConfig,
              activeDharmaId: active.id,
            };
          }
          this.emitDharmaArticleChange(active.id);
          sentences = splitDharmaIntoSentences(active.content);
        } else {
          this.dharmaIndex = 0;
        }
      } else {
        this.dharmaIndex = 0;
      }
    }

    if (sentences.length === 0) return null;
    const line = sentences[this.dharmaIndex];
    this.dharmaIndex = this.dharmaIndex + 1;
    return line;
  }

  private processQueue(config: GameConfig) {
    if (this.isSpeaking) return;

    let nextItem: TTSQueueItem | null = null;
    let nextText: string | null = null;
    let isDharmaLine = false;

    if (this.ttsQueue.length > 0) {
      nextItem = this.ttsQueue.shift()!;
      nextText = nextItem.text;
      isDharmaLine = false;
    } else if (config.dharmaEnabled && !this.localTabMuted) {
      nextText = this.getNextDharmaSentence(config);
      isDharmaLine = true;
    }

    if (!nextText) {
      this.activeEventItem = null;
      this.emitEventQueue();
      return;
    }

    const token = ++this.speechTokenSeq;
    let finishedOnce = false;

    // Dọn dẹp triệt để tiến trình phát cũ (nếu có) trước khi phát câu mới để tuyệt đối không bao giờ bị chồng 2 giọng
    if (this.dharmaNextTimer) {
      clearTimeout(this.dharmaNextTimer);
      this.dharmaNextTimer = null;
    }
    if (this.mutedSimTimer) {
      clearTimeout(this.mutedSimTimer);
      this.mutedSimTimer = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.removeAttribute('src');
        this.currentAudio = null;
      } catch {
        // Ignore
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.isSpeaking = true;
    this.isSpeakingDharma = isDharmaLine;
    this.activeEventItem = isDharmaLine ? null : nextItem;
    this.currentEventText = isDharmaLine ? '' : nextText;
    this.emitStatus(
      isDharmaLine ? 'Đang thuyết pháp...' : 'Đang đọc sự kiện...',
      true,
      nextText
    );
    this.emitEventQueue();

    // Tải trước (Pre-fetch) câu kế tiếp trong hàng chờ vào RAM ngay khi bắt đầu đọc câu hiện tại (triệt tiêu độ trễ mạng giữa các câu)
    this.prefetchNextQueueItems(config);

    const finish = () => {
      if (finishedOnce || token !== this.speechTokenSeq) return;
      finishedOnce = true;

      this.isSpeaking = false;
      this.isSpeakingDharma = false;
      this.currentEventText = '';
      this.activeEventItem = null;
      const latestCfg = this.latestConfig || config;
      const hasMore =
        this.ttsQueue.length > 0 || Boolean(latestCfg.dharmaEnabled);
      if (!hasMore) {
        this.emitStatus('Sẵn sàng', false, '');
      }
      this.emitEventQueue();
      this.scheduleNextDharmaStep(isDharmaLine ? 380 : 80);
    };

    // Nếu tab hiện tại đang tắt tiếng cục bộ (Mute Tab Admin), vẫn giữ nhịp thời gian đọc tương ứng số chữ để Camera trên Tab Admin di chuyển khớp 1:1
    if (this.localTabMuted) {
      const wordCount = nextText.split(/\s+/).filter(Boolean).length;
      const simDurationMs = Math.max(
        2200,
        Math.min(8500, Math.round((wordCount * 310) / Math.max(0.7, config.ttsRate || 1)))
      );
      this.mutedSimTimer = setTimeout(finish, simDurationMs);
      return;
    }

    if (config.ttsEngine === 'node_edge') {
      this.playViaNodeEdge(nextText, config, token, finish);
    } else if (config.ttsEngine === 'google_stream') {
      this.playViaGoogleStream(nextText, config, token, finish);
    } else if (config.ttsEngine === 'monk_zen') {
      this.playWoodenFish(config.ttsVolume);
      this.playViaWebSpeech(nextText, config, token, finish, {
        rate: 0.88,
        pitch: 0.72,
      });
    } else {
      this.playViaWebSpeech(nextText, config, token, finish);
    }
  }

  private playViaNodeEdge(
    text: string,
    config: GameConfig,
    token: number,
    onDone: () => void
  ) {
    const shortText = text.slice(0, 195);
    const voice = config.nodeVoice || 'google-vi-gtx';
    const endpoint = config.nodeTtsEndpoint || 'http://localhost:3000/tts';
    const url = `${endpoint}?voice=${encodeURIComponent(
      voice
    )}&text=${encodeURIComponent(shortText)}`;

    let fallbackTriggered = false;
    let hasStartedPlaying = false;
    let activeAudio: HTMLAudioElement | null = null;

    const cleanupAudio = () => {
      if (!activeAudio) return;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.onplaying = null;
      try {
        activeAudio.pause();
        activeAudio.removeAttribute('src');
        activeAudio.load();
      } catch {
        // Ignore
      }
      if (this.currentAudio === activeAudio) {
        this.currentAudio = null;
      }
      activeAudio = null;
    };

    const fallbackOnce = () => {
      if (fallbackTriggered || token !== this.speechTokenSeq) return;
      fallbackTriggered = true;
      clearTimeout(lagTimeout);
      cleanupAudio();
      // Ưu tiên dự phòng sang Google Cloud Stream đa máy chủ (/api/tts) trước để giữ đồng nhất màu giọng MP3 và âm lượng, nếu vẫn lỗi mới xuống WebSpeech
      this.playViaGoogleStream(text, config, token, onDone, true);
    };

    const lagTimeout = setTimeout(() => {
      if (!hasStartedPlaying) {
        fallbackOnce();
      }
    }, 2200);

    void this.getOrFetchAudioBlobUrl(url, 2000).then((blobUrl) => {
      if (fallbackTriggered || token !== this.speechTokenSeq) return;
      if (!blobUrl) {
        fallbackOnce();
        return;
      }
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      activeAudio = audio;
      this.currentAudio = audio;
      audio.volume = Math.max(0.05, Math.min(1, config.ttsVolume));
      const effectiveRate =
        voice === 'google-vi-warm'
          ? Math.max(0.75, (config.ttsRate || 1) * 0.94)
          : config.ttsRate || 1;
      audio.playbackRate = effectiveRate;
      audio.preservesPitch = voice !== 'google-vi-warm';

      this.attachVoiceProcessingGraph(audio, config);

      audio.onplaying = () => {
        hasStartedPlaying = true;
        clearTimeout(lagTimeout);
      };

      audio.onended = () => {
        if (fallbackTriggered || token !== this.speechTokenSeq) return;
        fallbackTriggered = true;
        clearTimeout(lagTimeout);
        cleanupAudio();
        onDone();
      };

      audio.onerror = () => {
        fallbackOnce();
      };

      audio.src = blobUrl;
      audio.play().catch(() => {
        fallbackOnce();
      });
    });
  }

  private playViaGoogleStream(
    text: string,
    config: GameConfig,
    token: number,
    onDone: () => void,
    isFallbackFromNode = false
  ) {
    const shortText = text.slice(0, 195);
    const voice = config.nodeVoice || 'google-vi-gtx';
    const proxyUrl = `/api/tts?voice=${encodeURIComponent(
      voice
    )}&text=${encodeURIComponent(shortText)}`;

    let fallbackTriggered = false;
    let hasStartedPlaying = false;
    let activeAudio: HTMLAudioElement | null = null;

    const cleanupAudio = () => {
      if (!activeAudio) return;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.onplaying = null;
      try {
        activeAudio.pause();
        activeAudio.removeAttribute('src');
        activeAudio.load();
      } catch {
        // Ignore
      }
      if (this.currentAudio === activeAudio) {
        this.currentAudio = null;
      }
      activeAudio = null;
    };

    const fallbackOnce = () => {
      if (fallbackTriggered || token !== this.speechTokenSeq) return;
      fallbackTriggered = true;
      clearTimeout(lagTimeout);
      cleanupAudio();
      this.playViaWebSpeech(text, config, token, onDone);
    };

    const timeoutBudget = isFallbackFromNode ? 1800 : 2300;
    const lagTimeout = setTimeout(() => {
      if (!hasStartedPlaying) {
        fallbackOnce();
      }
    }, timeoutBudget);

    void this.getOrFetchAudioBlobUrl(proxyUrl, timeoutBudget - 150).then(
      (blobUrl) => {
        if (fallbackTriggered || token !== this.speechTokenSeq) return;
        if (!blobUrl) {
          fallbackOnce();
          return;
        }
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        activeAudio = audio;
        this.currentAudio = audio;
        audio.volume = Math.max(0.05, Math.min(1, config.ttsVolume));
        const effectiveRate =
          voice === 'google-vi-warm'
            ? Math.max(0.75, (config.ttsRate || 1) * 0.94)
            : config.ttsRate || 1;
        audio.playbackRate = effectiveRate;
        audio.preservesPitch = voice !== 'google-vi-warm';

        this.attachVoiceProcessingGraph(audio, config);

        audio.onplaying = () => {
          hasStartedPlaying = true;
          clearTimeout(lagTimeout);
        };

        audio.onended = () => {
          if (fallbackTriggered || token !== this.speechTokenSeq) return;
          fallbackTriggered = true;
          clearTimeout(lagTimeout);
          cleanupAudio();
          onDone();
        };

        audio.onerror = () => {
          fallbackOnce();
        };

        audio.src = blobUrl;
        audio.play().catch(() => {
          fallbackOnce();
        });
      }
    );
  }

  private playViaWebSpeech(
    text: string,
    config: GameConfig,
    token: number,
    onDone: () => void,
    override?: { rate?: number; pitch?: number }
  ) {
    if (token !== this.speechTokenSeq) return;
    if (!('speechSynthesis' in window)) {
      onDone();
      return;
    }

    let settled = false;
    const settleOnce = () => {
      if (settled || token !== this.speechTokenSeq) return;
      settled = true;
      clearTimeout(safetyWatchdog);
      onDone();
    };

    // Bảo vệ trường hợp trình duyệt treo sự kiện onend của WebSpeech
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const maxExpectedMs = Math.max(4000, Math.min(18000, wordCount * 550 + 2500));
    const safetyWatchdog = setTimeout(settleOnce, maxExpectedMs);

    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'vi-VN';
      utter.rate = override?.rate ?? config.ttsRate;
      utter.pitch = override?.pitch ?? config.ttsPitch;
      utter.volume = config.ttsVolume;

      const voices = window.speechSynthesis.getVoices();
      let chosen = config.selectedSystemVoiceURI
        ? voices.find((v) => v.voiceURI === config.selectedSystemVoiceURI)
        : undefined;
      if (!chosen) {
        chosen = voices.find((v) => v.lang.toLowerCase().includes('vi'));
      }
      if (chosen) utter.voice = chosen;

      utter.onend = settleOnce;
      utter.onerror = settleOnce;
      if ((config.ttsReverb ?? 0) > 0) {
        this.playSubtleTempleReverbAmbience(
          config.ttsReverb ?? 0,
          config.ttsVolume ?? 1
        );
      }
      window.speechSynthesis.speak(utter);
    } catch {
      settleOnce();
    }
  }
}

export const soundEngine = new TempleSoundService();
