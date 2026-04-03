// src/databus.ts

import { Vector } from "./physics";
import { GameSubState } from './GameStates';

/**
 * 游戏状态管理器 - DataBus
 * 集中管理游戏状态、物理参数、游戏对象等数据
 */
export interface GameBall
{
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
  onCollide?: ( other: any, force: number ) => void;
  
  // 技能相关属性
  isFrozen?: boolean;
  frozenEndTime?: number;
  hasShield?: boolean;
  shieldHealth?: number;
}

export interface GameObstacle
{
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
class Pool
{
  private poolDict: Map<string, any[]> = new Map();

  getItemByClass ( name: string, className: any ): any
  {
    if ( !this.poolDict.has( name ) )
    {
      this.poolDict.set( name, [] );
    }

    const pool = this.poolDict.get( name )!;
    if ( pool.length === 0 )
    {
      return new className();
    } else
    {
      return pool.shift();
    }
  }

  recover ( name: string, instance: any ): void
  {
    if ( this.poolDict.has( name ) )
    {
      this.poolDict.get( name )!.push( instance );
    } else
    {
      this.poolDict.set( name, [ instance ] );
    }
  }

  clear (): void
  {
    this.poolDict.clear();
  }

  size ( name: string ): number
  {
    return this.poolDict.get( name )?.length || 0;
  }
}

// DataBus 单例类
class DataBus
{
  private static instance: DataBus;

  public pool: Pool;

  // 游戏状态
  private currentMarble: string = 'basic_red'; // 当前使用的弹珠ID
  public frame: number = 0;
  public score: number = 10; // 初始积分
  public gameState: GameSubState = GameSubState.IDLE;
  public selectedBall: GameBall | null = null;
  public betAmount: number = 0;
  public lastClaimTime: number = 0;
  public claimCooldown: number = 3600000; // 1小时
  public claimAmount: number = 5;

  // 物理参数
  public gravity: number = 0.3;
  public friction: number = 0.95;
  public bounceDamping: number = 0.85;
  public airResistance: number = 0.95;

  // 游戏对象
  public balls: GameBall[] = [];
  public obstacles: GameObstacle[] = [];
  public finishLine = { x: 0, y: 0, width: 0, height: 0 };
  public mapHeight: number = 0;

  // 玩家属性
  public playerGrade: number = 1;
  public playerExp: number = 0;
  public handSpan: number = 20; // "一扎"距离
  public maxForce: number = 18000;

  // 游戏统计数据
  public totalGamesPlayed: number = 0;
  public totalWins: number = 0;
  public totalLosses: number = 0;
  public highestScore: number = 0;

  // 弹珠解锁状态管理
  private marbleUnlocks: { [key: string]: boolean } = {};

  // 游戏配置（为了集中管理）
  public config = {
    WIDTH: 375,
    HEIGHT: 667,
    PLAYER_RADIUS: 15,
    ENEMY_RADIUS: 15,
    OBSTACLE_COUNT: 8,
    TURN_TIME: 6,
    HAND_SPAN: 20,
    MAX_FORCE: 1800,
    BACKGROUND_COLOR: '#2c3e50',
    BACKGROUND_COLORS: [
      '#2c3e50',  // 原色：关卡1
      '#34495e',  // 稍亮：关卡2
      '#2c4a5e',  // 偏蓝：关卡3
      '#3c3e50',  // 偏紫：关卡4
      '#2c3e60',  // 深蓝：关卡5
    ],
    BALL_COLORS: {
      player: '#3498db',
      enemy: '#e74c3c'
    },
    OBSTACLE_COLOR: '#95a5a6'
  };

  private constructor ()
  {
    this.pool = new Pool();
    this.loadFromLocal();
  }
  // 获取当前弹珠ID
  public getCurrentMarble (): string
  {
    return this.currentMarble;
  }

  // 设置当前弹珠
  setCurrentMarble ( marbleId: string ): void
  {
    this.currentMarble = marbleId;
    this.saveToLocal();
  }

  // 弹珠解锁状态管理
  public isMarbleUnlocked ( marbleId: string ): boolean
  {
    return this.marbleUnlocks[marbleId] || false;
  }

  public unlockMarble ( marbleId: string ): void
  {
    this.marbleUnlocks[marbleId] = true;
    this.saveToLocal();
  }

  public getMarbleUnlocks (): { [key: string]: boolean }
  {
    return { ...this.marbleUnlocks };
  }

  public syncMarbleUnlocksFromMenu ( menuUnlocks: { [key: string]: boolean } ): void
  {
    this.marbleUnlocks = { ...menuUnlocks };
    this.saveToLocal();
  }

  // 本地存储相关
  private saveToLocal (): void
  {
    if ( typeof wx !== 'undefined' && wx.setStorageSync )
    {
      // 基础游戏数据
      wx.setStorageSync( 'score', this.score );
      wx.setStorageSync( 'currentMarble', this.currentMarble );
      wx.setStorageSync( 'playerGrade', this.playerGrade );
      wx.setStorageSync( 'playerExp', this.playerExp );
      
      // 弹珠解锁状态
      wx.setStorageSync( 'marbleUnlocks', this.marbleUnlocks );
      
      // 时间相关数据
      wx.setStorageSync( 'lastClaimTime', this.lastClaimTime );
      
      // 游戏设置和进度
      wx.setStorageSync( 'gameSettings', {
        gravity: this.gravity,
        friction: this.friction,
        bounceDamping: this.bounceDamping,
        airResistance: this.airResistance,
        handSpan: this.handSpan,
        maxForce: this.maxForce,
        claimCooldown: this.claimCooldown,
        claimAmount: this.claimAmount
      });
      
      // 统计数据
      wx.setStorageSync( 'gameStats', {
        totalGamesPlayed: this.totalGamesPlayed || 0,
        totalWins: this.totalWins || 0,
        totalLosses: this.totalLosses || 0,
        highestScore: this.highestScore || 0,
        totalMarblesUnlocked: Object.keys(this.marbleUnlocks).filter(key => this.marbleUnlocks[key]).length
      });
      
      console.log('游戏数据已保存到本地存储');
    }
  }

  private loadFromLocal (): void
  {
    if ( typeof wx !== 'undefined' && wx.getStorageSync )
    {
      const savedScore = wx.getStorageSync( 'score' );
      if ( savedScore !== undefined )
      {
        this.score = Number( savedScore ) || 0;
      }

      const savedMarble = wx.getStorageSync( 'currentMarble' );
      if ( savedMarble !== undefined )
      {
        this.currentMarble = savedMarble;
      }

      const savedGrade = wx.getStorageSync( 'playerGrade' );
      if ( savedGrade !== undefined )
      {
        this.playerGrade = Number( savedGrade ) || 1;
      }

      const savedExp = wx.getStorageSync( 'playerExp' );
      if ( savedExp !== undefined )
      {
        this.playerExp = Number( savedExp ) || 0;
      }

      const savedClaimTime = wx.getStorageSync( 'lastClaimTime' );
      if ( savedClaimTime !== undefined )
      {
        this.lastClaimTime = Number( savedClaimTime ) || 0;
      }

      // 加载弹珠解锁状态
      const marbleUnlocks = wx.getStorageSync( 'marbleUnlocks' );
      if ( marbleUnlocks !== undefined )
      {
        this.marbleUnlocks = { ...marbleUnlocks };
      }

      // 加载游戏设置
      const gameSettings = wx.getStorageSync( 'gameSettings' );
      if ( gameSettings !== undefined )
      {
        this.gravity = gameSettings.gravity || this.gravity;
        this.friction = gameSettings.friction || this.friction;
        this.bounceDamping = gameSettings.bounceDamping || this.bounceDamping;
        this.airResistance = gameSettings.airResistance || this.airResistance;
        this.handSpan = gameSettings.handSpan || this.handSpan;
        this.maxForce = gameSettings.maxForce || this.maxForce;
        this.claimCooldown = gameSettings.claimCooldown || this.claimCooldown;
        this.claimAmount = gameSettings.claimAmount || this.claimAmount;
      }

      // 加载统计数据
      const gameStats = wx.getStorageSync( 'gameStats' );
      if ( gameStats !== undefined )
      {
        this.totalGamesPlayed = gameStats.totalGamesPlayed || 0;
        this.totalWins = gameStats.totalWins || 0;
        this.totalLosses = gameStats.totalLosses || 0;
        this.highestScore = gameStats.highestScore || 0;
      }

      console.log('游戏数据已从本地存储加载');
    }
  }
  public static getInstance (): DataBus
  {
    if ( !DataBus.instance )
    {
      DataBus.instance = new DataBus();
    }
    return DataBus.instance;
  }
  /**
  * 初始化配置（在游戏开始时调用）
  */
  public initConfig ( width: number, height: number ): void
  {
    this.config.WIDTH = width;
    this.config.HEIGHT = height;
    console.log( `DataBus配置初始化: ${ width }x${ height }` );
  }
  /**
   * 重置游戏数据
   */
  reset (): void
  {
    this.frame = 0;
    this.gameState = GameSubState.IDLE;
    this.selectedBall = null;
    this.betAmount = 0;
    this.lastClaimTime = 0;
    this.claimCooldown = 3600000;
    this.claimAmount = 5;
    // 保留积分，只重置游戏状态
    // 重置物理参数
    this.gravity = 0.3;
    this.friction = 0.95;
    this.bounceDamping = 0.85;
    this.airResistance = 0.95;

    // 清空游戏对象
    this.balls = [];
    this.obstacles = [];
    this.finishLine = { x: 0, y: 0, width: 0, height: 0 };
    this.mapHeight = 0;

    // 重置玩家属性
    this.playerGrade = 1;
    this.playerExp = 0;
    this.handSpan = 120;
    this.maxForce = 18000;

    this.pool.clear();
  }

  /**
   * 回收对象到对象池
   */
  removeItem ( item: any ): void
  {
    // 这里可以根据item的类型进行回收
    if ( item.type === 'circle' )
    {
      this.pool.recover( 'ball', item );
    } else if ( item.type === 'rectangle' )
    {
      this.pool.recover( 'obstacle', item );
    }
  }

  /**
   * 创建弹珠对象（使用对象池）
   */
  createBall (
    id: string,
    x: number,
    y: number,
    type: 'player' | 'enemy',
    onCollide?: ( other: any, force: number ) => void
  ): GameBall
  {
    const ball = this.pool.getItemByClass( 'ball', Object ) as GameBall;

    ball.id = id;
    ball.type = 'circle';
    ball.x = x;
    ball.y = y;
    ball.vx = 0;
    ball.vy = 0;
    ball.mass = 1;
    ball.radius = type === 'player' ? this.config.PLAYER_RADIUS : this.config.ENEMY_RADIUS;
    ball.isStatic = false;
    ball.restitution = 0.9;
    ball.friction = 0.01;
    // 使用当前选择的弹珠颜色（仅对玩家弹珠）
    if (type === 'player') {
      ball.color = this.getCurrentMarbleColor();
    } else {
      ball.color = this.config.BALL_COLORS.enemy;
    }
    ball.isPlayer = type === 'player';
    ball.isEnemy = type === 'enemy';
    ball.hasBet = false;
    ball.finished = false;
    ball.finishTime = 0;
    ball.onCollide = onCollide;

    return ball;
  }

  /**
   * 获取当前弹珠的颜色
   */
  public getCurrentMarbleColor(): string {
    // 根据当前弹珠ID返回对应颜色
    const marbleColors: { [key: string]: string } = {
      'basic_red': '#B22222',
      'ocean_blue': '#1E90FF',
      'emerald_green': '#32CD32',
      'golden_sun': '#FFD700',
      'purple_magic': '#9370DB',
      'fire_orange': '#FF4500',
      'ice_cyan': '#00CED1',
      'shadow_black': '#2F4F4F',
      'rainbow': '#FF69B4'
    };
    
    return marbleColors[this.currentMarble] || marbleColors['basic_red'];
  }

  /**
   * 更新游戏中玩家弹珠的颜色
   */
  public updatePlayerMarbleColor(): void {
    const playerBall = this.getPlayerBall();
    if (playerBall) {
      playerBall.color = this.getCurrentMarbleColor();
      console.log(`更新玩家弹珠颜色为: ${playerBall.color}`);
    }
  }

  /**
   * 创建障碍物对象（使用对象池）
   */
  createObstacle (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): GameObstacle
  {
    const obstacle = this.pool.getItemByClass( 'obstacle', Object ) as GameObstacle;

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
  getPlayerBall (): GameBall | undefined
  {
    return this.balls.find( ball => ball.isPlayer );
  }

  /**
   * 更新最高分
   */
  public updateHighestScore(): void {
    if (this.score > this.highestScore) {
      this.highestScore = this.score;
      this.saveToLocal();
      console.log(`新最高分: ${this.highestScore}`);
    }
  }

  /**
   * 记录游戏结果
   */
  public recordGameResult(won: boolean): void {
    this.totalGamesPlayed++;
    if (won) {
      this.totalWins++;
    } else {
      this.totalLosses++;
    }
    this.updateHighestScore();
    this.saveToLocal();
    console.log(`游戏结果记录 - 总场次: ${this.totalGamesPlayed}, 胜: ${this.totalWins}, 负: ${this.totalLosses}`);
  }

  /**
   * 获取胜率
   */
  public getWinRate(): number {
    if (this.totalGamesPlayed === 0) return 0;
    return Math.round((this.totalWins / this.totalGamesPlayed) * 100);
  }

  /**
   * 获取统计数据
   */
  public getGameStats(): {
    totalGamesPlayed: number;
    totalWins: number;
    totalLosses: number;
    highestScore: number;
    winRate: number;
    totalMarblesUnlocked: number;
  } {
    return {
      totalGamesPlayed: this.totalGamesPlayed,
      totalWins: this.totalWins,
      totalLosses: this.totalLosses,
      highestScore: this.highestScore,
      winRate: this.getWinRate(),
      totalMarblesUnlocked: Object.keys(this.marbleUnlocks).filter(key => this.marbleUnlocks[key]).length
    };
  }

  /**
   * 获取敌人弹珠
   */
  getEnemyBall (): GameBall | undefined
  {
    return this.balls.find( ball => ball.isEnemy );
  }

  /**
   * 设置选中弹珠
   */
  selectBall ( ballId: string ): void
  {
    this.selectedBall = this.balls.find( ball => ball.id === ballId ) || null;

    // 重置所有弹珠的选中状态
    this.balls.forEach( ball =>
    {
      if ( ball.hasBet ) ball.hasBet = false;
    } );

    // 设置选中的弹珠
    if ( this.selectedBall )
    {
      this.selectedBall.hasBet = true;
    }
  }

  /**
   * 检查是否可以领取积分
   */
  canClaimPoints (): boolean
  {
    const now = Date.now();
    return now - this.lastClaimTime >= this.claimCooldown;
  }

  /**
   * 领取积分
   */
  claimPoints (): boolean
  {
    if ( this.canClaimPoints() )
    {
      this.score += this.claimAmount;
      this.lastClaimTime = Date.now();
      return true;
    }
    return false;
  }
  spendScore ( points: number ): boolean
  {
    if ( this.score >= points )
    {
      this.score -= points;
      this.saveToLocal();
      return true;
    }
    return false;
  }
  // 添加积分
  addScore ( points: number ): void
  {
    this.score += points;
    // 保存到本地存储
    this.saveToLocal();
  }
  /**
   * 下注
   */
  placeBet ( amount: number ): boolean
  {
    if ( !this.selectedBall )
    {
      return false;
    }

    if ( amount <= 0 || amount > this.score )
    {
      return false;
    }

    this.betAmount = amount;
    this.score -= amount;

    // 重置所有弹珠的下注状态
    this.balls.forEach( ball =>
    {
      ball.hasBet = false;
    } );

    // 设置选中的弹珠已下注
    this.selectedBall.hasBet = true;

    return true;
  }

  /**
   * 获取冷却剩余时间（毫秒）
   */
  getClaimCooldownRemaining (): number
  {
    const now = Date.now();
    const elapsed = now - this.lastClaimTime;
    return Math.max( 0, this.claimCooldown - elapsed );
  }

  /**
   * 增加经验
   */
  addExp ( amount: number ): void
  {
    this.playerExp += amount;
    // 检查是否升级
    while ( this.playerExp >= 100 )
    {
      this.playerExp -= 100;
      this.playerGrade++;
      this.handSpan += 5; // 升级增加一扎距离
      this.maxForce += 50; // 升级增加最大力量
    }
  }

  /**
   * 检查游戏是否结束
   */
  checkGameFinish (): boolean
  {
    return this.balls.every( ball => ball.finished );
  }

  /**
   * 获取排名
   */
  getRanking (): GameBall[]
  {
    return [ ...this.balls ]
      .filter( ball => ball.finished )
      .sort( ( a, b ) => ( a.finishTime || 0 ) - ( b.finishTime || 0 ) );
  }
}

// 导出单例
export default DataBus.getInstance();

// 微信小游戏需要 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataBus.getInstance();
}