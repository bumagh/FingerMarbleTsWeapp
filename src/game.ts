// src/game.ts
import { PhysicsBody, PhysicsEngine } from "./physics";
import { MenuSystem, MenuState } from "./menu";
import DataBus, { GameBall, GameObstacle } from "./databus";
import EventManager from "./eventmanager";
import { getScreenInfo } from "./screen";

const canvas = wx.createCanvas();
const ctx = canvas.getContext( '2d' );

// 获取 DataBus 实例
const databus = DataBus;

// 游戏状态枚举
enum GameState { MENU, PLAYING, AIMING, MOVING, SETTLING, GAME_OVER }
enum Turn { PLAYER, AI }

class RetroMarbleGame
{
  private restartButtonRect: { x: number, y: number, width: number, height: number } | null = null;
  private state: GameState = GameState.MENU;
  private turn: Turn = Turn.PLAYER;
  private turnTimer: number = databus.config.TURN_TIME;

  private physics: PhysicsEngine;
  private menu: MenuSystem;
  private eventManager: EventManager;

  // 添加菜单状态变量
  private menuState: MenuState = 'MAIN';

  constructor ()
  {

    // 初始化物理引擎
    this.physics = new PhysicsEngine( databus.config.WIDTH, databus.config.HEIGHT );

    // 初始化菜单系统
    this.menu = new MenuSystem( ctx, canvas );

    // 初始化事件管理器
    this.eventManager = new EventManager( this, canvas, this.menu );
    this.eventManager.init();

    // 初始化游戏
    this.resetGame();
    this.gameLoop();
  }

  public resetGame (): void
  {
    // 重置 DataBus
    databus.reset();
    var info = getScreenInfo();
    databus.initConfig( info.width, info.height );
    // 重置游戏状态
    this.turn = Math.random() > 0.5 ? Turn.PLAYER : Turn.AI;
    this.turnTimer = databus.config.TURN_TIME;

    // 创建玩家弹珠
    const playerBall = databus.createBall(
      'player',
      100,
      databus.config.HEIGHT / 2,
      'player',
      ( other, force ) => this.handleCollision( 'player', force )
    );
    databus.balls.push( playerBall );

    // 创建敌人弹珠
    const enemyBall = databus.createBall(
      'enemy',
      databus.config.WIDTH - 100,
      databus.config.HEIGHT / 2,
      'enemy',
      ( other, force ) => this.handleCollision( 'enemy', force )
    );
    databus.balls.push( enemyBall );

    // 创建障碍物
    for ( let i = 0; i < databus.config.OBSTACLE_COUNT; i++ )
    {
      const width = 40 + Math.random() * 60;
      const height = 40 + Math.random() * 60;

      // 避免与弹珠位置重叠
      let x, y;
      let valid = false;
      while ( !valid )
      {
        x = 80 + Math.random() * ( databus.config.WIDTH - 160 );
        y = 100 + Math.random() * ( databus.config.HEIGHT - 200 );

        const conflict = databus.balls.some( ball =>
          Math.abs( x - ball.x ) < ( width / 2 + ball.radius ) &&
          Math.abs( y - ball.y ) < ( height / 2 + ball.radius )
        );

        if ( !conflict ) valid = true;
      }

      const obstacle = databus.createObstacle(
        `obstacle_${ i }`,
        x, y,
        width, height
      );
      databus.obstacles.push( obstacle );
    }

    // 设置选中的弹珠（默认为玩家弹珠）
    databus.selectBall( 'player' );
  }

  private handleCollision ( type: 'player' | 'enemy', force: number ): void
  {
    if ( force > 50 )
    {
      console.log( `${ type }碰撞，力度: ${ force.toFixed( 1 ) }` );
    }
  }

  private update ( dt: number ): void
  {
    // 只有在游戏进行中才更新物理
    if ( this.state === GameState.PLAYING || this.state === GameState.AIMING ||
      this.state === GameState.MOVING || this.state === GameState.SETTLING )
    {
      // 合并所有游戏对象用于物理更新
      const allBodies: PhysicsBody[] = [
        ...databus.balls,
        ...databus.obstacles
      ];

      // 更新物理引擎
      this.physics.update( allBodies, dt );

      // 应用额外的物理效果（重力、空气阻力等）
      databus.balls.forEach( ball =>
      {
        if ( !ball.isStatic )
        {
          ball.vy += databus.gravity * dt;
          ball.vx *= databus.airResistance;
          ball.vy *= databus.airResistance;
        }
      } );

      // 调试：打印当前状态和回合
      if ( Date.now() % 1000 < 50 )
      { // 每1秒打印一次
        console.log( `[状态] ${ GameState[ this.state ] }, [回合] ${ Turn[ this.turn ] }` );
      }
      // 检测是否静止
      const isMoving = databus.balls.some( ball =>
        !ball.isStatic && ( Math.abs( ball.vx ) > 0.1 || Math.abs( ball.vy ) > 0.1 )
      );
      if ( this.state === GameState.MOVING && !isMoving )
      {
        console.log( "this.state === GameState.MOVING to SETTLING" );
        this.state = GameState.SETTLING;
        setTimeout( () => this.eventManager.settleRound(), 100 );
      }
    }

    // AI回合逻辑
    if ( this.state === GameState.PLAYING && this.turn === Turn.AI )
    {
      this.turnTimer -= dt;
      if ( this.turnTimer <= 0 )
      {
        this.eventManager.executeAITurn();
      }
    }
  }

  private render (): void
  {
    // 清空画布
    ctx.clearRect( 0, 0, databus.config.WIDTH, databus.config.HEIGHT );

    // 首先渲染游戏场景（无论什么状态都渲染背景和游戏元素）
    this.renderGame();

    // 然后在顶部渲染菜单（如果有）
    // 渲染菜单（如果需要）
    if ( this.state === GameState.MENU || this.state === GameState.GAME_OVER )
    {
      this.menu.render( this.menuState );
    }
    // 添加重新开始按钮
    this.renderRestartButton();
  }
  // 添加新的渲染方法
  private renderRestartButton (): void
  {
    const buttonWidth = 100;
    const buttonHeight = 40;
    const buttonX = databus.config.WIDTH - buttonWidth - 20;
    const buttonY = 20;

    // 绘制按钮背景
    ctx.fillStyle = 'rgba(231, 76, 60, 0.8)'; // 红色
    ctx.fillRect( buttonX, buttonY, buttonWidth, buttonHeight );

    // 绘制按钮边框
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 2;
    ctx.strokeRect( buttonX, buttonY, buttonWidth, buttonHeight );

    // 绘制按钮文字
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '重新开始',
      buttonX + buttonWidth / 2,
      buttonY + buttonHeight / 2
    );

    // 存储按钮位置信息用于点击检测
    this.restartButtonRect = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    };
  }
  private renderGame (): void
  {
    // 绘制背景
    ctx.fillStyle = databus.config.BACKGROUND_COLOR;
    ctx.fillRect( 0, 0, databus.config.WIDTH, databus.config.HEIGHT );

    // 绘制所有物体
    [ ...databus.balls, ...databus.obstacles ].forEach( body =>
    {
      ctx.save();

      ctx.fillStyle = body.color;
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 2;

      if ( body.type === 'circle' )
      {
        const ball = body as GameBall;

        ctx.beginPath();
        ctx.arc( ball.x, ball.y, ball.radius, 0, Math.PI * 2 );
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
        if ( ball.hasBet )
        {
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath();
          ctx.arc( ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2 );
          ctx.fill();
        }
      } else if ( body.type === 'rectangle' )
      {
        const obstacle = body as GameObstacle;

        ctx.fillRect( obstacle.x, obstacle.y, obstacle.width, obstacle.height );
        ctx.strokeRect( obstacle.x, obstacle.y, obstacle.width, obstacle.height );
      }

      ctx.restore();
    } );

    // 绘制拖拽线（从事件管理器获取拖拽状态）
    const dragState = this.eventManager.getDragState();
    if ( dragState.isDragging && dragState.dragStart && dragState.dragEnd )
    {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo( dragState.dragStart.x, dragState.dragStart.y );
      ctx.lineTo( dragState.dragEnd.x, dragState.dragEnd.y );
      ctx.stroke();

      const dx = dragState.dragStart.x - dragState.dragEnd.x;
      const dy = dragState.dragStart.y - dragState.dragEnd.y;
      const dist = Math.sqrt( dx * dx + dy * dy );
      const power = Math.min( dist, 200 ) / 200;

      ctx.fillStyle = `rgb(${ Math.floor( power * 255 ) }, ${ Math.floor( ( 1 - power ) * 255 ) }, 0)`;
      ctx.beginPath();
      ctx.arc( dragState.dragEnd.x, dragState.dragEnd.y, 10, 0, Math.PI * 2 );
      ctx.fill();

      // 绘制力量条
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect( databus.config.WIDTH - 30, 20, 20, 100 );
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect( databus.config.WIDTH - 30, 20 + ( 1 - power ) * 100, 20, power * 100 );
    }

    // 绘制"一扎"范围
    if ( this.state === GameState.SETTLING )
    {
      const player = databus.getPlayerBall();
      if ( player )
      {
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash( [ 5, 5 ] );
        ctx.beginPath();
        ctx.arc( player.x, player.y, databus.handSpan, 0, Math.PI * 2 );
        ctx.stroke();
        ctx.setLineDash( [] );
      }
    }

    // 绘制UI - 只在游戏进行中显示
    if ( this.state !== GameState.MENU && this.state !== GameState.GAME_OVER )
    {
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText( `等级: ${ databus.playerGrade }`, 20, 30 );
      ctx.fillText( `经验: ${ databus.playerExp }/100`, 20, 55 );
      ctx.fillText( `积分: ${ databus.score }`, 20, 80 );
      ctx.fillText( `回合: ${ this.turn === Turn.PLAYER ? '玩家' : 'AI' }`, 20, 105 );
      ctx.fillText( `时间: ${ Math.max( 0, this.turnTimer ).toFixed( 1 ) }s`, 20, 130 );

      // 显示下注金额
      if ( databus.betAmount > 0 )
      {
        ctx.fillText( `下注: ${ databus.betAmount }`, 20, 155 );
      }

      // 显示一扎距离
      ctx.fillText( `一扎: ${ databus.handSpan }px`, 20, 180 );
    }
  }

  private lastTime: number = 0;
  private gameLoop = (): void =>
  {
    const current = Date.now();
    const dt = ( current - this.lastTime ) / 1000 || 0.016;
    this.lastTime = current;

    this.update( dt );
    this.render();

    requestAnimationFrame( this.gameLoop );
  }

  /**
   * 获取游戏状态
   */
  public getState (): GameState
  {
    return this.state;
  }

  /**
   * 设置游戏状态
   */
  public setState ( state: GameState ): void
  {
    this.state = state;
  }

  /**
   * 获取菜单状态
   */
  public getMenuState (): MenuState
  {
    return this.menuState;
  }

  /**
   * 设置菜单状态
   */
  public setMenuState ( state: MenuState ): void
  {
    this.menuState = state;
    if ( state !== 'NONE' )
    {
      this.state = GameState.MENU;
    }
  }

  /**
   * 获取当前回合
   */
  public getTurn (): Turn
  {
    return this.turn;
  }

  /**
   * 切换回合
   */
  public switchTurn (): void
  {
    this.turn = this.turn === Turn.PLAYER ? Turn.AI : Turn.PLAYER;
  }

  /**
   * 重置回合计时器
   */
  public resetTurnTimer (): void
  {
    this.turnTimer = databus.config.TURN_TIME;
  }

  /**
   * 获取物理引擎
   */
  public getPhysicsEngine (): PhysicsEngine
  {
    return this.physics;
  }

  /**
   * 外部方法：领取积分
   */
  public claimPoints (): boolean
  {
    if ( databus.claimPoints() )
    {
      return true;
    }
    return false;
  }

  /**
   * 外部方法：下注
   */
  public placeBet ( amount: number ): boolean
  {
    return databus.placeBet( amount );
  }

  /**
   * 外部方法：切换暂停/继续
   */
  public togglePause (): void
  {
    this.eventManager.togglePause();
  }

  // 添加获取重新开始按钮信息的方法
  public getRestartButtonRect (): { x: number, y: number, width: number, height: number } | null
  {
    // 这个方法需要在 RetroMarbleGame 中实现
    return this.restartButtonRect;
  }
}

export default RetroMarbleGame;