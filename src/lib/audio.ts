let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!context) context = new Ctx();
  return context;
}

export function unlockAudio(): void {
  const ctx = audioContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function tone(frequency: number, when: number, duration: number, peak: number): void {
  const ctx = context;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

export function playTick(): void {
  const ctx = audioContext();
  if (!ctx) return;
  tone(720, ctx.currentTime, 0.045, 0.025);
}

export function playWin(): void {
  const ctx = audioContext();
  if (!ctx) return;
  tone(523.25, ctx.currentTime, 0.16, 0.04);
  tone(659.25, ctx.currentTime + 0.09, 0.2, 0.035);
}
