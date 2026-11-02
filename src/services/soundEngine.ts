import { GameConfig } from '../types/game';

export type TTSStatusListener = (
  statusText: string,
  active: boolean,
  spokenText?: string
) => void;

export interface EventTtsQueueSnapshot {
  waitingCount: number;
  isPlayingEvent: boolean;
  currentEventText: string;
  queueItems: string[];
}

export type EventTtsQueueListener = (snapshot: EventTtsQueueSnapshot) => void;

export type DharmaArticleChangeListener = (nextArticleId: string) => void;

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
  private ttsQueue: string[] = [];
  private isSpeaking = false;
  private isSpeakingDharma = false;
  private currentEventText = '';
  private currentAudio: HTMLAudioElement | null = null;
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

  public isTabMuted(): boolean {
    return this.localTabMuted;
  }

  public setTabMuted(muted: boolean) {
    this.localTabMuted = muted;
    sessionStorage.setItem('chua_silent_admin_tab', muted ? 'true' : 'false');
    if (muted) {
      this.stopImmediate();
      this.stopBgmInternal();
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
      queueItems: [...this.ttsQueue],
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
    this.isSpeaking = false;
    this.isSpeakingDharma = false;
    this.currentEventText = '';
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
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
    this.ttsQueue = [];
    this.isSpeaking = false;
    this.isSpeakingDharma = false;
    this.currentEventText = '';
    if (this.dharmaNextTimer) {
      clearTimeout(this.dharmaNextTimer);
      this.dharmaNextTimer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
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
   */
  public formatEventTemplate(
    template: string,
    username: string,
    comment = ''
  ): string {
    const safeTpl = (template || '').trim();
    if (!safeTpl) return `${username} ${comment}`.trim();
    return safeTpl
      .replace(/\[Tên\]|\[tên\]|\[Ten\]|\[ten\]|\{name\}/g, username)
      .replace(/\[Comment\]|\[comment\]|\{prayer\}|\{comment\}/g, comment);
  }

  public formatPrayerSpeech(
    username: string,
    prayer: string,
    isVip: boolean,
    template: string
  ): string {
    const tpl = template || '[Tên] cầu nguyện: [Comment]';
    const prefix = isVip ? 'Nam mô A Di Đà Phật. ' : '';
    return prefix + this.formatEventTemplate(tpl, username, prayer);
  }

  public enqueueTTS(text: string, isPriority: boolean, config: GameConfig) {
    this.latestConfig = config;
    if (this.localTabMuted || !text.trim()) return;

    if (isPriority) {
      this.ttsQueue.unshift(text);
    } else {
      if (this.ttsQueue.length >= 50) this.ttsQueue.pop();
      this.ttsQueue.push(text);
    }
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
      // Đã đọc hết bài hiện tại: nếu bật Tự động Next bài (dharmaAutoNext) và có nhiều bài -> tự động chuyển sang bài kế tiếp
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
        this.dharmaIndex = 0; // Đọc hết text thì tự động đọc lại từ đầu bài hiện tại
      }
    }

    if (sentences.length === 0) return null;
    const line = sentences[this.dharmaIndex];
    this.dharmaIndex = this.dharmaIndex + 1;
    return line;
  }

  private processQueue(config: GameConfig) {
    if (this.isSpeaking || this.localTabMuted) return;

    let nextText: string | null = null;
    let isDharmaLine = false;

    if (this.ttsQueue.length > 0) {
      nextText = this.ttsQueue.shift()!;
      isDharmaLine = false;
    } else if (config.dharmaEnabled) {
      nextText = this.getNextDharmaSentence(config);
      isDharmaLine = true;
    }

    if (!nextText) {
      this.emitEventQueue();
      return;
    }

    this.isSpeaking = true;
    this.isSpeakingDharma = isDharmaLine;
    this.currentEventText = isDharmaLine ? '' : nextText;
    this.emitStatus(
      isDharmaLine ? 'Đang thuyết pháp...' : 'Đang đọc sự kiện...',
      true,
      nextText
    );
    this.emitEventQueue();

    const finish = () => {
      this.isSpeaking = false;
      this.isSpeakingDharma = false;
      this.currentEventText = '';
      const latestCfg = this.latestConfig || config;
      const hasMore =
        this.ttsQueue.length > 0 || Boolean(latestCfg.dharmaEnabled);
      if (!hasMore) {
        this.emitStatus('Sẵn sàng', false, '');
      }
      this.emitEventQueue();
      this.scheduleNextDharmaStep(isDharmaLine ? 420 : 200);
    };

    if (config.ttsEngine === 'node_edge') {
      this.playViaNodeEdge(nextText, config, finish);
    } else if (config.ttsEngine === 'google_stream') {
      this.playViaGoogleStream(nextText, config, finish);
    } else if (config.ttsEngine === 'monk_zen') {
      this.playWoodenFish(config.ttsVolume);
      this.playViaWebSpeech(nextText, config, finish, { rate: 0.88, pitch: 0.72 });
    } else {
      this.playViaWebSpeech(nextText, config, finish);
    }
  }

  private playViaNodeEdge(text: string, config: GameConfig, onDone: () => void) {
    const endpoint = config.nodeTtsEndpoint || 'http://localhost:3000/tts';
    const url = `${endpoint}?voice=${encodeURIComponent(
      config.nodeVoice
    )}&text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    this.currentAudio = audio;
    audio.volume = config.ttsVolume;
    audio.playbackRate = config.ttsRate;
    audio.onended = onDone;
    audio.onerror = () => {
      this.playViaWebSpeech(text, config, onDone);
    };
    audio.play().catch(() => {
      this.playViaWebSpeech(text, config, onDone);
    });
  }

  private playViaGoogleStream(
    text: string,
    config: GameConfig,
    onDone: () => void
  ) {
    const shortText = text.slice(0, 180);
    const proxyUrl = `/api/tts?text=${encodeURIComponent(shortText)}`;
    const audio = new Audio(proxyUrl);
    this.currentAudio = audio;
    audio.volume = config.ttsVolume;
    audio.playbackRate = config.ttsRate;
    audio.onended = onDone;
    audio.onerror = () => this.playViaWebSpeech(text, config, onDone);
    audio.play().catch(() => this.playViaWebSpeech(text, config, onDone));
  }

  private playViaWebSpeech(
    text: string,
    config: GameConfig,
    onDone: () => void,
    override?: { rate?: number; pitch?: number }
  ) {
    if (!('speechSynthesis' in window)) {
      onDone();
      return;
    }
    try {
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

      utter.onend = onDone;
      utter.onerror = onDone;
      window.speechSynthesis.speak(utter);
    } catch {
      onDone();
    }
  }
}

export const soundEngine = new TempleSoundService();
