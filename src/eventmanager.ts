// src/eventmanager.ts
import { MenuSystem, MarbleType } from "./menu";
import RetroMarbleGame from "./game";
import DataBus from './databus';
import { GameState, MenuState, Turn } from './GameStates';
import GameStateManager from './GameStateManager';
import GameEventHandler from './GameEventHandler';

/**
 * 游戏事件管理器（重构版）
 * 现在作为 GameStateManager 和 GameEventHandler 的协调器
 */
export default class EventManager {
  private main: RetroMarbleGame;
  private menu: MenuSystem;
  private canvas: WechatMinigame.Canvas;
  private eventHandler: GameEventHandler;
  private gameStateManager: GameStateManager;

  constructor(mainInstance: RetroMarbleGame, canvas: WechatMinigame.Canvas, menu: MenuSystem) {
    this.main = mainInstance;
    this.menu = menu;
    this.canvas = canvas;
    
    // 初始化状态管理器和事件处理器
    this.gameStateManager = GameStateManager.getInstance();
    this.eventHandler = new GameEventHandler(canvas, menu);
    
    if (typeof (this.eventHandler as any).setButtonPositionCheckers === 'function') {
      (this.eventHandler as any).setButtonPositionCheckers(
        (x: number, y: number) => this.checkRestartButtonClick(x, y),
        (x: number, y: number) => this.checkExitButtonClick(x, y),
        (x: number, y: number) => this.checkSkillButtonClick(x, y)
      );
    }
    
    // 设置事件处理器的回调
    this.setupEventCallbacks();
  }

  /**
   * 初始化事件监听
   */
  public init(): void {
    console.log('事件管理器初始化...');
    
    // 初始化事件处理器
    this.eventHandler.init();
    
    console.log('事件管理器初始化完成');
  }

  /**
   * 解绑事件监听器
   */
  public destroy(): void {
    console.log('事件管理器销毁...');
    
    // 销毁事件处理器
    this.eventHandler.destroy();
    
    console.log('事件管理器销毁完成');
  }

  /**
   * 设置事件回调
   */
  private setupEventCallbacks(): void {
    // 游戏控制回调 - 直接调用main的方法
    this.eventHandler.onStart = () => {
      this.main.resetGame();
    };

    this.eventHandler.onRestart = () => {
      this.main.resetGame();
      this.menu.showMainMenu();
    };

    // 设置变更回调
    this.eventHandler.onSettingChange = (id: string, value: any) => {
      console.log(`设置变更: ${id} = ${value}`);
      // 可以在这里添加设置处理逻辑
    };

    // 弹珠相关回调
    this.eventHandler.onMarblePurchase = (marbleId: string) => {
      console.log(`弹珠购买: ${marbleId}`);
      const marble = this.menu.marbleStore.find((item: MarbleType) => item.id === marbleId);
      if (!marble || marble.unlocked) {
        return;
      }

      if (DataBus.spendScore(marble.cost)) {
        this.menu.unlockMarble(marbleId);
        this.menu.setCurrentMarble(marbleId);
        DataBus.setCurrentMarble(marbleId);
      }
    };

    this.eventHandler.onMarbleSelect = (marbleId: string) => {
      console.log(`弹珠选择: ${marbleId}`);
      DataBus.setCurrentMarble(marbleId);
      DataBus.updatePlayerMarbleColor();
    };

    // 游戏结果回调
    this.eventHandler.onGameWin = () => {
      console.log('游戏胜利');
      // 可以在这里添加胜利处理逻辑
    };

    this.eventHandler.onGameLose = () => {
      console.log('游戏失败');
      // 可以在这里添加失败处理逻辑
    };

    // 按钮点击回调
    this.eventHandler.onRestartClick = () => {
      this.handleRestart();
    };

    this.eventHandler.onExitClick = () => {
      this.handleExit();
    };

    this.eventHandler.onSkillActivate = (skillId: string) => {
      console.log(`技能激活: ${skillId}`);
      this.main.activateSkill(skillId);
    };
  }

  /**
   * 处理重新开始
   */
  private handleRestart(): void {
    console.log('重新开始游戏');
    this.gameStateManager.setGameState(GameState.PLAYING);
    this.main.resetGame();
    this.gameStateManager.setMenuState(MenuState.NONE);
  }

  /**
   * 处理退出
   */
  private handleExit(): void {
    console.log('退出游戏返回主菜单');
    this.main.exitGame();
  }

  /**
   * 检查重新开始按钮点击
   */
  private checkRestartButtonClick(x: number, y: number): boolean {
    const buttonRect = this.main.getRestartButtonRect();
    if (!buttonRect) return false;

    return x >= buttonRect.x &&
      x <= buttonRect.x + buttonRect.width &&
      y >= buttonRect.y &&
      y <= buttonRect.y + buttonRect.height;
  }

  /**
   * 检查退出按钮点击
   */
  private checkExitButtonClick(x: number, y: number): boolean {
    const buttonRect = this.main.getExitButtonRect();
    if (!buttonRect) return false;

    return x >= buttonRect.x &&
      x <= buttonRect.x + buttonRect.width &&
      y >= buttonRect.y &&
      y <= buttonRect.y + buttonRect.height;
  }

  /**
   * 检查技能按钮点击
   */
  private checkSkillButtonClick(x: number, y: number): void {
    const skillButtonRects = this.main.getSkillButtonRects();
    if (!skillButtonRects || skillButtonRects.length === 0) return;

    for (const buttonRect of skillButtonRects) {
      if (
        x >= buttonRect.x &&
        x <= buttonRect.x + buttonRect.width &&
        y >= buttonRect.y &&
        y <= buttonRect.y + buttonRect.height
      ) {
        if (this.eventHandler.onSkillActivate) {
          this.eventHandler.onSkillActivate(buttonRect.id);
        }
        break;
      }
    }
  }

  /**
   * 获取游戏状态管理器
   */
  public getGameStateManager(): GameStateManager {
    return this.gameStateManager;
  }

  /**
   * 获取事件处理器
   */
  public getEventHandler(): GameEventHandler {
    return this.eventHandler;
  }

  // === 向后兼容的方法 ===
  // 这些方法保持向后兼容，内部委托给 GameStateManager

  public getGameState(): GameState {
    return this.gameStateManager.getGameState();
  }

  public setGameState(state: GameState): void {
    this.gameStateManager.setGameState(state);
  }

  public getMenuState(): MenuState {
    return this.gameStateManager.getMenuState();
  }

  public setMenuState(state: MenuState): void {
    this.gameStateManager.setMenuState(state);
  }

  public getTurn(): Turn {
    return this.gameStateManager.getTurn();
  }

  public switchTurn(): void {
    this.gameStateManager.switchTurn();
  }

  public resetTurnTimer(): void {
    this.gameStateManager.resetTurnTimer();
  }

  public getBalls(): any[] {
    return this.gameStateManager.getBalls();
  }

  public getPlayerBall(): any {
    return this.gameStateManager.getPlayerBall();
  }

  public getEnemyBall(): any {
    return this.gameStateManager.getEnemyBall();
  }

  public getObstacles(): any[] {
    return this.gameStateManager.getObstacles();
  }
}
