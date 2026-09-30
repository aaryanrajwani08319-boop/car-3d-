/**
 * Procedural Web Audio API Sound Engine for 3D Cab Simulator.
 * Provides dynamic engine revs, tire screeches, horns, crashes,
 * passenger boarding/dropoff chimes, cash rewards, and in-cab FM radio stations.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Engine synth nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineNoiseNode: AudioBufferSourceNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  // Skid sound
  private skidNode: AudioBufferSourceNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private skidGain: GainNode | null = null;

  // Radio synthesizer loop
  private radioStation: 'lofi' | 'synthwave' | 'jazz' | 'off' = 'lofi';
  private radioInterval: number | null = null;
  private radioStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.masterGain.context.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initEngineSound();
      this.initSkidSound();
      this.startRadio();
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }

  public resume() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private initEngineSound() {
    if (!this.ctx || !this.sfxGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

    // Osc 1: Deep rumble (sawtooth)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Osc 2: Mid engine harmonics (triangle)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    try {
      this.engineOsc1.start();
      this.engineOsc2.start();
      this.isEngineRunning = true;
    } catch {
      // Ignored
    }
  }

  private initSkidSound() {
    if (!this.ctx || !this.sfxGain) return;
    // Create looped white noise buffer for tire screech
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.skidNode = this.ctx.createBufferSource();
    this.skidNode.buffer = noiseBuffer;
    this.skidNode.loop = true;

    this.skidNode.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.sfxGain);

    try {
      this.skidNode.start();
    } catch {
      // Ignored
    }
  }

  public updateEngine(speedKmh: number, throttle: number, isDrifting: boolean = false) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineGain || !this.engineFilter) return;

    const basePitch = 45;
    const speedFactor = Math.abs(speedKmh) / 180;
    const throttleFactor = Math.max(0, throttle);

    const targetFreq1 = basePitch + speedFactor * 130 + throttleFactor * 25;
    const targetFreq2 = targetFreq1 * 2.1;
    const targetFilter = 300 + speedFactor * 900 + throttleFactor * 400;
    const targetGain = 0.08 + speedFactor * 0.12 + (throttleFactor > 0.05 ? 0.07 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.1);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);

    // Skid screech
    if (this.skidGain && this.skidFilter) {
      const isScreeching = isDrifting && Math.abs(speedKmh) > 20;
      const skidTarget = isScreeching ? 0.18 : 0;
      this.skidGain.gain.setTargetAtTime(skidTarget, now, 0.04);
      if (isScreeching) {
        this.skidFilter.frequency.setTargetAtTime(1000 + Math.random() * 500, now, 0.02);
      }
    }
  }

  public playHorn() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    // Standard European/American dual horn chords: F4 (349 Hz) and A4 (440 Hz)
    osc1.frequency.setValueAtTime(349, now);
    osc2.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  public playCollision(intensity: number = 0.5) {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Crash thud oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    // Crash noise crunch
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, now);

    const gain = this.ctx.createGain();
    const clampedIntensity = Math.min(1, Math.max(0.2, intensity));
    gain.gain.setValueAtTime(clampedIntensity * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.35);
    noise.stop(now + 0.35);
  }

  public playPassengerPickup() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Upward cheerful chime (G4 -> C5 -> E5)
    const notes = [392, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.28);
    });

    // Car door shut thud
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(90, t);
      thud.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      thudGain.gain.setValueAtTime(0.2, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      thud.connect(thudGain);
      thudGain.connect(this.sfxGain);
      thud.start(t);
      thud.stop(t + 0.15);
    }, 280);
  }

  public playPickup() {
    this.playPassengerPickup();
  }

  public playDropoff() {
    this.playTripCompleted();
  }

  public playCash() {
    this.playTripCompleted();
  }

  public playTripCompleted() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Cash register cha-ching fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.2, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.45);
    });

    // Jingle bells/coins
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + Math.random() * 800, now + 0.3 + i * 0.05);

      gain.gain.setValueAtTime(0.12, now + 0.3 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + 0.3 + i * 0.05);
      osc.stop(now + 0.3 + i * 0.05 + 0.16);
    }
  }

  public playNavAlert() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Pleasant double chime
    [880, 1174.66].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.12);
      gain.gain.setValueAtTime(0.15, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.22);
    });
  }

  public playUpgradeSound() {
    this.resume();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  // --- Procedural FM In-Cab Radio ---
  public setRadioStation(station: 'lofi' | 'synthwave' | 'jazz' | 'off') {
    this.radioStation = station;
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    if (station !== 'off') {
      this.startRadio();
    }
  }

  public getRadioStation() {
    return this.radioStation;
  }

  private startRadio() {
    if (this.radioInterval) clearInterval(this.radioInterval);
    if (this.radioStation === 'off') return;

    // Beats per minute & tempo
    const stepDurationMs = this.radioStation === 'synthwave' ? 240 : 380;

    // Musical scales for each radio station
    const lofiChords = [
      [220, 261.63, 329.63, 392], // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [130.81, 164.81, 196, 246.94], // Cmaj7
      [146.83, 174.61, 220, 261.63] // Dm7
    ];

    const synthwaveBass = [110, 110, 110, 130.81, 98, 98, 87.31, 98];
    const synthwaveLeads = [440, 523.25, 659.25, 587.33, 523.25, 493.88, 440, 392];

    const jazzChords = [
      [196, 246.94, 293.66, 349.23], // G7
      [220, 261.63, 329.63, 392], // Am7
      [146.83, 174.61, 220, 261.63], // Dm7
      [130.81, 164.81, 196, 246.94] // Cmaj7
    ];

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted || !this.musicGain || this.radioStation === 'off') return;
      if (this.ctx.state === 'suspended') return;

      const now = this.ctx.currentTime;
      this.radioStep = (this.radioStep + 1) % 16;

      if (this.radioStation === 'lofi') {
        // Soft electric piano chord every 4 steps
        if (this.radioStep % 4 === 0) {
          const chordIndex = Math.floor(this.radioStep / 4);
          const chord = lofiChords[chordIndex % lofiChords.length];
          chord.forEach(freq => {
            const osc = this.ctx!.createOscillator();
            const filter = this.ctx!.createBiquadFilter();
            const gain = this.ctx!.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(700, now);

            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain!);

            osc.start(now);
            osc.stop(now + 1.25);
          });
        }
      } else if (this.radioStation === 'synthwave') {
        // Fast bassline + lead arpeggio
        const bassFreq = synthwaveBass[this.radioStep % synthwaveBass.length];
        const leadFreq = synthwaveLeads[this.radioStep % synthwaveLeads.length];

        // Bass
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(0.06, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.22);

        // Synth Lead
        if (this.radioStep % 2 === 0) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = 'triangle';
          leadOsc.frequency.setValueAtTime(leadFreq, now);

          leadGain.gain.setValueAtTime(0.04, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);
          leadOsc.start(now);
          leadOsc.stop(now + 0.38);
        }
      } else if (this.radioStation === 'jazz') {
        // Walking upright bass and rhodes chords
        if (this.radioStep % 4 === 0) {
          const chordIndex = Math.floor(this.radioStep / 4);
          const chord = jazzChords[chordIndex % jazzChords.length];
          chord.forEach(freq => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
            osc.connect(gain);
            gain.connect(this.musicGain!);
            osc.start(now);
            osc.stop(now + 1.15);
          });
        }
      }
    }, stepDurationMs);
  }

  public setVolume(master: number, sfx: number, music: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(master, now, 0.05);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(sfx, now, 0.05);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(music, now, 0.05);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
