// retro-marble-game-040926/frontend/public/src/render.ts

import { PhysicsBody } from './physics';
import { AssetManager } from './assets';

export interface RenderState {
  bodies: PhysicsBody[];
  currentPlayerId: string;
  isAiming: boolean;
  aimStart: { x: number, y: number } | null;
  aimCurrent: { x: number, y: number } | null;
  handSpanDistance: number; // "一扎"的像素距离
  gameTime: number; // 剩余时间
  score: { player: number; ai: number };
  turn: 'PLAYER' | 'AI';
  phase: 'AIMING' | 'MOVING' | 'SETTLING';
  level: string; // 年级/难度
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private assets: AssetManager;
  
  // 样式常量：遵循复古红棕方案
  private readonly colors = {
    primary: '#B22222',
    secondary: '#FAEBD7',
    accent: '#8B4513',
    obstacle: '#5D4037',
    text: '#2c2c2c',
    guide: 'rgba(139, 69, 19, 0.5)'
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false }); // 优化性能，关闭透明通道
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
    this.assets = AssetManager.getInstance();
    this.resize();
  }

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.width = parent.clientWidth;
      this.height = parent.clientHeight;
      // 支持高清屏
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
    }
  }

  public render(state: RenderState): void {
    // 1. 绘制背景与纹理
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawBackgroundTexture();

    // 2. 绘制游戏元素
    this.drawObstacles(state.bodies);
    this.drawMeasurementGuide(state); // 测量范围辅助
    this.drawMarbles(state.bodies, state.currentPlayerId);
    
    // 3. 绘制瞄准辅助线
    if (state.isAiming && state.aimStart && state.aimCurrent && state.turn === 'PLAYER') {
      this.drawAimingVector(state.aimStart, state.aimCurrent, state.bodies.find(b => b.id === state.currentPlayerId));
    }

    // 4. 绘制顶部信息栏 (HUD)
    this.drawHUD(state);
  }

  private drawBackgroundTexture(): void {
    const bg = this.assets.getImage('bg_texture');
    if (bg) {
      this.ctx.globalAlpha = 0.15;
      // 铺满背景
      this.ctx.drawImage(bg, 0, 0, this.width, this.height);
      this.ctx.globalAlpha = 1.0;
    }
    
    // 绘制作业本风格网格线
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(178, 34, 34, 0.05)';
    this.ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x <= this.width; x += gridSize) {
      this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y);
    }
    this.ctx.stroke();
  }

  private drawObstacles(bodies: PhysicsBody[]): void {
    this.ctx.fillStyle = this.colors.obstacle;
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;

    bodies.filter(b => b.type === 'rectangle').forEach(obs => {
      const w = obs.width || 0;
      const h = obs.height || 0;
      
      // 障碍物投影
      this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      this.ctx.fillRect(obs.x + 4, obs.y + 4, w, h);

      // 障碍物本体
      this.ctx.fillStyle = '#D7CCC8'; 
      this.ctx.fillRect(obs.x, obs.y, w, h);
      this.ctx.strokeRect(obs.x, obs.y, w, h);
      
      // 内部装饰纹理：斜线
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(obs.x, obs.y, w, h);
      this.ctx.clip();
      this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
      for(let i = -h; i < w; i += 10) {
         this.ctx.moveTo(obs.x + i, obs.y);
         this.ctx.lineTo(obs.x + i + h, obs.y + h);
      }
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  private drawMarbles(bodies: PhysicsBody[], currentId: string): void {
    bodies.filter(b => b.type === 'circle').forEach(ball => {
      const r = ball.radius || 15;
      const isCurrent = ball.id === currentId;
      
      this.ctx.save();
      this.ctx.translate(ball.x, ball.y);
      
      // 阴影
      this.ctx.beginPath();
      this.ctx.ellipse(4, 4, r, r * 0.8, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.fill();

      // 弹珠渲染
      const texture = this.assets.getImage('marble_texture');
      if (texture) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.clip();
        // 简单的滚动视差效果
        const offset = (Date.now() / 50) % 50; 
        this.ctx.drawImage(texture, -r - offset/5, -r - offset/5, r * 2.5, r * 2.5); 
      } else {
        // 纹理加载失败兜底：径向渐变球体
        const grad = this.ctx.createRadialGradient(-r/3, -r/3, r/10, 0, 0, r);
        if (ball.id.startsWith('player')) {
           grad.addColorStop(0, '#ff9999');
           grad.addColorStop(1, '#8B0000');
        } else {
           grad.addColorStop(0, '#99ccff');
           grad.addColorStop(1, '#00008B');
        }
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();

      // 当前回合弹珠高亮光圈
      if (isCurrent) {
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, r + 5, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    });
  }

  private drawAimingVector(start: {x: number, y: number}, current: {x: number, y: number}, ball?: PhysicsBody): void {
    if (!ball) return;
    
    const dx = start.x - current.x;
    const dy = start.y - current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxLen = 150; // 最大拉动显示距离
    const scale = Math.min(dist, maxLen) / dist || 0;
    
    const endX = ball.x + dx * scale;
    const endY = ball.y + dy * scale;

    // 虚线瞄准指示
    this.ctx.beginPath();
    this.ctx.moveTo(ball.x, ball.y);
    this.ctx.lineTo(endX, endY);
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 箭头末端
    const angle = Math.atan2(dy, dx);
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(endX - 15 * Math.cos(angle - Math.PI / 6), endY - 15 * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(endX - 15 * Math.cos(angle + Math.PI / 6), endY - 15 * Math.sin(angle + Math.PI / 6));
    this.ctx.fillStyle = this.colors.accent;
    this.ctx.fill();
  }

  private drawMeasurementGuide(state: RenderState): void {
    // 核心机制：“一扎”距离可视化。在瞄准或结算时显示范围。
    const activeBall = state.bodies.find(b => b.id === state.currentPlayerId);
    if (!activeBall) return;

    if (state.phase === 'SETTLING' || (state.phase === 'AIMING' && state.isAiming)) {
       this.ctx.beginPath();
       this.ctx.arc(activeBall.x, activeBall.y, state.handSpanDistance, 0, Math.PI * 2);
       this.ctx.strokeStyle = 'rgba(178, 34, 34, 0.3)';
       this.ctx.lineWidth = 2;
       this.ctx.setLineDash([12, 8]);
       this.ctx.stroke();
       this.ctx.setLineDash([]);
       
       // 距离标签
       this.ctx.fillStyle = this.colors.accent;
       this.ctx.font = "12px 'Baskerville', serif";
       this.ctx.textAlign = "center";
       this.ctx.fillText("Hand Span Limit", activeBall.x, activeBall.y - state.handSpanDistance - 8);
    }
  }

  private drawHUD(state: RenderState): void {
    // 顶部半透明状态栏
    this.ctx.fillStyle = 'rgba(250, 235, 215, 0.9)'; 
    this.ctx.fillRect(0, 0, this.width, 50);
    this.ctx.strokeStyle = this.colors.primary;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 50); this.ctx.lineTo(this.width, 50);
    this.ctx.stroke();

    this.ctx.font = "bold 16px 'Baskerville', serif";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.colors.text;

    // 左侧：年级/难度
    this.ctx.textAlign = "left";
    this.ctx.fillText(`Grade: ${state.level}`, 20, 25);
    
    // 中间：倒计时
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = state.gameTime < 10 ? '#cc0000' : this.colors.primary;
    this.ctx.font = "bold 20px 'Baskerville', serif";
    this.ctx.fillText(`Time: ${Math.ceil(state.gameTime)}s`, this.width / 2, 25);

    // 右侧：当前回合提示
    this.ctx.textAlign = "right";
    this.ctx.fillStyle = state.turn === 'PLAYER' ? '#006400' : '#8B0000';
    this.ctx.font = "bold 16px 'Baskerville', serif";
    this.ctx.fillText(`Turn: ${state.turn}`, this.width - 20, 25);

    // 底部提示：当前射程
    this.ctx.fillStyle = this.colors.accent;
    this.ctx.font = "italic 14px 'Baskerville', serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`Current Hand Span: ${Math.round(state.handSpanDistance)} px`, this.width / 2, this.height - 15);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}