// src/eventmanager.ts
import { Vector } from "./physics";
import { MenuSystem, MenuState } from "./menu";
import DataBus from "./databus";
import RetroMarbleGame from "./game";
// 游戏状态枚举
enum GameState { MENU, PLAYING, AIMING, MOVING, SETTLING, GAME_OVER }
enum Turn { PLAYER, AI }
/**
 * 游戏事件管理器
 * 负责处理所有UI交互和游戏事件
 */
export default class EventManager
{
  private main: RetroMarbleGame;
  private databus: typeof DataBus;
  private menu: MenuSystem;
  private canvas: WechatMinigame.Canvas;

  // 拖拽相关状态
  private isDragging: boolean = false;
  private dragStart: Vector | null = null;
  private dragEnd: Vector | null = null;

  constructor ( mainInstance: RetroMarbleGame, canvas: WechatMinigame.Canvas, menu: MenuSystem )
  {
    this.main = mainInstance;
    this.databus = DataBus;
    this.menu = menu;
    this.canvas = canvas;

    // 绑定方法的this上下文
    this.handleTouchStart = this.handleTouchStart.bind( this );
    this.handleTouchMove = this.handleTouchMove.bind( this );
    this.handleTouchEnd = this.handleTouchEnd.bind( this );
  }

  /**
   * 初始化事件监听
   */
  public init (): void
  {
    console.log( '事件管理器初始化...' );

    // 绑定事件监听器
    wx.onTouchStart( this.handleTouchStart );
    wx.onTouchMove( this.handleTouchMove );
    wx.onTouchEnd( this.handleTouchEnd );

    // 设置菜单回调
    this.setupMenuCallbacks();

    console.log( '事件管理器初始化完成' );
  }

  /**
   * 设置菜单回调
   */
  private setupMenuCallbacks (): void
  {
    this.menu.onStart = () =>
    {
      console.log( '开始游戏' );
      this.main.setState( GameState.PLAYING );
      this.main.resetGame();
      this.main.setMenuState( 'NONE' );
    };

    this.menu.onRestart = () =>
    {
      console.log( '重新开始' );
      this.main.setState( GameState.PLAYING );
      this.main.resetGame();
    };

    this.menu.onHelp = () =>
    {
      console.log( '显示帮助' );
      this.main.setMenuState( 'HELP' );
    };

    this.menu.onBackToMenu = () =>
    {
      console.log( '返回主菜单' );
      this.main.setMenuState( 'MAIN' );
    };
  }

  /**
   * 处理触摸开始事件
   */
  private handleTouchStart ( e: any ): void
  {
    const touch = e.touches[ 0 ];
    const x = touch.clientX;
    const y = touch.clientY;
    console.log( `触摸点坐标: (${ x }, ${ y })` );
    // 获取当前游戏状态
    const gameState = this.main.getState();
    const menuState = this.main.getMenuState();

    // 如果处于菜单状态，将事件传递给菜单系统
    if ( menuState === 'MAIN' || menuState === 'HELP' || menuState === 'GAME_OVER' )
    {
      const handled = this.menu.handleInput( x, y );
      if ( handled ) return;
    }

    // 处理游戏中的触摸事件
    if ( gameState === GameState.PLAYING || gameState === GameState.AIMING )
    {
      this.handleGameTouchStart( x, y );
      // 检查是否点击了重新开始按钮
      if ( this.checkRestartButtonClick( x, y ) )
      {
        console.log( '点击了重新开始按钮' );
        this.handleRestart();
        return;
      }
    }
  }
  // 添加处理重新开始的方法
  private handleRestart (): void
  {
    console.log( '重新开始游戏' );
    this.main.setState( GameState.PLAYING );
    this.main.resetGame();
    this.main.setMenuState( 'NONE' );
  }
  // 添加检查重新开始按钮点击的方法
  private checkRestartButtonClick ( x: number, y: number ): boolean
  {
    // 需要从 main 获取按钮位置信息
    const buttonRect = this.main.getRestartButtonRect();
    if ( !buttonRect ) return false;

    return (
      x >= buttonRect.x &&
      x <= buttonRect.x + buttonRect.width &&
      y >= buttonRect.y &&
      y <= buttonRect.y + buttonRect.height
    );
  }
  /**
   * 处理游戏中的触摸开始
   */
  private handleGameTouchStart ( x: number, y: number ): void
  {
    const gameState = this.main.getState();
    const turn = this.main.getTurn();

    // 只有在玩家回合且游戏进行中时才能拖拽
    if ( ( gameState !== GameState.AIMING && gameState !== GameState.PLAYING ) || turn !== Turn.PLAYER ) return;

    const player = this.databus.getPlayerBall();
    if ( !player ) return;

    // 检查是否点击了玩家弹珠
    const dist = Math.sqrt( ( x - player.x ) ** 2 + ( y - player.y ) ** 2 );
    if ( dist < player.radius * 2 )
    {
      this.isDragging = true;
      this.dragStart = { x: player.x, y: player.y };
      this.dragEnd = { x, y };

      // 切换到瞄准状态
      this.main.setState( GameState.AIMING );
    }
  }

  /**
   * 处理触摸移动事件
   */
  private handleTouchMove ( e: any ): void
  {
    if ( !this.isDragging ) return;

    const touch = e.touches[ 0 ];
    this.dragEnd = { x: touch.clientX, y: touch.clientY };
  }

  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd (): void
  {
    if ( !this.isDragging ) return;

    this.handleGameTouchEnd();
    this.resetDragState();
  }

  /**
   * 处理游戏中的触摸结束
   */
  private handleGameTouchEnd (): void
  {
    if ( !this.dragStart || !this.dragEnd ) return;

    const player = this.databus.getPlayerBall();
    if ( !player ) return;

    // 计算拖拽方向和力量
    const dx = this.dragStart.x - this.dragEnd.x;
    const dy = this.dragStart.y - this.dragEnd.y;
    const dist = Math.sqrt( dx * dx + dy * dy );

    // 如果拖拽距离足够大，则发射弹珠
    if ( dist > 15 )
    {
      const power = Math.min( dist, 900 ) / 900;
      const force = power * this.databus.maxForce;
      const angle = Math.atan2( dy, dx );

      // 应用力量到弹珠
      player.vx = Math.cos( angle ) * force * 0.5;
      player.vy = Math.sin( angle ) * force * 0.5;

      // 切换到移动状态并重置回合计时器
      this.main.setState( GameState.MOVING );
      this.main.resetTurnTimer();
    }

    // 返回游戏状态
    // this.main.setState( GameState.PLAYING );
  }

  /**
   * 重置拖拽状态
   */
  private resetDragState (): void
  {
    this.isDragging = false;
    this.dragStart = null;
    this.dragEnd = null;
  }

  /**
   * 获取拖拽状态（用于渲染）
   */
  public getDragState ():
    {
      isDragging: boolean;
      dragStart: Vector | null;
      dragEnd: Vector | null;
    }
  {
    return {
      isDragging: this.isDragging,
      dragStart: this.dragStart,
      dragEnd: this.dragEnd
    };
  }

  /**
   * 处理AI回合
   */
  public executeAITurn (): void
  {
    const enemy = this.databus.getEnemyBall();
    const player = this.databus.getPlayerBall();

    if ( !enemy || !player ) return;

    // 计算到玩家弹珠的方向和距离
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt( dx * dx + dy * dy );

    // 计算发射力量（随距离增加，但有上限）
    const force = Math.min( 600, dist * 1.5 );
    const angle = Math.atan2( dy, dx );

    // 添加一些随机误差，使AI不那么完美
    const error = ( Math.random() - 0.5 ) * 0.3;
    const finalAngle = angle + error;

    // 应用力量到敌人弹珠
    enemy.vx = Math.cos( finalAngle ) * force * 0.5;
    enemy.vy = Math.sin( finalAngle ) * force * 0.5;

    // 切换到移动状态并重置回合计时器
    this.main.setState( GameState.MOVING );
    this.main.resetTurnTimer();
  }

  /**
   * 处理胜利
   */
  public handleWin (): void
  {
    this.databus.addExp( 20 );
    this.main.setMenuState( 'GAME_OVER' );
    this.menu.showGameOver( true, `捕获成功！经验+20 (等级${ this.databus.playerGrade })` );
  }

  /**
   * 处理失败
   */
  public handleLose (): void
  {
    this.main.setMenuState( 'GAME_OVER' );
    this.menu.showGameOver( false, "你的弹珠被捕获了！" );
  }

  /**
   * 切换暂停/继续
   */
  public togglePause (): void
  {
    const gameState = this.main.getState();
    const menuState = this.main.getMenuState();

    if ( gameState === GameState.PLAYING || gameState === GameState.MOVING || gameState === GameState.SETTLING )
    {
      this.main.setMenuState( 'MAIN' );
      this.main.setState( GameState.MENU );
    } else if ( menuState === 'MAIN' && gameState === GameState.MENU )
    {
      this.main.setMenuState( 'NONE' );
      this.main.setState( GameState.PLAYING );
    }
  }

  /**
   * 处理游戏回合结算
   */
  public settleRound (): void
  {
    const player = this.databus.getPlayerBall();
    const enemy = this.databus.getEnemyBall();

    if ( !player || !enemy ) return;

    // 检查是否在"一扎"距离内
    const physics = this.main.getPhysicsEngine();
    const isCaptured = physics.checkDistance( player, enemy, this.databus.handSpan );

    if ( isCaptured )
    {
      const turn = this.main.getTurn();
      if ( turn === Turn.PLAYER )
      {
        this.handleWin();
      } else
      {
        this.handleLose();
      }
    } else
    {
      // 切换回合
      this.main.switchTurn();
      this.main.setState( GameState.PLAYING );
      this.main.resetTurnTimer();
    }
  }
}