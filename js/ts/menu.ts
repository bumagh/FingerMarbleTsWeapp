// retro-marble-game-040926/frontend/public/src/menu.ts

/**
 * Menu System Module
 * Handles all UI rendering and interactions for game menus within the Canvas
 * 遵循优雅复古风格：Baskerville字体、红棕色调
 */

export type MenuState = 'MAIN' | 'HELP' | 'GAME_OVER' | 'NONE';

interface Button {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  onClick: () => void;
}

export class MenuSystem {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private buttons: Button[] = [];
  public state: MenuState = 'MAIN';

  // 事件回调
  public onStart: (() => void) | null = null;
  public onRestart: (() => void) | null = null;

  // 风格常量 (与 style.css 保持一致)
  private readonly colors = {
    primary: '#B22222',   // 复古红棕
    secondary: '#FAEBD7', // 古董白
    accent: '#8B4513',    // 马鞍棕
    text: '#2c2c2c',      // 深灰
    highlight: 'rgba(178, 34, 34, 0.1)'
  };

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.setupMainMenu();
  }

  // 响应窗口大小变化
  public resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.refreshLayout();
  }

  private refreshLayout(): void {
    if (this.state === 'MAIN') this.setupMainMenu();
    else if (this.state === 'HELP') this.setupHelpMenu();
    else if (this.state === 'GAME_OVER') {
        // 保持当前按钮状态，仅重新计算位置（如果需要更复杂的重排，需保存上一次的gameOver状态参数）
        // 这里简化处理：若在resize时处于结束界面，暂不强制重绘按钮，依赖下一次调用 showGameOver
    }
  }

  // 主渲染循环调用
  public render(scoreInfo?: { win: boolean; message: string; score?: number }): void {
    if (this.state === 'NONE') return;

    this.ctx.save();
    
    // 绘制背景 (全屏或半透明遮罩)
    if (this.state === 'MAIN' || this.state === 'HELP') {
      this.ctx.fillStyle = this.colors.secondary;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.drawOrnamentalBorder();
    } else {
      // 游戏结束时的弹窗背景
      this.ctx.fillStyle = 'rgba(250, 235, 215, 0.92)';
      this.ctx.fillRect(this.width * 0.1, this.height * 0.2, this.width * 0.8, this.height * 0.6);
      this.ctx.strokeStyle = this.colors.primary;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(this.width * 0.1, this.height * 0.2, this.width * 0.8, this.height * 0.6);
    }

    // 绘制标题和文本
    if (this.state === 'MAIN') {
      this.drawTitle("MARBLE DUEL", 0.3);
      this.drawSubtitle("A Schoolyard Tactical Game", 0.38);
    } else if (this.state === 'HELP') {
      this.drawTitle("INSTRUCTIONS", 0.25);
      this.drawHelpText();
    } else if (this.state === 'GAME_OVER' && scoreInfo) {
      const titleY = 0.35;
      this.drawTitle(scoreInfo.win ? "VICTORY!" : "DEFEAT", titleY);
      this.drawSubtitle(scoreInfo.message, titleY + 0.08);
    }

    // 绘制所有按钮
    this.buttons.forEach(btn => this.drawButton(btn));

    this.ctx.restore();
  }

  // 处理输入事件
  public handleInput(x: number, y: number): boolean {
    if (this.state === 'NONE') return false;

    let handled = false;
    // 倒序检测，确保覆盖在上面的元素优先响应（虽然目前没有重叠）
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const btn = this.buttons[i];
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        btn.onClick();
        handled = true;
        break;
      }
    }
    // 如果菜单处于开启状态，总是拦截点击，防止穿透到游戏层
    return true; 
  }

  // 切换到主菜单
  public showMainMenu(): void {
    this.state = 'MAIN';
    this.setupMainMenu();
  }

  // 切换到游戏结束界面
  public showGameOver(win: boolean, message: string): void {
    this.state = 'GAME_OVER';
    this.setupGameOverMenu(win);
  }

  // --- 布局初始化方法 ---

  private setupMainMenu(): void {
    this.buttons = [];
    const btnW = 220;
    const btnH = 60;
    const centerX = (this.width - btnW) / 2;
    const startY = this.height * 0.55;
    const gap = 25;

    this.addButton("start_game", "START GAME", centerX, startY, btnW, btnH, () => {
      this.state = 'NONE';
      if (this.onStart) this.onStart();
    });

    this.addButton("help", "HOW TO PLAY", centerX, startY + btnH + gap, btnW, btnH, () => {
      this.state = 'HELP';
      this.setupHelpMenu();
    });
  }

  private setupHelpMenu(): void {
    this.buttons = [];
    const btnW = 140;
    const btnH = 50;
    
    // 底部返回按钮
    this.addButton("back", "BACK", (this.width - btnW) / 2, this.height - 80, btnW, btnH, () => {
      this.showMainMenu();
    });
  }

  private setupGameOverMenu(win: boolean): void {
    this.buttons = [];
    const btnW = 200;
    const btnH = 55;
    const centerX = (this.width - btnW) / 2;
    const startY = this.height * 0.55;
    const gap = 20;

    const actionText = win ? "NEXT LEVEL" : "TRY AGAIN";
    
    this.addButton("restart", actionText, centerX, startY, btnW, btnH, () => {
      this.state = 'NONE';
      if (this.onRestart) this.onRestart();
    });

    this.addButton("home", "MAIN MENU", centerX, startY + btnH + gap, btnW, btnH, () => {
      this.showMainMenu();
    });
  }

  private addButton(id: string, text: string, x: number, y: number, w: number, h: number, onClick: () => void): void {
    this.buttons.push({ id, text, x, y, w, h, onClick });
  }

  // --- 绘图辅助方法 ---

  private drawTitle(text: string, yRatio: number): void {
    this.ctx.font = "bold 42px 'Cinzel', 'Baskerville', serif";
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, this.width / 2, this.height * yRatio);
    
    // 装饰性下划线
    const lineY = this.height * yRatio + 30;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2 - 80, lineY);
    this.ctx.lineTo(this.width / 2 + 80, lineY);
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawSubtitle(text: string, yRatio: number): void {
    this.ctx.font = "italic 20px 'Baskerville', serif";
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.width / 2, this.height * yRatio);
  }

  private drawHelpText(): void {
    const lines = [
      "MISSION:",
      "Launch your marble to land near the enemy.",
      "Capture range: Within one 'Hand Span'.",
      "",
      "CONTROLS:",
      "Drag back to aim and power up.",
      "Release to shoot.",
      "",
      "RULES:",
      "Turn-based gameplay.",
      "Don't fall off the edge!"
    ];

    this.ctx.font = "16px 'Baskerville', serif";
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = "center";
    let y = this.height * 0.35;
    const lineHeight = 24;

    lines.forEach(line => {
      // 简单的加粗标题检测
      if (line.endsWith(':')) {
         this.ctx.font = "bold 17px 'Baskerville', serif";
         this.ctx.fillStyle = this.colors.accent;
      } else {
         this.ctx.font = "16px 'Baskerville', serif";
         this.ctx.fillStyle = this.colors.text;
      }
      this.ctx.fillText(line, this.width / 2, y);
      y += lineHeight;
    });
  }

  private drawButton(btn: Button): void {
    // 阴影
    this.ctx.fillStyle = "rgba(0,0,0,0.1)";
    this.ctx.fillRect(btn.x + 4, btn.y + 4, btn.w, btn.h);

    // 背景
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

    // 双线边框风格
    this.ctx.strokeStyle = this.colors.primary;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(btn.x + 4, btn.y + 4, btn.w - 8, btn.h - 8);

    // 文字
    this.ctx.font = "bold 18px 'Baskerville', serif";
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    
    // 按钮两侧装饰点
    this.ctx.beginPath();
    this.ctx.arc(btn.x + 12, btn.y + btn.h/2, 2, 0, Math.PI*2);
    this.ctx.arc(btn.x + btn.w - 12, btn.y + btn.h/2, 2, 0, Math.PI*2);
    this.ctx.fillStyle = this.colors.accent;
    this.ctx.fill();
  }

  private drawOrnamentalBorder(): void {
    const p = 15; // padding
    const w = this.width;
    const h = this.height;
    const cornerSize = 30;

    this.ctx.strokeStyle = this.colors.primary;
    this.ctx.lineWidth = 3;

    // 绘制外框 (留出角落)
    this.ctx.beginPath();
    // Top
    this.ctx.moveTo(p + cornerSize, p);
    this.ctx.lineTo(w - p - cornerSize, p);
    // Bottom
    this.ctx.moveTo(p + cornerSize, h - p);
    this.ctx.lineTo(w - p - cornerSize, h - p);
    // Left
    this.ctx.moveTo(p, p + cornerSize);
    this.ctx.lineTo(p, h - p - cornerSize);
    // Right
    this.ctx.moveTo(w - p, p + cornerSize);
    this.ctx.lineTo(w - p, h - p - cornerSize);
    this.ctx.stroke();

    // 绘制四角花纹 (简化版)
    this.drawCorner(p, p, 1, 1);           // TL
    this.drawCorner(w - p, p, -1, 1);      // TR
    this.drawCorner(p, h - p, 1, -1);      // BL
    this.drawCorner(w - p, h - p, -1, -1); // BR
  }

  private drawCorner(x: number, y: number, sx: number, sy: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(sx, sy);
    
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 25);
    this.ctx.lineTo(0, 0);
    this.ctx.lineTo(25, 0);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.rect(4, 4, 8, 8);
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fill();
    
    this.ctx.restore();
  }
}