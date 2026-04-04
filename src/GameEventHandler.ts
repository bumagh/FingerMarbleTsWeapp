// src/GameEventHandler.ts
import { Vector } from "./physics";
import { GameState, MenuState, Turn } from './GameStates';
import { MenuSystem, MarbleType } from './menu';
import GameStateManager from './GameStateManager';
import { GameBall, GameObstacle } from './databus';

// 创建全局实例
const gameStateManager = GameStateManager.getInstance();

/**
 * 游戏事件处理器
 * 专门负责处理用户输入和游戏事件，与状态管理器分离
 */
export default class GameEventHandler {
  private menu: MenuSystem;
  private canvas: WechatMinigame.Canvas;

  // 拖拽相关状态
  private isDragging: boolean = false;
  private dragStart: Vector | null = null;
  private dragEnd: Vector | null = null;

  // 回调函数
  public onGameStart?: () => void;
  public onGamePause?: () => void;
  public onGameResume?: () => void;
  public onGameRestart?: () => void;
  public onGameExit?: () => void;
  public onGameLose?: () => void;
  public onGameWin?: () => void;
  public onMarbleSelect?: (marbleId: string) => void;
  public onRestartClick?: () => void;
  public onExitClick?: () => void;
  public onSkillActivate?: (skillId: string) => void;
  public onSettingChange?: (id: string, value: any) => void;
  public onMarblePurchase?: (marbleId: string) => void;

  constructor(canvas: WechatMinigame.Canvas, menu: MenuSystem) {
    this.canvas = canvas;
    this.menu = menu;
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 设置菜单回调
    this.setupMenuCallbacks();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 触摸事件
    wx.onTouchStart(this.handleTouchStart.bind(this));
    wx.onTouchMove(this.handleTouchMove.bind(this));
    wx.onTouchEnd(this.handleTouchEnd.bind(this));
  }

  /**
   * 设置菜单回调
   */
  private setupMenuCallbacks(): void {
    this.menu.onStart = () => {
      console.log('开始游戏');
      gameStateManager.setGameState(GameState.PLAYING);
      gameStateManager.setMenuState(MenuState.NONE);
      if (this.onGameStart) this.onGameStart();
    };
  }

  /**
   * 处理触摸开始事件
   */
  private handleTouchStart(event: any): void {
    const touch = event.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    const gameState = gameStateManager.getGameState();
    const menuState = gameStateManager.getMenuState();

    if (this.isMenuState(menuState)) {
      // 处理菜单点击
      this.menu.handleInput(x, y, menuState);
    } else if (this.isGameplayState(gameState)) {
      // 处理游戏中的拖拽
      if (this.canPlayerDrag(gameState, gameStateManager.getTurn())) {
        this.startDrag(x, y);
      }
    }
  }

  /**
   * 处理触摸移动事件
   */
  private handleTouchMove(event: any): void {
    if (!this.isDragging) return;

    const touch = event.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    this.updateDrag(x, y);
  }

  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd(event: any): void {
    if (!this.isDragging) return;

    const touch = event.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    this.endDrag(x, y);
  }

  /**
   * 开始拖拽
   */
  private startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.dragStart = { x, y };
    this.dragEnd = { x, y };
  }

  /**
   * 更新拖拽
   */
  private updateDrag(x: number, y: number): void {
    this.dragEnd = { x, y };
  }

  /**
   * 结束拖拽
   */
  private endDrag(x: number, y: number): void {
    this.dragEnd = { x, y };
    this.isDragging = false;

    // 计算拖拽力度和方向
    if (this.dragStart) {
      const dx = this.dragStart.x - x;
      const dy = this.dragStart.y - y;
      const force = Math.sqrt(dx * dx + dy * dy);

      if (force > 10) { // 最小拖拽距离
        this.executePlayerShot(dx, dy, force);
      }
    }

    this.dragStart = null;
    this.dragEnd = null;
  }

  /**
   * 执行玩家射击
   */
  private executePlayerShot(dx: number, dy: number, force: number): void {
    const player = gameStateManager.getPlayerBall();
    if (!player) return;

    // 计算速度
    const maxSpeed = 15;
    const speed = Math.min(force / 10, maxSpeed);
    const vx = (dx / force) * speed;
    const vy = (dy / force) * speed;

    // 应用速度到玩家弹珠
    player.vx = vx;
    player.vy = vy;

    // 切换回合
    gameStateManager.switchTurn();
  }

  /**
   * 切换暂停/继续
   */
  public togglePause(): void {
    const gameState = gameStateManager.getGameState();
    const menuState = gameStateManager.getMenuState();

    if (this.isGameplayState(gameState)) {
      // 暂停游戏
      gameStateManager.setGameState(GameState.PAUSED);
      if (this.onGamePause) this.onGamePause();
    } else if (gameState === GameState.PAUSED) {
      // 继续游戏
      gameStateManager.setGameState(GameState.PLAYING);
      if (this.onGameResume) this.onGameResume();
    }
  }

  /**
   * 检查是否为菜单状态
   */
  private isMenuState(state: MenuState): boolean {
    return state === MenuState.MAIN || 
           state === MenuState.STORE || 
           state === MenuState.SETTINGS || 
           state === MenuState.HELP;
  }

  /**
   * 检查是否为游戏进行状态
   */
  private isGameplayState(state: GameState): boolean {
    return state === GameState.PLAYING || 
           state === GameState.SETTLING || 
           state === GameState.GAME_OVER;
  }

  /**
   * 检查玩家是否可以拖拽
   */
  private canPlayerDrag(gameState: GameState, turn: Turn): boolean {
    return gameState === GameState.PLAYING && turn === Turn.PLAYER;
  }

  /**
   * 执行AI回合
   */
  public executeAITurn(): void {
    const enemy = gameStateManager.getEnemyBall();
    const player = gameStateManager.getPlayerBall();
    
    if (!enemy || !player) return;

    // 简单的AI逻辑
    const difficulty = this.getAIDifficulty();
    const accuracy = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.6 : 0.9;
    
    // 计算射击目标
    const target = this.predictPlayerPosition(player, enemy);
    const dx = enemy.x - target.x;
    const dy = enemy.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 应用准确度
    const randomAngle = (Math.random() - 0.5) * (1 - accuracy) * Math.PI / 4;
    const cosAngle = Math.cos(randomAngle);
    const sinAngle = Math.sin(randomAngle);
    const adjustedDx = dx * cosAngle - dy * sinAngle;
    const adjustedDy = dx * sinAngle + dy * cosAngle;
    
    // 计算速度
    const power = Math.min(distance / 20, 12);
    const vx = (adjustedDx / distance) * power;
    const vy = (adjustedDy / distance) * power;
    
    // 应用速度到AI弹珠
    enemy.vx = vx;
    enemy.vy = vy;
    
    // 切换回合
    setTimeout(() => {
      gameStateManager.switchTurn();
    }, 1000);
  }

  /**
   * 获取AI难度
   */
  private getAIDifficulty(): string {
    // 可以根据玩家等级或其他因素调整难度
    return 'medium';
  }

  /**
   * 预测玩家位置
   */
  private predictPlayerPosition(player: GameBall, enemy: GameBall): { x: number; y: number } {
    // 简单的位置预测，可以考虑玩家的移动趋势
    return { x: player.x, y: player.y };
  }

  /**
   * 结束回合
   */
  public settleRound(): void {
    const player = gameStateManager.getPlayerBall();
    const enemy = gameStateManager.getEnemyBall();
    
    if (!player || !enemy) return;

    // 计算距离
    const distance = Math.sqrt(
      Math.pow(player.x - enemy.x, 2) + 
      Math.pow(player.y - enemy.y, 2)
    );

    // 判断胜负
    const handSpan = gameStateManager.getHandSpan();
    if (distance <= handSpan) {
      // 玩家胜利
      console.log('玩家胜利！');
      gameStateManager.setGameState(GameState.GAME_OVER);
      if (this.onGameWin) this.onGameWin();
    } else {
      // 继续游戏
      gameStateManager.setGameState(GameState.PLAYING);
    }
  }

  /**
   * 检查技能按钮点击
   */
  public checkSkillButtonClick(x: number, y: number): void {
    // 这个方法需要从游戏主类获取技能按钮位置信息
    // 可以通过回调实现
  }

  /**
   * 获取拖拽状态
   */
  public getDragState(): {
    isDragging: boolean;
    dragStart: Vector | null;
    dragEnd: Vector | null;
  } {
    return {
      isDragging: this.isDragging,
      dragStart: this.dragStart,
      dragEnd: this.dragEnd
    };
  }

  /**
   * 销毁事件处理器
   */
  public destroy(): void {
    console.log('游戏事件处理器销毁完成');

    // 移除事件监听器
    wx.offTouchStart(this.handleTouchStart);
    wx.offTouchMove(this.handleTouchMove);
    wx.offTouchEnd(this.handleTouchEnd);
  }
}
