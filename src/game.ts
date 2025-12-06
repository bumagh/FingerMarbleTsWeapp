// src/game.ts
import { PhysicsBody, Vector, PhysicsEngine } from "./physics";
import { MenuSystem } from "./menu";
import DataBus, { GameBall, GameObstacle } from "./databus";

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d')!;

// 获取 DataBus 实例
const databus = DataBus;

// 游戏状态枚举（部分状态已移到 DataBus 中）
enum GameState { MENU, PLAYING, AIMING, MOVING, SETTLING, GAME_OVER }
enum Turn { PLAYER, AI }

class RetroMarbleGame {
  private state: GameState = GameState.MENU;
  private turn: Turn = Turn.PLAYER;
  private turnTimer: number = databus.config.TURN_TIME;
  private isDragging: boolean = false;
  private dragStart: Vector | null = null;
  private dragEnd: Vector | null = null;

  private physics: PhysicsEngine;
  private menu: MenuSystem;

  constructor() {
    canvas.width = databus.config.WIDTH;
    canvas.height = databus.config.HEIGHT;
    
    // 初始化物理引擎
    this.physics = new PhysicsEngine(databus.config.WIDTH, databus.config.HEIGHT);
    
    // 初始化菜单系统
    this.menu = new MenuSystem(ctx, canvas);
    this.setupMenuCallbacks();
    
    // 初始化游戏
    this.resetGame();
    this.bindEvents();
    this.gameLoop();
  }

  private setupMenuCallbacks(): void {
    this.menu.onStart = () => {
      this.state = GameState.PLAYING;
      this.resetGame();
    };

    this.menu.onRestart = () => {
      this.state = GameState.PLAYING;
      this.resetGame();
    };

    this.menu.onHelp = () => {
      // 切换到帮助界面
      this.state = GameState.MENU;
    };

    this.menu.onBackToMenu = () => {
      this.state = GameState.MENU;
    };
  }

  private resetGame(): void {
    // 重置 DataBus
    databus.reset();
    
    // 重置游戏状态
    this.turn = Math.random() > 0.5 ? Turn.PLAYER : Turn.AI;
    this.turnTimer = databus.config.TURN_TIME;
    this.isDragging = false;
    this.dragStart = null;
    this.dragEnd = null;

    // 创建玩家弹珠
    const playerBall = databus.createBall(
      'player',
      100,
      databus.config.HEIGHT / 2,
      'player',
      (other, force) => this.handleCollision('player', force)
    );
    databus.balls.push(playerBall);

    // 创建敌人弹珠
    const enemyBall = databus.createBall(
      'enemy',
      databus.config.WIDTH - 100,
      databus.config.HEIGHT / 2,
      'enemy',
      (other, force) => this.handleCollision('enemy', force)
    );
    databus.balls.push(enemyBall);

    // 创建障碍物
    for (let i = 0; i < databus.config.OBSTACLE_COUNT; i++) {
      const width = 40 + Math.random() * 60;
      const height = 40 + Math.random() * 60;
      
      // 避免与弹珠位置重叠
      let x, y;
      let valid = false;
      while (!valid) {
        x = 80 + Math.random() * (databus.config.WIDTH - 160);
        y = 100 + Math.random() * (databus.config.HEIGHT - 200);
        
        const conflict = databus.balls.some(ball => 
          Math.abs(x - ball.x) < (width/2 + ball.radius) &&
          Math.abs(y - ball.y) < (height/2 + ball.radius)
        );
        
        if (!conflict) valid = true;
      }

      const obstacle = databus.createObstacle(
        `obstacle_${i}`,
        x, y,
        width, height
      );
      databus.obstacles.push(obstacle);
    }

    // 设置选中的弹珠（默认为玩家弹珠）
    databus.selectBall('player');
  }

  private handleCollision(type: 'player' | 'enemy', force: number): void {
    if (force > 50) {
      console.log(`${type}碰撞，力度: ${force.toFixed(1)}`);
    }
  }

  private bindEvents(): void {
    wx.onTouchStart((e) => {
      const touch = e.touches[0];
      this.handleTouchStart(touch.clientX, touch.clientY);
    });

    wx.onTouchMove((e) => {
      if (!this.isDragging) return;
      const touch = e.touches[0];
      this.dragEnd = { x: touch.clientX, y: touch.clientY };
    });

    wx.onTouchEnd(() => {
      if (this.isDragging) {
        this.handleTouchEnd();
      }
    });
  }

  private handleTouchStart(x: number, y: number): void {
    // 如果处于菜单状态，将事件传递给菜单系统
    if (this.state === GameState.MENU || this.state === GameState.GAME_OVER) {
      const handled = this.menu.handleInput(x, y);
      if (handled) return;
    }

    if (this.state !== GameState.PLAYING || this.turn !== Turn.PLAYER) return;

    const player = databus.getPlayerBall();
    if (!player) return;

    const dist = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
    if (dist < player.radius * 2) {
      this.isDragging = true;
      this.dragStart = { x: player.x, y: player.y };
      this.dragEnd = { x, y };
      this.state = GameState.AIMING;
    }
  }

  private handleTouchEnd(): void {
    if (!this.isDragging || !this.dragStart || !this.dragEnd) return;

    const player = databus.getPlayerBall();
    if (!player) return;

    const dx = this.dragStart.x - this.dragEnd.x;
    const dy = this.dragStart.y - this.dragEnd.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 15) {
      const power = Math.min(dist, 200) / 200;
      const force = power * databus.maxForce;
      const angle = Math.atan2(dy, dx);

      player.vx = Math.cos(angle) * force * 0.1;
      player.vy = Math.sin(angle) * force * 0.1;

      this.state = GameState.MOVING;
      this.turnTimer = databus.config.TURN_TIME;
    }

    this.isDragging = false;
    this.dragStart = null;
    this.dragEnd = null;
    this.state = GameState.PLAYING;
  }

  private update(dt: number): void {
    if (this.state === GameState.PLAYING || this.state === GameState.MOVING) {
      // 合并所有游戏对象用于物理更新
      const allBodies: PhysicsBody[] = [
        ...databus.balls,
        ...databus.obstacles
      ];
      
      // 更新物理引擎
      this.physics.update(allBodies, dt);
      
      // 应用额外的物理效果（重力、空气阻力等）
      databus.balls.forEach(ball => {
        if (!ball.isStatic) {
          ball.vy += databus.gravity * dt;
          ball.vx *= databus.airResistance;
          ball.vy *= databus.airResistance;
        }
      });
      
      // 检测是否静止
      const isMoving = databus.balls.some(ball => 
        !ball.isStatic && (Math.abs(ball.vx) > 0.1 || Math.abs(ball.vy) > 0.1)
      );
      
      if (this.state === GameState.MOVING && !isMoving) {
        this.state = GameState.SETTLING;
        setTimeout(() => this.settleRound(), 600);
      }
    }
    
    // AI回合逻辑
    if (this.state === GameState.PLAYING && this.turn === Turn.AI) {
      this.turnTimer -= dt;
      if (this.turnTimer <= 0) {
        this.executeAITurn();
      }
    }
  }

  private executeAITurn(): void {
    const enemy = databus.getEnemyBall();
    const player = databus.getPlayerBall();
    
    if (!enemy || !player) return;
    
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const force = Math.min(600, dist * 1.5);
    const angle = Math.atan2(dy, dx);
    
    const error = (Math.random() - 0.5) * 0.3;
    const finalAngle = angle + error;
    
    enemy.vx = Math.cos(finalAngle) * force * 0.1;
    enemy.vy = Math.sin(finalAngle) * force * 0.1;
    
    this.state = GameState.MOVING;
    this.turnTimer = databus.config.TURN_TIME;
  }

  private settleRound(): void {
    const player = databus.getPlayerBall();
    const enemy = databus.getEnemyBall();
    
    if (!player || !enemy) return;
    
    // 使用物理引擎的checkDistance方法检测"一扎"距离
    const isCaptured = this.physics.checkDistance(player, enemy, databus.handSpan);
    
    if (isCaptured) {
      if (this.turn === Turn.PLAYER) {
        this.handleWin();
      } else {
        this.handleLose();
      }
    } else {
      // 切换回合
      this.turn = this.turn === Turn.PLAYER ? Turn.AI : Turn.PLAYER;
      this.state = GameState.PLAYING;
      this.turnTimer = databus.config.TURN_TIME;
    }
  }

  private handleWin(): void {
    databus.addExp(20);
    
    this.state = GameState.GAME_OVER;
    this.menu.showGameOver(true, `捕获成功！经验+20 (等级${databus.playerGrade})`);
  }

  private handleLose(): void {
    this.state = GameState.GAME_OVER;
    this.menu.showGameOver(false, "你的弹珠被捕获了！");
  }

  private render(): void {
    // 清空画布
    ctx.clearRect(0, 0, databus.config.WIDTH, databus.config.HEIGHT);
    
    // 根据状态渲染
    if (this.state === GameState.MENU) {
      this.menu.render('MAIN');
    } else if (this.state === GameState.GAME_OVER) {
      this.menu.render('GAME_OVER');
    } else {
      // 游戏进行中，渲染游戏画面
      this.renderGame();
    }
  }

  private renderGame(): void {
    // 绘制背景
    ctx.fillStyle = databus.config.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, databus.config.WIDTH, databus.config.HEIGHT);
    
    // 绘制所有物体
    [...databus.balls, ...databus.obstacles].forEach(body => {
      ctx.save();
      
      ctx.fillStyle = body.color;
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 2;
      
      if (body.type === 'circle') {
        const ball = body as GameBall;
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 圆形高光
        ctx.beginPath();
        ctx.arc(
          ball.x - ball.radius * 0.3,
          ball.y - ball.radius * 0.3,
          ball.radius * 0.4,
          0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        
        // 如果已下注，显示特殊标记
        if (ball.hasBet) {
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (body.type === 'rectangle') {
        const obstacle = body as GameObstacle;
        
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }
      
      ctx.restore();
    });
    
    // 绘制拖拽线
    if (this.isDragging && this.dragStart && this.dragEnd) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.dragStart.x, this.dragStart.y);
      ctx.lineTo(this.dragEnd.x, this.dragEnd.y);
      ctx.stroke();
      
      const dx = this.dragStart.x - this.dragEnd.x;
      const dy = this.dragStart.y - this.dragEnd.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist, 200) / 200;
      
      ctx.fillStyle = `rgb(${Math.floor(power * 255)}, ${Math.floor((1 - power) * 255)}, 0)`;
      ctx.beginPath();
      ctx.arc(this.dragEnd.x, this.dragEnd.y, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制力量条
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(databus.config.WIDTH - 30, 20, 20, 100);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(databus.config.WIDTH - 30, 20 + (1 - power) * 100, 20, power * 100);
    }
    
    // 绘制"一扎"范围
    if (this.state === GameState.SETTLING) {
      const player = databus.getPlayerBall();
      if (player) {
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, databus.handSpan, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    
    // 绘制UI
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`等级: ${databus.playerGrade}`, 20, 30);
    ctx.fillText(`经验: ${databus.playerExp}/100`, 20, 55);
    ctx.fillText(`积分: ${databus.score}`, 20, 80);
    ctx.fillText(`回合: ${this.turn === Turn.PLAYER ? '玩家' : 'AI'}`, 20, 105);
    ctx.fillText(`时间: ${Math.max(0, this.turnTimer).toFixed(1)}s`, 20, 130);
    
    // 显示下注金额
    if (databus.betAmount > 0) {
      ctx.fillText(`下注: ${databus.betAmount}`, 20, 155);
    }
    
    // 显示一扎距离
    ctx.fillText(`一扎: ${databus.handSpan}px`, 20, 180);
  }

  private lastTime: number = 0;
  private gameLoop = (): void => {
    const current = Date.now();
    const dt = (current - this.lastTime) / 1000 || 0.016;
    this.lastTime = current;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  }

  /**
   * 外部方法：领取积分
   */
  public claimPoints(): boolean {
    if (databus.claimPoints()) {
      return true;
    }
    return false;
  }

  /**
   * 外部方法：下注
   */
  public placeBet(amount: number): boolean {
    return databus.placeBet(amount);
  }

  /**
   * 外部方法：切换暂停/继续
   */
  public togglePause(): void {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.MENU;
    } else if (this.state === GameState.MENU) {
      this.state = GameState.PLAYING;
    }
  }
}

export default RetroMarbleGame;