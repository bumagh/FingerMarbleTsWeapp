// src/menu.ts
import { Vector } from "./physics";

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
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private buttons: Button[] = [];
  private gameOverInfo: { win: boolean; message: string } | null = null;

  // 事件回调（在game.ts中会设置这些回调）
  public onStart: (() => void) | null = null;
  public onRestart: (() => void) | null = null;
  public onHelp: (() => void) | null = null;
  public onBackToMenu: (() => void) | null = null;

  // 风格常量 (微信小游戏环境使用通用字体)
  private readonly colors = {
    primary: '#B22222',   // 复古红棕
    secondary: '#FAEBD7', // 古董白
    accent: '#8B4513',    // 马鞍棕
    text: '#2c2c2c',      // 深灰
    highlight: 'rgba(178, 34, 34, 0.1)'
  };

  // 修改构造函数以匹配game.ts中的调用
  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.showMainMenu();
  }

  // 响应窗口大小变化
  public resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.refreshLayout();
  }

  private refreshLayout(): void {
    if (this.gameOverInfo) {
      this.setupGameOverMenu(this.gameOverInfo.win);
    } else {
      this.showMainMenu();
    }
  }

  // 主渲染循环调用 - 修改为接收状态参数
  public render(state: MenuState): void {
    if (state === 'NONE') return;

    this.ctx.save();
    
    // 绘制背景 (全屏或半透明遮罩)
    if (state === 'MAIN' || state === 'HELP') {
      this.ctx.fillStyle = this.colors.secondary;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.drawOrnamentalBorder();
    } else if (state === 'GAME_OVER') {
      // 游戏结束时的弹窗背景
      this.ctx.fillStyle = 'rgba(250, 235, 215, 0.92)';
      this.ctx.fillRect(this.width * 0.1, this.height * 0.2, this.width * 0.8, this.height * 0.6);
      this.ctx.strokeStyle = this.colors.primary;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(this.width * 0.1, this.height * 0.2, this.width * 0.8, this.height * 0.6);
    }

    // 绘制标题和文本
    if (state === 'MAIN') {
      this.drawTitle("弹珠对决", 0.3);
      this.drawSubtitle("校园弹珠战术游戏", 0.38);
    } else if (state === 'HELP') {
      this.drawTitle("游戏说明", 0.25);
      this.drawHelpText();
    } else if (state === 'GAME_OVER' && this.gameOverInfo) {
      const titleY = 0.35;
      this.drawTitle(this.gameOverInfo.win ? "胜利！" : "失败！", titleY);
      this.drawSubtitle(this.gameOverInfo.message, titleY + 0.08);
    }

    // 绘制所有按钮
    this.buttons.forEach(btn => this.drawButton(btn));

    this.ctx.restore();
  }

  // 处理输入事件
  public handleInput(x: number, y: number): boolean {
    let handled = false;
    // 倒序检测，确保覆盖在上面的元素优先响应
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const btn = this.buttons[i];
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        btn.onClick();
        handled = true;
        break;
      }
    }
    return handled;
  }

  // 切换到主菜单
  public showMainMenu(): void {
    this.gameOverInfo = null;
    this.setupMainMenu();
  }

  // 切换到帮助界面
  public showHelpMenu(): void {
    this.gameOverInfo = null;
    this.setupHelpMenu();
  }

  // 切换到游戏结束界面
  public showGameOver(win: boolean, message: string): void {
    this.gameOverInfo = { win, message };
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

    this.addButton("start_game", "开始游戏", centerX, startY, btnW, btnH, () => {
      if (this.onStart) this.onStart();
    });

    this.addButton("help", "游戏说明", centerX, startY + btnH + gap, btnW, btnH, () => {
      this.showHelpMenu();
      if (this.onHelp) this.onHelp();
    });
  }

  private setupHelpMenu(): void {
    this.buttons = [];
    const btnW = 140;
    const btnH = 50;
    
    // 底部返回按钮
    this.addButton("back", "返回", (this.width - btnW) / 2, this.height - 80, btnW, btnH, () => {
      this.showMainMenu();
      if (this.onBackToMenu) this.onBackToMenu();
    });
  }

  private setupGameOverMenu(win: boolean): void {
    this.buttons = [];
    const btnW = 200;
    const btnH = 55;
    const centerX = (this.width - btnW) / 2;
    const startY = this.height * 0.55;
    const gap = 20;

    const actionText = win ? "下一关" : "再试一次";
    
    this.addButton("restart", actionText, centerX, startY, btnW, btnH, () => {
      if (this.onRestart) this.onRestart();
    });

    this.addButton("home", "主菜单", centerX, startY + btnH + gap, btnW, btnH, () => {
      this.showMainMenu();
      if (this.onBackToMenu) this.onBackToMenu();
    });
  }

  private addButton(id: string, text: string, x: number, y: number, w: number, h: number, onClick: () => void): void {
    this.buttons.push({ id, text, x, y, w, h, onClick });
  }

  // --- 绘图辅助方法 ---

  private drawTitle(text: string, yRatio: number): void {
    // 微信小游戏使用通用字体，调整为适合中文字体
    this.ctx.font = "bold 36px 'Arial', 'Microsoft YaHei', sans-serif";
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
    this.ctx.font = "italic 18px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.width / 2, this.height * yRatio);
  }

  private drawHelpText(): void {
    const lines = [
      "游戏目标:",
      "将你的弹珠发射到敌人弹珠附近。",
      "捕获范围：在一扎距离内。",
      "",
      "操作方法:",
      "向后拖拽以瞄准和蓄力。",
      "松开手指进行发射。",
      "",
      "游戏规则:",
      "回合制游戏。",
      "不要掉出边界！"
    ];

    this.ctx.font = "16px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = "center";
    let y = this.height * 0.35;
    const lineHeight = 24;

    lines.forEach(line => {
      // 简单的加粗标题检测
      if (line.endsWith(':')) {
         this.ctx.font = "bold 17px 'Arial', 'Microsoft YaHei', sans-serif";
         this.ctx.fillStyle = this.colors.accent;
      } else {
         this.ctx.font = "16px 'Arial', 'Microsoft YaHei', sans-serif";
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
    this.ctx.font = "bold 18px 'Arial', 'Microsoft YaHei', sans-serif";
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