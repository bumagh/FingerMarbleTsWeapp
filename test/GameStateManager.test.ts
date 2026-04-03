// test/GameStateManager.test.ts
import GameStateManager from '../src/GameStateManager';
import { GameState, MenuState, Turn, GameSubState } from '../src/GameStates';

// Mock 微信小游戏API
const mockWx = {
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn()
};

// 设置全局 wx
(global as any).wx = mockWx;

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;

  beforeEach(() => {
    // 重置单例实例
    (GameStateManager as any).instance = null;
    gameStateManager = GameStateManager.getInstance();
    jest.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = GameStateManager.getInstance();
      const instance2 = GameStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('游戏状态管理', () => {
    it('应该正确初始化游戏状态', () => {
      expect(gameStateManager.getGameState()).toBe(GameState.MENU);
      expect(gameStateManager.getMenuState()).toBe(MenuState.MAIN);
      expect(gameStateManager.getTurn()).toBe(Turn.PLAYER);
      expect(gameStateManager.getSubState()).toBe(GameSubState.IDLE);
    });

    it('应该正确设置游戏状态', () => {
      gameStateManager.setGameState(GameState.PLAYING);
      expect(gameStateManager.getGameState()).toBe(GameState.PLAYING);
    });

    it('应该验证有效的状态转换', () => {
      gameStateManager.setGameState(GameState.PLAYING);
      expect(gameStateManager.getGameState()).toBe(GameState.PLAYING);
    });

    it('应该拒绝无效的状态转换', () => {
      const initialState = gameStateManager.getGameState();
      // 尝试无效转换（从MENU直接到GAME_OVER）
      gameStateManager.setGameState(GameState.GAME_OVER);
      // 状态应该保持不变
      expect(gameStateManager.getGameState()).toBe(initialState);
    });
  });

  describe('菜单状态管理', () => {
    it('应该正确设置菜单状态', () => {
      gameStateManager.setMenuState(MenuState.HELP);
      expect(gameStateManager.getMenuState()).toBe(MenuState.HELP);
    });

    it('应该验证有效的菜单状态转换', () => {
      gameStateManager.setMenuState(MenuState.HELP);
      expect(gameStateManager.getMenuState()).toBe(MenuState.HELP);
    });
  });

  describe('回合管理', () => {
    it('应该正确设置回合', () => {
      gameStateManager.setTurn(Turn.AI);
      expect(gameStateManager.getTurn()).toBe(Turn.AI);
    });

    it('应该正确切换回合', () => {
      gameStateManager.setTurn(Turn.PLAYER);
      gameStateManager.switchTurn();
      expect(gameStateManager.getTurn()).toBe(Turn.AI);
      
      gameStateManager.switchTurn();
      expect(gameStateManager.getTurn()).toBe(Turn.PLAYER);
    });

    it('应该重置回合计时器', () => {
      gameStateManager.setTurnTimer(1000);
      gameStateManager.resetTurnTimer();
      expect(gameStateManager.getTurnTimer()).toBe(6000);
    });
  });

  describe('游戏对象管理', () => {
    const mockBall = {
      id: 'test-ball',
      type: 'circle',
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      mass: 1,
      radius: 15,
      isStatic: false,
      restitution: 0.9,
      friction: 0.01,
      color: '#3498db',
      isPlayer: true,
      isEnemy: false
    };

    const mockObstacle = {
      id: 'test-obstacle',
      type: 'rectangle',
      x: 200,
      y: 200,
      width: 50,
      height: 50,
      vx: 0,
      vy: 0,
      mass: 0,
      isStatic: true,
      restitution: 0.5,
      friction: 0.5,
      color: '#95a5a6'
    };

    it('应该正确添加和获取弹珠', () => {
      gameStateManager.addBall(mockBall as any);
      const balls = gameStateManager.getBalls();
      expect(balls).toHaveLength(1);
      expect(balls[0]).toBe(mockBall);
    });

    it('应该正确添加和获取障碍物', () => {
      gameStateManager.addObstacle(mockObstacle as any);
      const obstacles = gameStateManager.getObstacles();
      expect(obstacles).toHaveLength(1);
      expect(obstacles[0]).toBe(mockObstacle);
    });

    it('应该正确获取玩家弹珠', () => {
      gameStateManager.addBall(mockBall as any);
      const playerBall = gameStateManager.getPlayerBall();
      expect(playerBall).toBe(mockBall);
    });

    it('应该正确获取敌人弹珠', () => {
      const enemyBall = { ...mockBall, id: 'enemy-ball', isPlayer: false, isEnemy: true };
      gameStateManager.addBall(enemyBall as any);
      const foundEnemyBall = gameStateManager.getEnemyBall();
      expect(foundEnemyBall).toBe(enemyBall);
    });

    it('应该正确选择弹珠', () => {
      gameStateManager.addBall(mockBall as any);
      const selected = gameStateManager.selectBall('test-ball');
      expect(selected).toBe(true);
      expect(gameStateManager.getSelectedBall()).toBe(mockBall);
    });

    it('应该正确清除游戏对象', () => {
      gameStateManager.addBall(mockBall as any);
      gameStateManager.addObstacle(mockObstacle as any);
      gameStateManager.clearGameObjects();
      
      expect(gameStateManager.getBalls()).toHaveLength(0);
      expect(gameStateManager.getObstacles()).toHaveLength(0);
      expect(gameStateManager.getSelectedBall()).toBeNull();
    });
  });

  describe('游戏统计管理', () => {
    it('应该正确记录游戏结果', () => {
      const initialStats = gameStateManager.getGameStats();
      
      gameStateManager.recordGameResult(true);
      gameStateManager.recordGameResult(false);
      gameStateManager.recordGameResult(true);
      
      const finalStats = gameStateManager.getGameStats();
      expect(finalStats.totalGamesPlayed).toBe(3);
      expect(finalStats.totalWins).toBe(2);
      expect(finalStats.totalLosses).toBe(1);
      expect(finalStats.winRate).toBe(67); // Math.round(2/3 * 100)
    });

    it('应该正确设置最高分', () => {
      gameStateManager.setHighestScore(100);
      expect(gameStateManager.getHighestScore()).toBe(100);
      
      gameStateManager.setHighestScore(50); // 更低的分数
      expect(gameStateManager.getHighestScore()).toBe(100); // 应该保持不变
      
      gameStateManager.setHighestScore(150); // 更高的分数
      expect(gameStateManager.getHighestScore()).toBe(150); // 应该更新
    });
  });

  describe('游戏配置管理', () => {
    it('应该正确设置和获取最大力量', () => {
      gameStateManager.setMaxForce(20000);
      expect(gameStateManager.getMaxForce()).toBe(20000);
    });

    it('应该正确设置和获取手长', () => {
      gameStateManager.setHandSpan(25);
      expect(gameStateManager.getHandSpan()).toBe(25);
    });
  });

  describe('状态查询方法', () => {
    it('应该正确判断游戏是否活跃', () => {
      gameStateManager.setGameState(GameState.PLAYING);
      expect(gameStateManager.isGameActive()).toBe(true);
      
      gameStateManager.setGameState(GameState.MENU);
      expect(gameStateManager.isGameActive()).toBe(false);
    });

    it('应该正确判断是否为玩家回合', () => {
      gameStateManager.setTurn(Turn.PLAYER);
      expect(gameStateManager.isPlayerTurn()).toBe(true);
      expect(gameStateManager.isAITurn()).toBe(false);
      
      gameStateManager.setTurn(Turn.AI);
      expect(gameStateManager.isPlayerTurn()).toBe(false);
      expect(gameStateManager.isAITurn()).toBe(true);
    });

    it('应该正确判断玩家是否可以行动', () => {
      gameStateManager.setGameState(GameState.PLAYING);
      gameStateManager.setTurn(Turn.PLAYER);
      expect(gameStateManager.canPlayerAct()).toBe(true);
      
      gameStateManager.setTurn(Turn.AI);
      expect(gameStateManager.canPlayerAct()).toBe(false);
      
      gameStateManager.setGameState(GameState.MENU);
      gameStateManager.setTurn(Turn.PLAYER);
      expect(gameStateManager.canPlayerAct()).toBe(false);
    });

    it('应该正确判断菜单是否可见', () => {
      gameStateManager.setMenuState(MenuState.HELP);
      expect(gameStateManager.isMenuVisible()).toBe(true);
      
      gameStateManager.setMenuState(MenuState.NONE);
      expect(gameStateManager.isMenuVisible()).toBe(false);
    });
  });

  describe('重置方法', () => {
    it('应该正确重置所有状态', () => {
      // 设置一些状态
      gameStateManager.setGameState(GameState.PLAYING);
      gameStateManager.setMenuState(MenuState.HELP);
      gameStateManager.setTurn(Turn.AI);
      gameStateManager.setTurnTimer(1000);
      gameStateManager.addBall({ id: 'test', type: 'circle', x: 0, y: 0, vx: 0, vy: 0, mass: 1, radius: 15, isStatic: false, restitution: 0.9, friction: 0.01, color: '#fff' } as any);
      
      // 重置
      gameStateManager.reset();
      
      // 验证重置结果
      expect(gameStateManager.getGameState()).toBe(GameState.MENU);
      expect(gameStateManager.getMenuState()).toBe(MenuState.MAIN);
      expect(gameStateManager.getTurn()).toBe(Turn.PLAYER);
      expect(gameStateManager.getTurnTimer()).toBe(6000);
      expect(gameStateManager.getBalls()).toHaveLength(0);
    });
  });
});
