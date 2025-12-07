// src/databus.ts

/**
 * 游戏状态管理器 - DataBus
 * 集中管理游戏状态、物理参数、游戏对象等数据
 */
export interface GameBall {
  id: string;
  type: 'circle';
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  isStatic: boolean;
  restitution: number;
  friction: number;
  color: string;
  isPlayer?: boolean;
  isEnemy?: boolean;
  hasBet?: boolean;
  finished?: boolean;
  finishTime?: number;
  onCollide?: (other: any, force: number) => void;
}

export interface GameObstacle {
  id: string;
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  mass: number;
  isStatic: boolean;
  restitution: number;
  friction: number;
  color: string;
}

// 对象池基类
class Pool {
  private poolDict: Map<string, any[]> = new Map();

  getItemByClass(name: string, className: any): any {
    if (!this.poolDict.has(name)) {
      this.poolDict.set(name, []);
    }

    const pool = this.poolDict.get(name)!;
    if (pool.length === 0) {
      return new className();
    } else {
      return pool.shift();
    }
  }

  recover(name: string, instance: any): void {
    if (this.poolDict.has(name)) {
      this.poolDict.get(name)!.push(instance);
    } else {
      this.poolDict.set(name, [instance]);
    }
  }

  clear(): void {
    this.poolDict.clear();
  }

  size(name: string): number {
    return this.poolDict.get(name)?.length || 0;
  }
}

// DataBus 单例类
class DataBus {
  private static instance: DataBus;

  public pool: Pool;

  // 游戏状态
  public frame: number = 0;
  public score: number = 10; // 初始积分
  public gameState: 'idle' | 'preview' | 'betting' | 'running' | 'paused' | 'finished' = 'idle';
  public selectedBall: GameBall | null = null;
  public betAmount: number = 0;
  public lastClaimTime: number = 0;
  public claimCooldown: number = 3600000; // 1小时
  public claimAmount: number = 5;

  // 物理参数
  public gravity: number = 0.6;
  public friction: number = 0.95;
  public bounceDamping: number = 0.85;
  public airResistance: number = 0.99;

  // 游戏对象
  public balls: GameBall[] = [];
  public obstacles: GameObstacle[] = [];
  public finishLine = { x: 0, y: 0, width: 0, height: 0 };
  public mapHeight: number = 0;

  // 玩家属性
  public playerGrade: number = 1;
  public playerExp: number = 0;
  public handSpan: number = 120; // "一扎"距离
  public maxForce: number = 800;

  // 游戏配置（为了集中管理）
  public config = {
    WIDTH: 375,
    HEIGHT: 667,
    PLAYER_RADIUS: 15,
    ENEMY_RADIUS: 15,
    OBSTACLE_COUNT: 3,
    TURN_TIME: 30,
    HAND_SPAN: 120,
    MAX_FORCE: 800,
    BACKGROUND_COLOR: '#2c3e50',
    BALL_COLORS: {
      player: '#3498db',
      enemy: '#e74c3c'
    },
    OBSTACLE_COLOR: '#95a5a6'
  };

  private constructor() {
    this.pool = new Pool();
  }

  public static getInstance(): DataBus {
    if (!DataBus.instance) {
      DataBus.instance = new DataBus();
    }
    return DataBus.instance;
  }
  /**
  * 初始化配置（在游戏开始时调用）
  */
  public initConfig(width: number, height: number): void {
    this.config.WIDTH = width;
    this.config.HEIGHT = height;
    console.log(`DataBus配置初始化: ${width}x${height}`);
  }
  /**
   * 重置游戏数据
   */
  reset(): void {
    this.frame = 0;
    this.score = 10;
    this.gameState = 'idle';
    this.selectedBall = null;
    this.betAmount = 0;
    this.lastClaimTime = 0;
    this.claimCooldown = 3600000;
    this.claimAmount = 5;

    // 重置物理参数
    this.gravity = 0.6;
    this.friction = 0.95;
    this.bounceDamping = 0.85;
    this.airResistance = 0.99;

    // 清空游戏对象
    this.balls = [];
    this.obstacles = [];
    this.finishLine = { x: 0, y: 0, width: 0, height: 0 };
    this.mapHeight = 0;

    // 重置玩家属性
    this.playerGrade = 1;
    this.playerExp = 0;
    this.handSpan = 120;
    this.maxForce = 800;

    this.pool.clear();
  }

  /**
   * 回收对象到对象池
   */
  removeItem(item: any): void {
    // 这里可以根据item的类型进行回收
    if (item.type === 'circle') {
      this.pool.recover('ball', item);
    } else if (item.type === 'rectangle') {
      this.pool.recover('obstacle', item);
    }
  }

  /**
   * 创建弹珠对象（使用对象池）
   */
  createBall(
    id: string,
    x: number,
    y: number,
    type: 'player' | 'enemy',
    onCollide?: (other: any, force: number) => void
  ): GameBall {
    const ball = this.pool.getItemByClass('ball', Object) as GameBall;

    ball.id = id;
    ball.type = 'circle';
    ball.x = x;
    ball.y = y;
    ball.vx = 0;
    ball.vy = 0;
    ball.mass = 1;
    ball.radius = type === 'player' ? this.config.PLAYER_RADIUS : this.config.ENEMY_RADIUS;
    ball.isStatic = false;
    ball.restitution = 0.7;
    ball.friction = 0.02;
    ball.color = type === 'player' ? this.config.BALL_COLORS.player : this.config.BALL_COLORS.enemy;
    ball.isPlayer = type === 'player';
    ball.isEnemy = type === 'enemy';
    ball.hasBet = false;
    ball.finished = false;
    ball.finishTime = 0;
    ball.onCollide = onCollide;

    return ball;
  }

  /**
   * 创建障碍物对象（使用对象池）
   */
  createObstacle(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): GameObstacle {
    const obstacle = this.pool.getItemByClass('obstacle', Object) as GameObstacle;

    obstacle.id = id;
    obstacle.type = 'rectangle';
    obstacle.x = x;
    obstacle.y = y;
    obstacle.width = width;
    obstacle.height = height;
    obstacle.vx = 0;
    obstacle.vy = 0;
    obstacle.mass = 0;
    obstacle.isStatic = true;
    obstacle.restitution = 0.5;
    obstacle.friction = 0.5;
    obstacle.color = this.config.OBSTACLE_COLOR;

    return obstacle;
  }

  /**
   * 获取玩家弹珠
   */
  getPlayerBall(): GameBall | undefined {
    return this.balls.find(ball => ball.isPlayer);
  }

  /**
   * 获取敌人弹珠
   */
  getEnemyBall(): GameBall | undefined {
    return this.balls.find(ball => ball.isEnemy);
  }

  /**
   * 设置选中弹珠
   */
  selectBall(ballId: string): void {
    this.selectedBall = this.balls.find(ball => ball.id === ballId) || null;

    // 重置所有弹珠的选中状态
    this.balls.forEach(ball => {
      if (ball.hasBet) ball.hasBet = false;
    });

    // 设置选中的弹珠
    if (this.selectedBall) {
      this.selectedBall.hasBet = true;
    }
  }

  /**
   * 检查是否可以领取积分
   */
  canClaimPoints(): boolean {
    const now = Date.now();
    return now - this.lastClaimTime >= this.claimCooldown;
  }

  /**
   * 领取积分
   */
  claimPoints(): boolean {
    if (this.canClaimPoints()) {
      this.score += this.claimAmount;
      this.lastClaimTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * 下注
   */
  placeBet(amount: number): boolean {
    if (!this.selectedBall) {
      return false;
    }

    if (amount <= 0 || amount > this.score) {
      return false;
    }

    this.betAmount = amount;
    this.score -= amount;

    // 重置所有弹珠的下注状态
    this.balls.forEach(ball => {
      ball.hasBet = false;
    });

    // 设置选中的弹珠已下注
    this.selectedBall.hasBet = true;

    return true;
  }

  /**
   * 获取冷却剩余时间（毫秒）
   */
  getClaimCooldownRemaining(): number {
    const now = Date.now();
    const elapsed = now - this.lastClaimTime;
    return Math.max(0, this.claimCooldown - elapsed);
  }

  /**
   * 增加经验
   */
  addExp(amount: number): void {
    this.playerExp += amount;
    // 检查是否升级
    while (this.playerExp >= 100) {
      this.playerExp -= 100;
      this.playerGrade++;
      this.handSpan += 5; // 升级增加一扎距离
      this.maxForce += 50; // 升级增加最大力量
    }
  }

  /**
   * 检查游戏是否结束
   */
  checkGameFinish(): boolean {
    return this.balls.every(ball => ball.finished);
  }

  /**
   * 获取排名
   */
  getRanking(): GameBall[] {
    return [...this.balls]
      .filter(ball => ball.finished)
      .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0));
  }
}

// 导出单例
export default DataBus.getInstance();