import { Howl, Howler } from 'howler';

export interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  enabled: boolean;
}

export interface SoundEffect {
  id: string;
  url: string;
  volume?: number;
  loop?: boolean;
  sprite?: Record<string, [number, number]>;
}

export interface MusicTrack {
  id: string;
  url: string;
  volume?: number;
  loop?: boolean;
}

export class AudioManager {
  private config: AudioConfig;
  private sounds: Map<string, Howl> = new Map();
  private currentMusic: Howl | null = null;
  private currentMusicId: string | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = {
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.8,
      enabled: true,
      ...config,
    };

    // Set global Howler volume
    Howler.volume(this.config.masterVolume);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load default 8-bit sound effects (programmatically generated)
      await this.loadDefaultSounds();
      
      // Load default chiptune music
      await this.loadDefaultMusic();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
      // Continue without audio
      this.config.enabled = false;
      this.isInitialized = true;
    }
  }

  private async loadDefaultSounds(): Promise<void> {
    // Create 8-bit style sound effects programmatically
    const soundEffects: SoundEffect[] = [
      {
        id: 'plant_seed',
        url: this.generateChiptuneTone(440, 0.2, 'square'), // A4 note
        volume: 0.6,
      },
      {
        id: 'harvest_crop',
        url: this.generateChiptuneChord([523, 659, 784], 0.5, 'square'), // C-E-G chord
        volume: 0.7,
      },
      {
        id: 'water_crops',
        url: this.generateChiptuneNoise(0.3, 'pink'),
        volume: 0.5,
      },
      {
        id: 'sell_crop',
        url: this.generateChiptuneArpeggio([523, 659, 784, 1047], 0.8, 'square'),
        volume: 0.8,
      },
      {
        id: 'loan_taken',
        url: this.generateChiptuneTone(220, 1.0, 'sawtooth'), // A3 note, longer
        volume: 0.6,
      },
      {
        id: 'payment_made',
        url: this.generateChiptuneTone(880, 0.3, 'triangle'), // A5 note
        volume: 0.7,
      },
      {
        id: 'weather_alert',
        url: this.generateChiptuneWarning(),
        volume: 0.9,
      },
      {
        id: 'npc_talk',
        url: this.generateChiptuneTalk(),
        volume: 0.5,
      },
      {
        id: 'ui_click',
        url: this.generateChiptuneTone(1000, 0.1, 'square'),
        volume: 0.4,
      },
      {
        id: 'ui_hover',
        url: this.generateChiptuneTone(800, 0.05, 'triangle'),
        volume: 0.3,
      },
    ];

    // Load each sound effect
    for (const sfx of soundEffects) {
      const howl = new Howl({
        src: [sfx.url],
        volume: (sfx.volume || 1.0) * this.config.sfxVolume,
        loop: sfx.loop || false,
        sprite: sfx.sprite,
      });

      this.sounds.set(sfx.id, howl);
    }
  }

  private async loadDefaultMusic(): Promise<void> {
    // Create simple chiptune background music
    const musicTracks: MusicTrack[] = [
      {
        id: 'farm_theme',
        url: this.generateChiptuneMusic('farm'),
        volume: 0.6,
        loop: true,
      },
      {
        id: 'market_theme',
        url: this.generateChiptuneMusic('market'),
        volume: 0.5,
        loop: true,
      },
      {
        id: 'crisis_theme',
        url: this.generateChiptuneMusic('crisis'),
        volume: 0.7,
        loop: true,
      },
    ];

    // Load each music track
    for (const track of musicTracks) {
      const howl = new Howl({
        src: [track.url],
        volume: (track.volume || 1.0) * this.config.musicVolume,
        loop: track.loop || false,
      });

      this.sounds.set(track.id, howl);
    }
  }

  private generateChiptuneTone(frequency: number, duration: number, waveType: OscillatorType = 'square'): string {
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (waveType) {
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 0.3 : -0.3;
          break;
        case 'sawtooth':
          sample = 0.3 * (2 * (frequency * t - Math.floor(frequency * t + 0.5)));
          break;
        case 'triangle':
          sample = 0.3 * (2 * Math.abs(2 * (frequency * t - Math.floor(frequency * t + 0.5))) - 1);
          break;
        default:
          sample = 0.3 * Math.sin(2 * Math.PI * frequency * t);
      }

      // Apply envelope (fade out)
      const envelope = Math.max(0, 1 - (i / samples));
      buffer[i] = sample * envelope;
    }

    return this.bufferToDataURL(buffer, sampleRate);
  }

  private generateChiptuneChord(frequencies: number[], duration: number, waveType: OscillatorType = 'square'): string {
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Mix all frequencies
      for (const freq of frequencies) {
        switch (waveType) {
          case 'square':
            sample += (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.1 : -0.1);
            break;
          case 'sawtooth':
            sample += 0.1 * (2 * (freq * t - Math.floor(freq * t + 0.5)));
            break;
          case 'triangle':
            sample += 0.1 * (2 * Math.abs(2 * (freq * t - Math.floor(freq * t + 0.5))) - 1);
            break;
          default:
            sample += 0.1 * Math.sin(2 * Math.PI * freq * t);
        }
      }

      // Apply envelope
      const envelope = Math.max(0, 1 - (i / samples));
      buffer[i] = sample * envelope;
    }

    return this.bufferToDataURL(buffer, sampleRate);
  }

  private generateChiptuneArpeggio(frequencies: number[], duration: number, waveType: OscillatorType = 'square'): string {
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(samples);
    const noteLength = samples / frequencies.length;

    for (let i = 0; i < samples; i++) {
      const noteIndex = Math.floor(i / noteLength);
      const freq = frequencies[noteIndex] || frequencies[frequencies.length - 1];
      const t = i / sampleRate;
      let sample = 0;

      switch (waveType) {
        case 'square':
          sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.3 : -0.3;
          break;
        case 'sawtooth':
          sample = 0.3 * (2 * (freq * t - Math.floor(freq * t + 0.5)));
          break;
        case 'triangle':
          sample = 0.3 * (2 * Math.abs(2 * (freq * t - Math.floor(freq * t + 0.5))) - 1);
          break;
        default:
          sample = 0.3 * Math.sin(2 * Math.PI * freq * t);
      }

      // Apply envelope
      const noteProgress = (i % noteLength) / noteLength;
      const envelope = Math.max(0, 1 - noteProgress);
      buffer[i] = sample * envelope;
    }

    return this.bufferToDataURL(buffer, sampleRate);
  }

  private generateChiptuneNoise(duration: number, noiseType: 'white' | 'pink' = 'white'): string {
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let sample = 0;

      if (noiseType === 'white') {
        sample = (Math.random() * 2 - 1) * 0.2;
      } else {
        // Simple pink noise approximation
        sample = (Math.random() * 2 - 1) * 0.2 * (1 - i / samples);
      }

      // Apply envelope
      const envelope = Math.max(0, 1 - (i / samples));
      buffer[i] = sample * envelope;
    }

    return this.bufferToDataURL(buffer, sampleRate);
  }

  private generateChiptuneWarning(): string {
    // Alternating high-low tones for warning
    const sampleRate = 44100;
    const duration = 1.0;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const freq = Math.sin(t * 8) > 0 ? 800 : 400; // Alternate between 800Hz and 400Hz
      const sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.4 : -0.4;

      // Apply envelope
      const envelope = Math.max(0, 1 - (i / samples));
      buffer[i] = sample * envelope;
    }

    return this.bufferToDataURL(buffer, sampleRate);
  }

  private generateChiptuneTalk(): string {
    // Random frequency modulation for talk effect
    const sampleRate = 44100;
    const duration = 0.3;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const baseFreq = 200 + Math.sin(t * 20) * 100; // Modulated frequency
      const sample = Math.sin(2 * Math.PI * baseFreq * t) > 0 ? 0.2 : -0.2;

      // Apply envelope
      const envelope = Math.max(0, 1 - (i / samples));
      buffer[i] = sample * envelope;
    }

    return this.bufferToDataURL(buffer, sampleRate);
  }

  private generateChiptuneMusic(theme: 'farm' | 'market' | 'crisis'): string {
    // Simple melody patterns for different themes
    const melodies = {
      farm: [523, 587, 659, 698, 784, 698, 659, 587], // C major scale
      market: [440, 494, 523, 587, 659, 587, 523, 494], // A minor scale
      crisis: [220, 247, 262, 294, 330, 294, 262, 247], // Lower, more ominous
    };

    const melody = melodies[theme];
    const sampleRate = 44100;
    const noteDuration = 0.5;
    const totalDuration = melody.length * noteDuration;
    const samples = Math.floor(sampleRate * totalDuration);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const noteIndex = Math.floor(t / noteDuration) % melody.length;
      const freq = melody[noteIndex];
      
      // Square wave with some harmonics
      let sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.15 : -0.15;
      sample += (Math.sin(2 * Math.PI * freq * 2 * t) > 0 ? 0.05 : -0.05); // Octave harmonic

      // Apply note envelope
      const noteProgress = (t % noteDuration) / noteDuration;
      const noteEnvelope = Math.max(0, 1 - noteProgress * 2); // Quick decay
      buffer[i] = sample * noteEnvelope;
    }

    return this.bufferToDataURL(buffer, sampleRate);
  }

  private bufferToDataURL(buffer: Float32Array, sampleRate: number): string {
    // Convert Float32Array to WAV data URL
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    // Create blob and data URL
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  playSFX(soundId: string, volume?: number): void {
    if (!this.config.enabled) return;

    const sound = this.sounds.get(soundId);
    if (sound) {
      if (volume !== undefined) {
        sound.volume(volume * this.config.sfxVolume);
      }
      sound.play();
    } else {
      console.warn(`Sound effect not found: ${soundId}`);
    }
  }

  playMusic(musicId: string, fadeIn: boolean = true): void {
    if (!this.config.enabled) return;

    // Stop current music
    if (this.currentMusic) {
      if (fadeIn) {
        this.currentMusic.fade(this.currentMusic.volume(), 0, 500);
        setTimeout(() => {
          this.currentMusic?.stop();
        }, 500);
      } else {
        this.currentMusic.stop();
      }
    }

    // Start new music
    const music = this.sounds.get(musicId);
    if (music) {
      this.currentMusic = music;
      this.currentMusicId = musicId;
      
      if (fadeIn) {
        music.volume(0);
        music.play();
        music.fade(0, this.config.musicVolume, 1000);
      } else {
        music.volume(this.config.musicVolume);
        music.play();
      }
    } else {
      console.warn(`Music track not found: ${musicId}`);
    }
  }

  stopMusic(fadeOut: boolean = true): void {
    if (this.currentMusic) {
      if (fadeOut) {
        this.currentMusic.fade(this.currentMusic.volume(), 0, 1000);
        setTimeout(() => {
          this.currentMusic?.stop();
          this.currentMusic = null;
          this.currentMusicId = null;
        }, 1000);
      } else {
        this.currentMusic.stop();
        this.currentMusic = null;
        this.currentMusicId = null;
      }
    }
  }

  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.config.masterVolume);
  }

  setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume(this.config.musicVolume);
    }
  }

  setSFXVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopMusic(false);
      Howler.stop();
    }
  }

  getCurrentMusic(): string | null {
    return this.currentMusicId;
  }

  getConfig(): AudioConfig {
    return { ...this.config };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}