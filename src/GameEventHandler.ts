// src/GameEventHandler.ts
import { Vector } from "./physics";
import { GameState, MenuState, Turn } from './GameStates';
import { MenuSystem, MarbleType } from './menu';
import GameStateManager from './GameStateManager';
import { GameBall, GameObstacle } from './databus';

// 创建全局实例
const gameStateManager = GameStateManager.getInstance();

/**
 * 游戏事件处理�? * 专门负责处理用户输入和游戏事件，与状态管理分�? */
export class GameEventHandler {
  private menu: MenuSystem;
  private canvas: WechatMinigame.Canvas;

  // 拖拽相关状�?  private isDragging: boolean = false;
  private dragStart: Vector | null = null;
  private dragEnd: Vector | null = null;

  // 事件回调
  public onStart: (() => void) | null = null;
  public onRestart: (() => void) | null = null;
  public onHelp: (() => void) | null = null;
  public onStore: (() => void) | null = null;
  public onSettings: (() => void) | null = null;
  public onBackToMenu: (() => void) | null = null;
  public onSettingChange: ((id: string, value: any) => void) | null = null;
  public onMarblePurchase: ((marbleId: string) => void) | null = null;
  public onMarbleSelect: ((marbleId: string) => void) | null = null;
  public onGameWin: (() => void) | null = null;
  public onGameLose: (() => void) | null = null;
  public onRestartClick: (() => void) | null = null;
  public onExitClick: (() => void) | null = null;
  public onSkillActivate: ((skillId: string) => void) | null = null;

  constructor(canvas: WechatMinigame.Canvas, menu: MenuSystem) {
    this.canvas = canvas;
    this.menu = menu;
    
    // 绑定方法的this上下�?    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * 初始化事件监�?   */
  public init(): void {
    console.log('游戏事件处理器初始化...');

    // 绑定事件监听�?    wx.onTouchStart(this.handleTouchStart);
    wx.onTouchMove(this.handleTouchMove);
    wx.onTouchEnd(this.handleTouchEnd);

    // 设置菜单回调
    this.setupMenuCallbacks();

    console.log('游戏事件处理器初始化完成');
  }

  /**
   * 解绑事件监听�?   */
  public destroy(): void {
    console.log('游戏事件处理器销�?..');

    // 解绑事件监听�?    wx.offTouchStart(this.handleTouchStart);
    wx.offTouchMove(this.handleTouchMove);
    wx.offTouchEnd(this.handleTouchEnd);

    console.log('游戏事件处理器销毁完�?);
  }

  /**
   * 设置菜单回调
   */
  private setupMenuCallbacks(): void {
    this.menu.onStart = () => {
      console.log('开始游�?);
      gameStateManager.setGameState(GameState.PLAYING);
      gameStateManager.setMenuState(MenuState.NONE);
      if (this.onStart) this.onStart();
    };

    this.menu.onRestart = () => {
      console.log('重新开�?);
      gameStateManager.setGameState(GameState.PLAYING);
      this.menu.showMainMenu();
      if (this.onRestart) this.onRestart();
    };

    this.menu.onHelp = () => {
      console.log('显示帮助');
      this.menu.showHelpMenu();
      gameStateManager.setMenuState(MenuState.HELP);
      if (this.onHelp) this.onHelp();
    };

    this.menu.onStore = () => {
      console.log('显示商店');
      this.menu.showStore();
      gameStateManager.setMenuState(MenuState.STORE);
      if (this.onStore) this.onStore();
    };

    this.menu.onSettings = () => {
      console.log('显示设置');
      this.menu.showSettings();
      gameStateManager.setMenuState(MenuState.SETTINGS);
      if (this.onSettings) this.onSettings();
    };

    this.menu.onBackToMenu = () => {
      console.log('返回主菜�?);
      this.menu.showMainMenu();
      gameStateManager.setMenuState(MenuState.MAIN);
      if (this.onBackToMenu) this.onBackToMenu();
    };

    // 设置变更回调
    this.menu.onSettingChange = (id: string, value: any) => {
      console.log(`设置变更: ${id} = ${value}`);
      if (this.onSettingChange) this.onSettingChange(id, value);
    };

    // 弹珠购买回调
    this.menu.onMarblePurchase = (marbleId: string) => {
      console.log(`尝试购买弹珠: ${marbleId}`);
      if (this.onMarblePurchase) this.onMarblePurchase(marbleId);
    };

    // 弹珠选择回调
    this.menu.onMarbleSelect = (marbleId: string) => {
      console.log(`选择弹珠: ${marbleId}`);
      if (this.onMarbleSelect) this.onMarbleSelect(marbleId);
    };
  }

  /**
   * 处理触摸开始事�?   */
  private handleTouchStart(e: any): void {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    console.log(`触摸点坐�? (${x}, ${y})`);

    const gameState = gameStateManager.getGameState();
    const menuState = gameStateManager.getMenuState();

    // 如果处于菜单状态，将事件传递给菜单系统
    if (this.isMenuState(menuState)) {
      const handled = this.menu.handleInput(x, y, menuState);
      if (handled) return;
    }

    // 处理游戏中的触摸事件
    if (this.isGameplayState(gameState)) {
      this.handleGameTouchStart(x, y);
      
      // 检查按钮点�?      if (this.checkRestartButtonClick(x, y)) {
        console.log('点击了重新开始按�?);
        if (this.onRestartClick) this.onRestartClick();
        return;
      }
      
      if (this.checkExitButtonClick(x, y)) {
        console.log('点击了退出按�?);
        if (this.onExitClick) this.onExitClick();
        return;
      }
      
      this.checkSkillButtonClick(x, y);
    }
  }

  /**
   * 处理触摸移动事件
   */
  private handleTouchMove(e: any): void {
    if (!this.isDragging) return;

    const touch = e.touches[0];
    this.dragEnd = { x: touch.clientX, y: touch.clientY };
  }

  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd(): void {
    if (!this.isDragging) return;

    this.handleGameTouchEnd();
    this.resetDragState();
  }

  /**
   * 处理游戏中的触摸开�?   */
  private handleGameTouchStart(x: number, y: number): void {
    const gameState = gameStateManager.getGameState();
    const turn = gameStateManager.getTurn();

    // 只有在玩家回合且游戏进行中时才能拖拽
    if (!this.canPlayerDrag(gameState, turn)) return;

    const player = gameStateManager.getPlayerBall();
    if (!player) return;

    // 检查是否点击了玩家弹珠
    const dist = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
    if (dist < player.radius * 2) {
      this.isDragging = true;
      this.dragStart = { x: player.x, y: player.y };
      this.dragEnd = { x, y };

      // 切换到瞄准状�?      gameStateManager.setGameState(GameState.AIMING);
    }
  }

  /**
   * 处理游戏中的触摸结束
   */
  private handleGameTouchEnd(): void {
    if (!this.dragStart || !this.dragEnd) return;

    const player = gameStateManager.getPlayerBall();
    if (!player) return;

    // 计算拖拽方向和力�?    const dx = this.dragStart.x - this.dragEnd.x;
    const dy = this.dragStart.y - this.dragEnd.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 如果拖拽距离足够大，则发射弹�?    if (dist > 15) {
      const maxForce = gameStateManager.getMaxForce();
      const power = Math.min(dist, 900) / 900;
      const force = power * maxForce;
      const angle = Math.atan2(dy, dx);

      // 应用力量到弹�?      player.vx = Math.cos(angle) * force * 0.5;
      player.vy = Math.sin(angle) * force * 0.5;

      // 记录发射信息用于调试
      console.log(`发射弹珠: 力量=${force.toFixed(1)}, 角度=${(angle * 180 / Math.PI).toFixed(1)}°`);

      // 切换到移动状态并重置回合计时�?      gameStateManager.setGameState(GameState.MOVING);
      gameStateManager.resetTurnTimer();
    } else {
      // 拖拽距离太小，返回游戏状�?      gameStateManager.setGameState(GameState.PLAYING);
      console.log('拖拽距离太小，取消发�?);
    }
  }

  /**
   * 重置拖拽状�?   */
  private resetDragState(): void {
    this.isDragging = false;
    this.dragStart = null;
    this.dragEnd = null;
  }

  /**
   * 获取拖拽状态（用于渲染�?   */
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
   * 检查重新开始按钮点�?   */
  private checkRestartButtonClick(x: number, y: number): boolean {
    // 这里需要从外部获取按钮位置信息
    // 可以通过回调函数来实�?    return false; // 暂时返回false，需要外部实�?  }

  /**
   * 检查退出按钮点�?   */
  private checkExitButtonClick(x: number, y: number): boolean {
    // 这里需要从外部获取按钮位置信息
    // 可以通过回调函数来实�?    return false; // 暂时返回false，需要外部实�?  }

  /**
   * 检查技能按钮点�?   */
  private checkSkillButtonClick(x: number, y: number): void {
    // 这里需要从外部获取技能按钮位置信�?    // 可以通过回调函数来实�?    console.log(`检查技能按钮点�? (${x}, ${y})`);
  }

  /**
   * 设置按钮位置检查器
   */
  public setButtonCheckers(
    restartChecker: (x: number, y: number) => boolean,
    exitChecker: (x: number, y: number) => boolean,
    skillChecker: (x: number, y: number) => void
  ): void {
    this.checkRestartButtonClick = restartChecker;
    this.checkExitButtonClick = exitChecker;
    this.checkSkillButtonClick = skillChecker;
  }

  /**
   * 处理胜利
   */
  public handleWin(): void {
    console.log('游戏胜利');
    gameStateManager.setMenuState(MenuState.GAME_OVER);
    this.menu.showGameOver(true, '捕获成功�?);
    if (this.onGameWin) this.onGameWin();
  }

  /**
   * 处理失败
   */
  public handleLose(): void {
    console.log('游戏失败');
    gameStateManager.setMenuState(MenuState.GAME_OVER);
    this.menu.showGameOver(false, '你的弹珠被捕获了�?);
    if (this.onGameLose) this.onGameLose();
  }

  /**
   * 切换暂停/继续
   */
  public togglePause(): void {
    const gameState = gameStateManager.getGameState();
    const menuState = gameStateManager.getMenuState();

    if (this.isGameplayState(gameState)) {
      gameStateManager.setMenuState(MenuState.MAIN);
      gameStateManager.setGameState(GameState.MENU);
    } else if (menuState === MenuState.MAIN && gameState === GameState.MENU) {
      gameStateManager.setMenuState(MenuState.NONE);
      gameStateManager.setGameState(GameState.PLAYING);
    }
  }

  // === 辅助方法 ===

  private isMenuState(state: MenuState): boolean {
    return state === MenuState.MAIN || 
           state === MenuState.HELP || 
           state === MenuState.GAME_OVER || 
           state === MenuState.SETTINGS || 
           state === MenuState.STORE;
  }

  private isGameplayState(state: GameState): boolean {
    return state === GameState.PLAYING || state === GameState.AIMING;
  }

  private canPlayerDrag(gameState: GameState, turn: Turn): boolean {
    return (gameState === GameState.AIMING || gameState === GameState.PLAYING) && turn === Turn.PLAYER;
  }

  // === AI相关方法 ===

  /**
   * 执行AI回合
   */
  public executeAITurn(): void {
    const enemy = gameStateManager.getEnemyBall();
    const player = gameStateManager.getPlayerBall();

    if (!enemy || !player) return;

    // 计算到玩家弹珠的方向和距�?    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 根据难度等级调整AI精度
    const difficulty = this.getAIDifficulty();
    let error = 0;
    let forceMultiplier = 1;

    switch (difficulty) {
      case 'easy':
        error = (Math.random() - 0.5) * 0.6;
        forceMultiplier = 0.8;
        break;
      case 'medium':
        error = (Math.random() - 0.5) * 0.3;
        forceMultiplier = 1.0;
        break;
      case 'hard':
        error = (Math.random() - 0.5) * 0.15;
        forceMultiplier = 1.2;
        break;
    }

    // 计算基础发射力量
    const maxForce = gameStateManager.getMaxForce();
    const baseForce = Math.min(600, dist * 1.5) * forceMultiplier;
    const angle = Math.atan2(dy, dx);

    // 添加智能预测
    const predictedPlayerPos = this.predictPlayerPosition(player, enemy);
    const predictedDx = predictedPlayerPos.x - enemy.x;
    const predictedDy = predictedPlayerPos.y - enemy.y;
    const predictedAngle = Math.atan2(predictedDy, predictedDy);

    // 混合使用直接瞄准和预测瞄�?    const finalAngle = angle * 0.7 + predictedAngle * 0.3 + error;

    // 应用力量到敌人弹�?    enemy.vx = Math.cos(finalAngle) * baseForce * 0.5;
    enemy.vy = Math.sin(finalAngle) * baseForce * 0.5;

    // 记录AI决策信息
    console.log(`AI发射: 难度=${difficulty}, 力量=${baseForce.toFixed(1)}, 角度=${(finalAngle * 180 / Math.PI).toFixed(1)}°`);

    // 切换到移动状态并重置回合计时�?    gameStateManager.setGameState(GameState.MOVING);
    gameStateManager.resetTurnTimer();
  }

  /**
   * 获取AI难度等级
   */
  private getAIDifficulty(): string {
    // 可以根据玩家等级返回不同难度
    // 这里简化处理，实际应该从DataBus获取玩家等级
    return 'medium';
  }

  /**
   * 预测玩家位置
   */
  private predictPlayerPosition(player: GameBall, enemy: GameBall): { x: number; y: number } {
    // 简单的位置预测
    const predictionTime = 0.5;
    const predictedX = player.x + player.vx * predictionTime * 10;
    const predictedY = player.y + player.vy * predictionTime * 10;

    return { x: predictedX, y: predictedY };
  }

  /**
   * 处理游戏回合结算
   */
  public settleRound(): void {
    const player = gameStateManager.getPlayerBall();
    const enemy = gameStateManager.getEnemyBall();

    if (!player || !enemy) return;

    // 检查是否在"一�?距离�?    const handSpan = gameStateManager.getHandSpan();
    const dist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
    const isCaptured = dist <= handSpan;

    if (isCaptured) {
      const turn = gameStateManager.getTurn();
      if (turn === Turn.PLAYER) {
        this.handleWin();
      } else {
        this.handleLose();
      }
    } else {
      // 切换回合
      gameStateManager.switchTurn();
      gameStateManager.setGameState(GameState.PLAYING);
      gameStateManager.resetTurnTimer();
    }
  }
}

export default GameEventHandler;
