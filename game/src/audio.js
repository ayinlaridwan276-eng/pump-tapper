// Synthesized sound: every effect is an oscillator through a gain envelope, so the game
// needs no audio files. The context is created on the first user gesture (browsers block
// audio before one) and every call after that is safe to make even when it is not ready.
let context = null;
let muted = false;

/** Call once from a real tap or key press: unlocks audio for the session. */
export function unlockAudio() {
  if (context === null) {
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (AudioContext) context = new AudioContext();
    } catch {
      context = null;
    }
  }
  if (context && context.state === 'suspended') void context.resume();
}

/** Mute or unmute every effect. */
export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function blip(freq, endFreq, duration, type, volume, delay) {
  if (muted || !context) return;
  const start = context.currentTime + (delay ?? 0);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  if (endFreq !== freq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

/** Play one named effect. `combo` lifts the tap pitch as the combo grows. */
export function playEffect(name, combo) {
  if (muted || !context) return;
  const lift = Math.min(combo ?? 0, 40);
  switch (name) {
    case 'tap':
      blip(420 + lift * 9, 640 + lift * 9, 0.09, 'square', 0.12, 0);
      break;
    case 'golden':
      blip(880, 1320, 0.16, 'sine', 0.2, 0);
      blip(1320, 1760, 0.2, 'sine', 0.16, 0.07);
      break;
    case 'buy':
      blip(520, 520, 0.08, 'triangle', 0.16, 0);
      blip(780, 780, 0.12, 'triangle', 0.16, 0.07);
      break;
    case 'deny':
      blip(180, 120, 0.14, 'sawtooth', 0.1, 0);
      break;
    case 'level':
      [523, 659, 784, 1047].forEach((freq, i) => blip(freq, freq, 0.14, 'triangle', 0.16, i * 0.08));
      break;
    case 'event':
      blip(300, 900, 0.25, 'sawtooth', 0.1, 0);
      break;
    case 'win':
      [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => blip(freq, freq, 0.22, 'sine', 0.18, i * 0.1));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((freq, i) => blip(freq, freq * 0.9, 0.2, 'sawtooth', 0.12, i * 0.12));
      break;
    default:
      break;
  }
}
