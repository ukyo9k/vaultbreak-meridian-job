// Vaultbreak — The Meridian Job: sound, synthesised, no audio files.
// Every cue is a small WebAudio oscillator phrase: footsteps are soft
// ticks, a coin clinks, an EMP zaps, glass shatters, the alarm throbs,
// the getaway pays off in a little arpeggio. M mutes it all.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  /** One oscillator note: frequency, length, wave shape, loudness. */
  function tone(freq, seconds, type, gainValue, when = 0, slideTo = null) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const start = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + seconds + 0.05);
    } catch {
      // Sound is garnish: a failure here never breaks the game.
    }
  }

  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    unlock() {
      ensure();
    },
    step() {
      tone(180, 0.05, 'sine', 0.03);
    },
    coin() {
      tone(1900, 0.09, 'triangle', 0.12);
      tone(2500, 0.14, 'triangle', 0.1, 0.07);
    },
    coinLand() {
      tone(1400, 0.06, 'triangle', 0.08);
    },
    emp() {
      tone(900, 0.35, 'sawtooth', 0.1, 0, 120);
    },
    crack() {
      tone(3200, 0.12, 'square', 0.06);
      tone(2400, 0.2, 'square', 0.05, 0.08);
      tone(1800, 0.28, 'square', 0.05, 0.16);
    },
    loot() {
      tone(880, 0.1, 'triangle', 0.1);
      tone(1320, 0.14, 'triangle', 0.1, 0.08);
    },
    spotted() {
      tone(520, 0.16, 'square', 0.07);
      tone(660, 0.16, 'square', 0.07, 0.12);
    },
    alarmTick() {
      tone(980, 0.08, 'square', 0.05);
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, index) => tone(freq, 0.22, 'triangle', 0.12, index * 0.13));
    },
    caught() {
      tone(220, 0.5, 'sawtooth', 0.12, 0, 55);
      tone(110, 0.7, 'sawtooth', 0.1, 0.15, 40);
    },
  };
}
