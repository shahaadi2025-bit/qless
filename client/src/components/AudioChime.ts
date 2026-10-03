// Web Audio API chime + speech announcer with a global "stop" switch.
// stopQueueSound() silences everything immediately and blocks further playback
// until unmuteQueueSound() is called (done when the next token is called).
let sharedCtx: AudioContext | null = null;
let speechTimer: number | undefined;
let muted = false;
let lastKey = '';
let lastAt = 0;
let liveOscillators: OscillatorNode[] = [];

function getContext(): AudioContext | null {
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctor();
  if (sharedCtx && sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => undefined);
  return sharedCtx;
}

function tone(ctx: AudioContext, freq: number, start: number, dur: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.onended = () => {
    liveOscillators = liveOscillators.filter((o) => o !== osc);
  };
  liveOscillators.push(osc);
  osc.start(start);
  osc.stop(start + dur);
}

/** Stop the chime and any spoken announcement right now, and keep quiet until unmuteQueueSound(). */
export function stopQueueSound() {
  muted = true;
  if (speechTimer !== undefined) {
    window.clearTimeout(speechTimer);
    speechTimer = undefined;
  }
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  liveOscillators.forEach((o) => {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  });
  liveOscillators = [];
}

/** Allow sound again (call this when a new token is called). */
export function unmuteQueueSound() {
  muted = false;
}

export function playQueueChime(announcementText?: string) {
  if (muted) return;

  // Ignore an identical call made a moment ago (staff screen + socket event both fire for one call).
  const key = announcementText || '';
  const nowMs = Date.now();
  if (key === lastKey && nowMs - lastAt < 2500) return;
  lastKey = key;
  lastAt = nowMs;

  try {
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    tone(ctx, 659.25, now, 0.6, 0.3); // E5
    tone(ctx, 880.0, now + 0.3, 0.9, 0.35); // A5

    if (announcementText && 'speechSynthesis' in window) {
      if (speechTimer !== undefined) window.clearTimeout(speechTimer);
      speechTimer = window.setTimeout(() => {
        speechTimer = undefined;
        if (muted) return;
        const utterance = new SpeechSynthesisUtterance(announcementText);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }, 1000);
    }
  } catch (err) {
    console.warn('Audio chime playback notice:', err);
  }
}