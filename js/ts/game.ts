// retro-marble-game-040926/frontend/public/src/game.ts

import { PhysicsEngine, PhysicsBody } from './physics';
import { GameRenderer, RenderState } from './render';
import { AudioController } from './audio';
import { MenuSystem } from './menu';
import { AssetManager } from './assets';

// 游戏状态枚举
enum GameState {
  LOADING,
  MENU,
  PLAYING,
  GAME_OVER,
  HELP
}

// 回合阶段
enum TurnPhase {
  AIMING,   // 瞄准中
  MOVING,   // 移动中（物理模拟）
  SETTLING, // 结算中（判断距离）
  WAITING   // 等待切换
}

interface PlayerStats {
  grade: number;
  exp: number;
  handSpan: number; // "一扎"的距离像素值
  maxForce: number;
}

/**
 * Game Controller Class
 * Orchestrates the game loop, state management, and interaction between modules.
 * 遵循极简高性能原则，核心逻辑与渲染解耦
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: GameRenderer;
  private physics: PhysicsEngine;
  private audio: AudioController;
  private menu: MenuSystem;
  private assets: AssetManager;

  private state: GameState = GameState.LOADING;
  private lastTime: number = 0;
  
  // 游戏实体
  private bodies: PhysicsBody[] = [];
  private playerId: string = 'player_1';
  private enemyId: string = 'enemy_1';
  
  // 游戏逻辑变量
  private currentTurn: 'PLAYER' | 'AI' = 'PLAYER';
  private turnPhase: TurnPhase = TurnPhase.AIMING;
  private turnTimer: number = 30; // 30秒倒计时
  private isDragging: boolean = false;
  private dragStart: { x: number, y: number } | null = null;
  private dragCurrent: { x: number, y: number } | null = null;

  // 玩家属性 (RPG元素)
  private playerStats: PlayerStats = {
    grade: 1,
    exp: 0,
    handSpan: 120, // 初始一扎距离
    maxForce: 800
  };

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element #game-canvas not found');

    // 初始化各个子系统
    this.renderer = new GameRenderer(this.canvas);
    this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height);
    this.audio = new AudioController();
    this.menu = new MenuSystem(this.canvas.getContext('2d')!, this.canvas.width, this.canvas.height);
    this.assets = AssetManager.getInstance();

    // 绑定系统事件
    window.addEventListener('resize', () => this.handleResize());
    
    // 绑定交互事件
    this.bindInputEvents();
    
    // 菜单回调注入
    this.menu.onStart = () => this.startGame();
    this.menu.onRestart = () => this.startGame();

    // 启动初始化流程
    this.init();
  }

  private async init() {
    await this.assets.preload();
    this.state = GameState.MENU;
    this.menu.showMainMenu();
    // 启动游戏循环
    requestAnimationFrame((t) => this.loop(t));
  }

  private handleResize() {
    this.renderer.resize();
    this.menu.resize(this.canvas.width, this.canvas.height);
    // 重置物理世界边界
    this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height);
  }

  private bindInputEvents() {
    // 鼠标事件
    this.canvas.addEventListener('mousedown', e => this.handlePointerDown(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mousemove', e => this.handlePointerMove(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mouseup', e => this.handlePointerUp(e.offsetX, e.offsetY));
    this.canvas.addEventListener('mouseleave', () => this.cancelDrag());

    // 触摸事件适配
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.handlePointerDown(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.handlePointerMove(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      if (this.isDragging && this.dragCurrent) {
         this.handlePointerUp(this.dragCurrent.x, this.dragCurrent.y);
      }
    }, { passive: false });

    // 音频上下文激活策略 (User Gesture)
    const unlockAudio = () => {
      this.audio.init();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }

  private startGame() {
    this.state = GameState.PLAYING;
    this.resetRound();
  }

  private resetRound() {
    this.bodies = [];
    this.turnPhase = TurnPhase.AIMING;
    this.currentTurn = Math.random() > 0.5 ? 'PLAYER' : 'AI'; // 随机先手
    this.turnTimer = 30;
    this.isDragging = false;
    this.dragStart = null;

    // 生成地图障碍物
    this.generateObstacles();

    // 生成弹珠 (确保不重叠)
    const pX = 100, pY = this.canvas.height / 2;
    this.createMarble(this.playerId, pX, pY, 'player');

    const eX = this.canvas.width - 100, eY = this.canvas.height / 2;
    this.createMarble(this.enemyId, eX, eY, 'enemy');

    // 播放提示音
    this.audio.playTurnSwitch();
  }

  private generateObstacles() {
    // 随机生成3-6个矩形障碍物，避开出生点
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const w = 40 + Math.random() * 60;
      const h = 40 + Math.random() * 60;
      const x = this.canvas.width * 0.25 + Math.random() * (this.canvas.width * 0.5);
      const y = this.canvas.height * 0.15 + Math.random() * (this.canvas.height * 0.7);
      
      this.bodies.push({
        id: `obs_${i}`,
        type: 'rectangle',
        x, y, width: w, height: h,
        vx: 0, vy: 0, mass: 0, isStatic: true,
        restitution: 0.5, friction: 0.5
      });
    }
  }

  private createMarble(id: string, x: number, y: number, type: 'player' | 'enemy') {
    const body: PhysicsBody = {
      id,
      type: 'circle',
      x, y,
      vx: 0, vy: 0,
      mass: 1,
      radius: 15,
      isStatic: false,
      restitution: 0.7, // 较高的弹性
      friction: 0.02,   // 较低的地面摩擦，模拟光滑地面
      onCollide: (other, force) => this.audio.playCollision(force)
    };
    this.bodies.push(body);
  }

  // --- 核心游戏循环 ---
  private loop(timestamp: number) {
    // 计算时间增量，限制最大值防止后台切回时瞬移
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.state === GameState.MENU || this.state === GameState.HELP || this.state === GameState.GAME_OVER) {
      // 菜单模式渲染
      this.menu.render(this.state === GameState.GAME_OVER ? { 
          win: this.currentTurn === 'PLAYER', 
          message: this.getEndGameMessage() 
      } : undefined);
    } else if (this.state === GameState.PLAYING) {
      // 游戏模式更新与渲染
      this.update(dt);
      this.draw();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  private getEndGameMessage(): string {
      // 返回游戏结束语
      if (this.currentTurn === 'PLAYER') {
          return `Grade ${this.playerStats.grade} Passed!`;
      } else {
          return "Marble Captured by Enemy!";
      }
  }

  private update(dt: number) {
    // 1. 物理引擎更新
    this.physics.update(this.bodies, dt);

    // 2. 检测弹珠运动状态
    const isMoving = this.bodies.some(b => !b.isStatic && (Math.abs(b.vx) > 0.1 || Math.abs(b.vy) > 0.1));

    if (this.turnPhase === TurnPhase.MOVING) {
      if (!isMoving) {
        // 运动停止，进入结算
        this.turnPhase = TurnPhase.SETTLING;
        setTimeout(() => this.settleRound(), 600); // 稍作延迟增加紧张感
      }
    } else if (this.turnPhase === TurnPhase.AIMING) {
      // 倒计时
      this.turnTimer -= dt;
      if (this.turnTimer <= 0) {
        this.switchTurn();
      }

      // AI 行为逻辑
      if (this.currentTurn === 'AI' && !this.isDragging) {
        this.handleAITurn(dt);
      }
    }
  }

  private aiThinkTime = 0;
  private handleAITurn(dt: number) {
     this.aiThinkTime += dt;
     // 模拟AI思考时间 (1.5s)
     if (this.aiThinkTime > 1.5) { 
         this.aiThinkTime = 0;
         const aiBall = this.bodies.find(b => b.id === this.enemyId);
         const playerBall = this.bodies.find(b => b.id === this.playerId);
         
         if (aiBall && playerBall) {
             // 简单AI算法：指向玩家
             const dx = playerBall.x - aiBall.x;
             const dy = playerBall.y - aiBall.y;
             const angle = Math.atan2(dy, dx);
             
             // 根据年级(难度)调整误差范围
             const errorRange = Math.max(0.05, 0.4 - this.playerStats.grade * 0.05);
             const finalAngle = angle + (Math.random() - 0.5) * errorRange;
             
             // 随机力度
             const force = 400 + Math.random() * 400; 
             
             this.shoot(aiBall, Math.cos(finalAngle) * force, Math.sin(finalAngle) * force);
         } else {
             this.switchTurn(); // 防御性编程
         }
     }
  }

  private settleRound() {
    const p = this.bodies.find(b => b.id === this.playerId);
    const e = this.bodies.find(b => b.id === this.enemyId);

    if (p && e) {
      // 核心玩法：检查是否在“一扎”范围内
      const isCapture = this.physics.checkDistance(p, e, this.playerStats.handSpan);
      
      if (isCapture) {
         // 判定胜负
         if (this.currentTurn === 'PLAYER') {
             this.handleWin();
         } else {
             this.handleLose();
         }
      } else {
         // 未产生捕获，继续游戏
         this.switchTurn();
      }
    } else {
        // 异常情况处理
        this.switchTurn();
    }
  }

  private handleWin() {
      this.audio.playWin();
      // RPG元素：增加经验
      this.playerStats.exp += 20;
      if (this.playerStats.exp >= 100) {
          this.playerStats.grade++;
          this.playerStats.exp = 0;
          this.playerStats.handSpan += 10; // 升级奖励：手变长
          this.playerStats.maxForce += 50; // 升级奖励：力气变大
      }
      
      setTimeout(() => {
          this.menu.showGameOver(true, `Captured! EXP +20`);
          this.state = GameState.GAME_OVER;
      }, 1000);
  }

  private handleLose() {
      this.audio.playLose();
      setTimeout(() => {
          this.menu.showGameOver(false, `Your marble was taken.`);
          this.state = GameState.GAME_OVER;
      }, 1000);
  }

  private switchTurn() {
    this.currentTurn = this.currentTurn === 'PLAYER' ? 'AI' : 'PLAYER';
    this.turnPhase = TurnPhase.AIMING;
    this.turnTimer = 30;
    this.aiThinkTime = 0;
    this.audio.playTurnSwitch();
  }

  private shoot(body: PhysicsBody, vx: number, vy: number) {
    body.vx = vx;
    body.vy = vy;
    this.turnPhase = TurnPhase.MOVING;
    this.audio.playShoot();
  }

  // --- 渲染代理 ---
  private draw() {
    const renderState: RenderState = {
      bodies: this.bodies,
      currentPlayerId: this.currentTurn === 'PLAYER' ? this.playerId : this.enemyId,
      isAiming: this.isDragging,
      aimStart: this.dragStart,
      aimCurrent: this.dragCurrent,
      handSpanDistance: this.playerStats.handSpan,
      gameTime: this.turnTimer,
      score: { player: this.playerStats.grade, ai: 0 },
      turn: this.currentTurn,
      phase: this.turnPhase === TurnPhase.AIMING ? 'AIMING' : (this.turnPhase === TurnPhase.MOVING ? 'MOVING' : 'SETTLING'),
      level: this.toRoman(this.playerStats.grade)
    };

    this.renderer.render(renderState);
  }

  // 辅助方法：数字转罗马数字
  private toRoman(num: number): string {
      const map: [number, string][] = [[10,'X'], [9,'IX'], [5,'V'], [4,'IV'], [1,'I']];
      let result = '';
      for (const [val, sym] of map) {
          while (num >= val) {
              result += sym;
              num -= val;
          }
      }
      return result;
  }

  // --- 输入事件处理 ---
  private handlePointerDown(x: number, y: number) {
    // 菜单状态拦截
    if (this.state !== GameState.PLAYING) {
       this.menu.handleInput(x, y);
       return;
    }

    // 仅在玩家回合且处于瞄准阶段时允许操作
    if (this.currentTurn === 'PLAYER' && this.turnPhase === TurnPhase.AIMING) {
       const p = this.bodies.find(b => b.id === this.playerId);
       if (p) {
           // 简单的点击命中检测
           const dist = Math.sqrt((x - p.x)**2 + (y - p.y)**2);
           if (dist < (p.radius || 20) * 2.5) { // 扩大点击热区
               this.isDragging = true;
               this.dragStart = { x: p.x, y: p.y }; 
               this.dragCurrent = { x, y };
           }
       }
    }
  }

  private handlePointerMove(x: number, y: number) {
      if (this.isDragging && this.dragStart) {
          this.dragCurrent = { x, y };
      }
  }

  private handlePointerUp(x: number, y: number) {
      if (this.isDragging && this.dragStart) {
          // 计算反向拉力
          const dx = this.dragStart.x - x;
          const dy = this.dragStart.y - y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          // 设定最小发射阈值，防止误触
          if (dist > 15) { 
             const maxPull = 200;
             // 力度归一化
             const power = Math.min(dist, maxPull) / maxPull; 
             const force = power * this.playerStats.maxForce;
             
             const angle = Math.atan2(dy, dx);
             const vx = Math.cos(angle) * force;
             const vy = Math.sin(angle) * force;
             
             const p = this.bodies.find(b => b.id === this.playerId);
             if (p) {
                 this.shoot(p, vx, vy);
             }
          }
          
          this.cancelDrag();
      }
  }

  private cancelDrag() {
      this.isDragging = false;
      this.dragStart = null;
      this.dragCurrent = null;
  }
}

// 游戏入口
window.onload = () => {
  try {
    new Game();
    console.log('Retro Marble Game Initialized');
  } catch (e) {
    console.error("Failed to start game:", e);
  }
};