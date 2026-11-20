// Tiny WebAudio sound effects, synthesized — no audio files, no network.
// Engine hum, gunshot, pickup chime, siren wail and a dawn-ambient pad.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.08, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch {
      // Audio is decoration; never break the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    shot() {
      blip(220, 0.12, 'square', 0.1, 60);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.09, 990);
    },
    bust() {
      blip(330, 0.4, 'sawtooth', 0.08, 110);
    },
    siren() {
      blip(700, 0.5, 'sine', 0.03, 950);
    },
    setEngine(on, speed) {
      if (muted || !on) {
        if (engineOsc) {
          try { engineOsc.stop(); } catch { /* already stopped */ }
          engineOsc = null;
          engineGain = null;
        }
        return;
      }
      const c = ensure();
      if (!c) return;
      try {
        if (!engineOsc) {
          engineOsc = c.createOscillator();
          engineGain = c.createGain();
          engineOsc.type = 'sawtooth';
          engineOsc.frequency.value = 55;
          engineGain.gain.value = 0.02;
          engineOsc.connect(engineGain);
          engineGain.connect(c.destination);
          engineOsc.start();
        }
        engineOsc.frequency.value = 45 + Math.abs(speed) * 0.12;
        engineGain.gain.value = 0.015 + Math.min(0.03, Math.abs(speed) * 0.00006);
      } catch {
        // Ignore audio errors.
      }
    },
    toggleMute() {
      muted = !muted;
      if (muted && engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
