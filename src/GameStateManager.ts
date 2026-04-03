// src/GameStateManager.ts
import { GameState, MenuState, Turn, GameSubState, GameResult } from './GameStates';
import { GameBall, GameObstacle } from './databus';

// 导出类型供其他模块使用
export { GameBall, GameObstacle };

/**
 * 游戏状态管理器
 * 专门负责管理游戏的核心状态逻辑，与 DataBus 分离
 */
export class GameStateManager {
  private static instance: GameStateManager;

  // 游戏核心状态
  private currentGameState: GameState = GameState.MENU;
  private currentMenuState: MenuState = MenuState.MAIN;
  private currentTurn: Turn = Turn.PLAYER;
  private currentSubState: GameSubState = GameSubState.IDLE;
  private turnTimer: number = 6000; // 6秒回合计时器

  // 游戏对象引用
  private balls: GameBall[] = [];
  private obstacles: GameObstacle[] = [];
  private selectedBall: GameBall | null = null;

  // 游戏统计
  private totalGamesPlayed: number = 0;
  private totalWins: number = 0;
  private totalLosses: number = 0;
  private highestScore: number = 0;

  // 游戏配置
  private maxForce: number = 18000;
  private handSpan: number = 20;

  private constructor() {
    // 初始化状态
  }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  // === 游戏状态管理 ===
  
  public getGameState(): GameState {
    return this.currentGameState;
  }

  public setGameState(state: GameState): void {
    // 验证状态转换
    if (this.isValidGameStateTransition(this.currentGameState, state)) {
      console.log(`游戏状态转换: ${GameState[this.currentGameState]} -> ${GameState[state]}`);
      this.currentGameState = state;
    } else {
      console.warn(`无效的游戏状态转换: ${GameState[this.currentGameState]} -> ${GameState[state]}`);
    }
  }

  public getMenuState(): MenuState {
    return this.currentMenuState;
  }

  public setMenuState(state: MenuState): void {
    // 验证状态转换
    if (this.isValidMenuStateTransition(this.currentMenuState, state)) {
      console.log(`菜单状态转换: ${MenuState[this.currentMenuState]} -> ${MenuState[state]}`);
      this.currentMenuState = state;
    } else {
      console.warn(`无效的菜单状态转换: ${MenuState[this.currentMenuState]} -> ${MenuState[state]}`);
    }
  }

  public getTurn(): Turn {
    return this.currentTurn;
  }

  public setTurn(turn: Turn): void {
    console.log(`回合切换: ${Turn[this.currentTurn]} -> ${Turn[turn]}`);
    this.currentTurn = turn;
  }

  public switchTurn(): void {
    this.setTurn(this.currentTurn === Turn.PLAYER ? Turn.AI : Turn.PLAYER);
    this.resetTurnTimer();
  }

  public getSubState(): GameSubState {
    return this.currentSubState;
  }

  public setSubState(state: GameSubState): void {
    console.log(`子状态转换: ${GameSubState[this.currentSubState]} -> ${GameSubState[state]}`);
    this.currentSubState = state;
  }

  public getTurnTimer(): number {
    return this.turnTimer;
  }

  public setTurnTimer(timer: number): void {
    this.turnTimer = timer;
  }

  public resetTurnTimer(): void {
    this.turnTimer = 6000; // 重置为6秒
  }

  public decreaseTurnTimer(deltaTime: number): void {
    this.turnTimer = Math.max(0, this.turnTimer - deltaTime);
  }

  // === 游戏对象管理 ===

  public getBalls(): GameBall[] {
    return this.balls;
  }

  public setBalls(balls: GameBall[]): void {
    this.balls = balls;
  }

  public addBall(ball: GameBall): void {
    this.balls.push(ball);
  }

  public removeBall(ballId: string): void {
    this.balls = this.balls.filter(ball => ball.id !== ballId);
  }

  public getPlayerBall(): GameBall | undefined {
    return this.balls.find(ball => ball.isPlayer);
  }

  public getEnemyBall(): GameBall | undefined {
    return this.balls.find(ball => ball.isEnemy);
  }

  public getSelectedBall(): GameBall | null {
    return this.selectedBall;
  }

  public setSelectedBall(ball: GameBall | null): void {
    this.selectedBall = ball;
  }

  public selectBall(ballId: string): boolean {
    const ball = this.balls.find(b => b.id === ballId);
    if (ball) {
      this.selectedBall = ball;
      return true;
    }
    return false;
  }

  public getObstacles(): GameObstacle[] {
    return this.obstacles;
  }

  public setObstacles(obstacles: GameObstacle[]): void {
    this.obstacles = obstacles;
  }

  public addObstacle(obstacle: GameObstacle): void {
    this.obstacles.push(obstacle);
  }

  public removeObstacle(obstacleId: string): void {
    this.obstacles = this.obstacles.filter(obs => obs.id !== obstacleId);
  }

  public clearGameObjects(): void {
    this.balls = [];
    this.obstacles = [];
    this.selectedBall = null;
  }

  // === 游戏统计管理 ===

  public getTotalGamesPlayed(): number {
    return this.totalGamesPlayed;
  }

  public getTotalWins(): number {
    return this.totalWins;
  }

  public getTotalLosses(): number {
    return this.totalLosses;
  }

  public getHighestScore(): number {
    return this.highestScore;
  }

  public setHighestScore(score: number): void {
    if (score > this.highestScore) {
      this.highestScore = score;
      console.log(`新最高分: ${this.highestScore}`);
    }
  }

  public recordGameResult(won: boolean): void {
    this.totalGamesPlayed++;
    if (won) {
      this.totalWins++;
    } else {
      this.totalLosses++;
    }
    console.log(`游戏结果记录 - 总场次: ${this.totalGamesPlayed}, 胜: ${this.totalWins}, 负: ${this.totalLosses}`);
  }

  public getWinRate(): number {
    if (this.totalGamesPlayed === 0) return 0;
    return Math.round((this.totalWins / this.totalGamesPlayed) * 100);
  }

  public getGameStats(): {
    totalGamesPlayed: number;
    totalWins: number;
    totalLosses: number;
    highestScore: number;
    winRate: number;
  } {
    return {
      totalGamesPlayed: this.totalGamesPlayed,
      totalWins: this.totalWins,
      totalLosses: this.totalLosses,
      highestScore: this.highestScore,
      winRate: this.getWinRate()
    };
  }

  // === 游戏配置管理 ===

  public getMaxForce(): number {
    return this.maxForce;
  }

  public setMaxForce(force: number): void {
    this.maxForce = force;
  }

  public getHandSpan(): number {
    return this.handSpan;
  }

  public setHandSpan(span: number): void {
    this.handSpan = span;
  }

  // === 状态验证 ===

  private isValidGameStateTransition(from: GameState, to: GameState): boolean {
    // 简化的状态转换验证
    const validTransitions: Record<GameState, GameState[]> = {
      [GameState.MENU]: [GameState.PLAYING, GameState.PREVIEW],
      [GameState.PLAYING]: [GameState.AIMING, GameState.PAUSED, GameState.GAME_OVER],
      [GameState.AIMING]: [GameState.MOVING, GameState.PLAYING],
      [GameState.MOVING]: [GameState.SETTLING, GameState.GAME_OVER],
      [GameState.SETTLING]: [GameState.AIMING, GameState.PLAYING, GameState.GAME_OVER],
      [GameState.GAME_OVER]: [GameState.MENU, GameState.PLAYING],
      [GameState.PAUSED]: [GameState.PLAYING, GameState.MENU],
      [GameState.PREVIEW]: [GameState.BETTING, GameState.MENU],
      [GameState.BETTING]: [GameState.PLAYING, GameState.MENU],
      [GameState.FINISHED]: [GameState.MENU, GameState.PLAYING]
    };

    return validTransitions[from] && validTransitions[from].indexOf(to) !== -1;
  }

  private isValidMenuStateTransition(from: MenuState, to: MenuState): boolean {
    // 简化的菜单状态转换验证
    const validTransitions: Record<MenuState, MenuState[]> = {
      [MenuState.MAIN]: [MenuState.HELP, MenuState.SETTINGS, MenuState.STORE, MenuState.NONE],
      [MenuState.HELP]: [MenuState.MAIN],
      [MenuState.GAME_OVER]: [MenuState.MAIN, MenuState.STORE],
      [MenuState.SETTINGS]: [MenuState.MAIN],
      [MenuState.STORE]: [MenuState.MAIN],
      [MenuState.NONE]: [MenuState.MAIN, MenuState.HELP, MenuState.GAME_OVER, MenuState.SETTINGS, MenuState.STORE]
    };

    return validTransitions[from] && validTransitions[from].indexOf(to) !== -1;
  }

  // === 游戏状态查询 ===

  public isGameActive(): boolean {
    return this.currentGameState === GameState.PLAYING || 
           this.currentGameState === GameState.AIMING || 
           this.currentGameState === GameState.MOVING || 
           this.currentGameState === GameState.SETTLING;
  }

  public isPlayerTurn(): boolean {
    return this.currentTurn === Turn.PLAYER;
  }

  public isAITurn(): boolean {
    return this.currentTurn === Turn.AI;
  }

  public canPlayerAct(): boolean {
    return this.isGameActive() && this.isPlayerTurn();
  }

  public isMenuVisible(): boolean {
    return this.currentMenuState !== MenuState.NONE;
  }

  // === 重置方法 ===

  public reset(): void {
    this.currentGameState = GameState.MENU;
    this.currentMenuState = MenuState.MAIN;
    this.currentTurn = Turn.PLAYER;
    this.currentSubState = GameSubState.IDLE;
    this.turnTimer = 6000;
    this.selectedBall = null;
    this.clearGameObjects();
  }

  public resetGameObjects(): void {
    this.clearGameObjects();
  }
}

export default GameStateManager;
