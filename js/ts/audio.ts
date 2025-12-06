// retro-marble-game-040926/frontend/public/src/audio.ts

/**
 * Audio Module
 * Web Audio API implementation for retro sound effects
 * 遵循极简高性能原则，通过振荡器合成8-bit风格音效，无需外部资源
 */
export class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = false;

  // 初始化音频上下文（需在用户交互后调用）
  public async init(): Promise<void> {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.enabled = true;
    // 处理自动播放策略限制
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  public setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // 基础振荡器创建封装
  private createOsc(type: OscillatorType, freq: number): OscillatorNode {
    const osc = this.ctx!.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
    return osc;
  }

  // 基础指数衰减包络封装
  private createEnv(duration: number, vol: number): GainNode {
    const gain = this.ctx!.createGain();
    const t = this.ctx!.currentTime;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    gain.connect(this.masterGain!);
    return gain;
  }

  // 碰撞音效：基于速度变化的短促方波
  public playCollision(force: number): void {
    if (!this.enabled || !this.ctx) return;
    const vol = Math.min(force * 0.15, 0.4); 
    if (vol < 0.02) return; // 忽略微小碰撞
    const osc = this.createOsc('square', 120 - Math.min(force * 2, 50));
    const gain = this.createEnv(0.08, vol);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 发射音效：频率滑动的三角波
  public playShoot(): void {
    if (!this.enabled || !this.ctx) return;
    const osc = this.createOsc('triangle', 600);
    const gain = this.createEnv(0.25, 0.3);
    // 频率从 600Hz 滑落到 150Hz
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // 回合切换音效：柔和的正弦波提示
  public playTurnSwitch(): void {
    if (!this.enabled || !this.ctx) return;
    const osc = this.createOsc('sine', 440); // A4
    const gain = this.createEnv(0.2, 0.2);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // 胜利音效：C大调三和弦琶音
  public playWin(): void {
    if (!this.enabled || !this.ctx) return;
    this.playTone(523.25, 0, 0.2); // C5
    this.playTone(659.25, 0.15, 0.2); // E5
    this.playTone(783.99, 0.3, 0.4); // G5
  }

  // 失败音效：减五度下行 (Tritone)
  public playLose(): void {
    if (!this.enabled || !this.ctx) return;
    this.playTone(392.00, 0, 0.3); // G4
    this.playTone(277.18, 0.3, 0.5); // C#4
  }

  // 通用单音播放方法，用于组合旋律
  private playTone(freq: number, delay: number, dur: number): void {
    const t = this.ctx!.currentTime + delay;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + dur);
  }
}