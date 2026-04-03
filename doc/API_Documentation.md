# API 文档

## 概述

本文档描述了谁是珠王微信小游戏项目的核心 API 接口，包括各个模块的公共方法和使用示例。

## 目录

- [GameStateManager](#gamestatemanager)
- [GameEventHandler](#gameeventhandler)
- [EventManager](#eventmanager)
- [DataBus](#databus)
- [GameStates](#gamestates)

---

## GameStateManager

游戏状态管理器，采用单例模式，负责管理游戏的核心状态和游戏对象。

### 类定义

```typescript
export class GameStateManager {
  private static instance: GameStateManager;
  
  // 单例获取方法
  public static getInstance(): GameStateManager;
}
```

### 游戏状态管理

#### `getGameState(): GameState`
获取当前游戏状态。

**返回值**: `GameState` - 当前游戏状态枚举值

**示例**:
```typescript
const gameState = GameStateManager.getInstance().getGameState();
console.log('当前游戏状态:', gameState);
```

#### `setGameState(state: GameState): void`
设置游戏状态，包含状态转换验证。

**参数**:
- `state: GameState` - 要设置的游戏状态

**示例**:
```typescript
const gameStateManager = GameStateManager.getInstance();
gameStateManager.setGameState(GameState.PLAYING);
```

#### `getMenuState(): MenuState`
获取当前菜单状态。

**示例**:
```typescript
const menuState = GameStateManager.getInstance().getMenuState();
```

#### `setMenuState(state: MenuState): void`
设置菜单状态，包含状态转换验证。

**示例**:
```typescript
gameStateManager.setMenuState(MenuState.HELP);
```

#### `getTurn(): Turn`
获取当前回合状态。

**示例**:
```typescript
const currentTurn = GameStateManager.getInstance().getTurn();
```

#### `setTurn(turn: Turn): void`
设置回合状态。

**示例**:
```typescript
gameStateManager.setTurn(Turn.AI);
```

#### `switchTurn(): void`
切换回合（玩家 <-> AI）。

**示例**:
```typescript
gameStateManager.switchTurn();
```

#### `getTurnTimer(): number`
获取回合计时器剩余时间（毫秒）。

**示例**:
```typescript
const remainingTime = gameStateManager.getTurnTimer();
```

#### `resetTurnTimer(): void`
重置回合计时器到初始值（6秒）。

**示例**:
```typescript
gameStateManager.resetTurnTimer();
```

#### `decreaseTurnTimer(deltaTime: number): void`
减少回合计时器时间。

**参数**:
- `deltaTime: number` - 要减少的时间（毫秒）

**示例**:
```typescript
gameStateManager.decreaseTurnTimer(16); // 假设60FPS，每帧约16ms
```

### 游戏对象管理

#### `getBalls(): GameBall[]`
获取所有弹珠对象。

**返回值**: `GameBall[]` - 弹珠对象数组

**示例**:
```typescript
const balls = gameStateManager.getBalls();
console.log('弹珠数量:', balls.length);
```

#### `addBall(ball: GameBall): void`
添加弹珠对象。

**参数**:
- `ball: GameBall` - 要添加的弹珠对象

**示例**:
```typescript
const newBall: GameBall = {
  id: 'player-1',
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
  isPlayer: true
};
gameStateManager.addBall(newBall);
```

#### `removeBall(ballId: string): void`
移除指定ID的弹珠。

**参数**:
- `ballId: string` - 弹珠ID

**示例**:
```typescript
gameStateManager.removeBall('player-1');
```

#### `getPlayerBall(): GameBall | undefined`
获取玩家弹珠对象。

**示例**:
```typescript
const playerBall = gameStateManager.getPlayerBall();
if (playerBall) {
  console.log('玩家弹珠位置:', playerBall.x, playerBall.y);
}
```

#### `getEnemyBall(): GameBall | undefined`
获取敌人弹珠对象。

**示例**:
```typescript
const enemyBall = gameStateManager.getEnemyBall();
```

#### `getSelectedBall(): GameBall | null`
获取当前选中的弹珠。

**示例**:
```typescript
const selectedBall = gameStateManager.getSelectedBall();
```

#### `setSelectedBall(ball: GameBall | null): void`
设置选中的弹珠。

**示例**:
```typescript
gameStateManager.setSelectedBall(playerBall);
```

#### `selectBall(ballId: string): boolean`
选择指定ID的弹珠。

**参数**:
- `ballId: string` - 弹珠ID

**返回值**: `boolean` - 是否成功选中

**示例**:
```typescript
const success = gameStateManager.selectBall('player-1');
```

### 游戏统计管理

#### `getGameStats(): GameStats`
获取游戏统计数据。

**返回值**:
```typescript
interface GameStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  highestScore: number;
  winRate: number;
}
```

**示例**:
```typescript
const stats = gameStateManager.getGameStats();
console.log(`胜率: ${stats.winRate}%`);
```

#### `recordGameResult(won: boolean): void`
记录游戏结果。

**参数**:
- `won: boolean` - 是否获胜

**示例**:
```typescript
gameStateManager.recordGameResult(true); // 记录胜利
```

#### `setHighestScore(score: number): void`
设置最高分。

**参数**:
- `score: number` - 分数

**示例**:
```typescript
gameStateManager.setHighestScore(1500);
```

### 游戏配置管理

#### `getMaxForce(): number`
获取最大发射力量。

**示例**:
```typescript
const maxForce = gameStateManager.getMaxForce();
```

#### `setMaxForce(force: number): void`
设置最大发射力量。

**示例**:
```typescript
gameStateManager.setMaxForce(20000);
```

#### `getHandSpan(): number`
获取"一扎"距离。

**示例**:
```typescript
const handSpan = gameStateManager.getHandSpan();
```

#### `setHandSpan(span: number): void`
设置"一扎"距离。

**示例**:
```typescript
gameStateManager.setHandSpan(25);
```

### 状态查询方法

#### `isGameActive(): boolean`
判断游戏是否处于活跃状态。

**示例**:
```typescript
if (gameStateManager.isGameActive()) {
  // 游戏进行中的逻辑
}
```

#### `isPlayerTurn(): boolean`
判断是否为玩家回合。

**示例**:
```typescript
if (gameStateManager.isPlayerTurn()) {
  // 玩家回合的逻辑
}
```

#### `isAITurn(): boolean`
判断是否为AI回合。

**示例**:
```typescript
if (gameStateManager.isAITurn()) {
  // AI回合的逻辑
}
```

#### `canPlayerAct(): boolean`
判断玩家是否可以行动。

**示例**:
```typescript
if (gameStateManager.canPlayerAct()) {
  // 允许玩家操作
}
```

#### `isMenuVisible(): boolean`
判断菜单是否可见。

**示例**:
```typescript
if (!gameStateManager.isMenuVisible()) {
  // 隐藏菜单时的逻辑
}
```

### 重置方法

#### `reset(): void`
重置所有游戏状态和对象。

**示例**:
```typescript
gameStateManager.reset(); // 重置游戏
```

#### `clearGameObjects(): void`
清除所有游戏对象。

**示例**:
```typescript
gameStateManager.clearGameObjects();
```

---

## GameEventHandler

游戏事件处理器，负责处理用户输入和游戏事件。

### 类定义

```typescript
export class GameEventHandler {
  constructor(canvas: WechatMinigame.Canvas, menu: MenuSystem);
}
```

### 事件回调

#### `onStart: (() => void) | null`
游戏开始回调。

#### `onRestart: (() => void) | null`
游戏重新开始回调。

#### `onHelp: (() => void) | null`
显示帮助回调。

#### `onStore: (() => void) | null`
显示商店回调。

#### `onSettings: (() => void) | null`
显示设置回调。

#### `onBackToMenu: (() => void) | null`
返回主菜单回调。

#### `onSettingChange: ((id: string, value: any) => void) | null`
设置变更回调。

#### `onMarblePurchase: ((marbleId: string) => void) | null`
弹珠购买回调。

#### `onMarbleSelect: ((marbleId: string) => void) | null`
弹珠选择回调。

#### `onGameWin: (() => void) | null`
游戏胜利回调。

#### `onGameLose: (() => void) | null`
游戏失败回调。

#### `onRestartClick: (() => void) | null`
重新开始按钮点击回调。

#### `onExitClick: (() => void) | null`
退出按钮点击回调。

#### `onSkillActivate: ((skillId: string) => void) | null`
技能激活回调。

### 初始化和销毁

#### `init(): void`
初始化事件监听。

**示例**:
```typescript
const eventHandler = new GameEventHandler(canvas, menu);
eventHandler.init();
```

#### `destroy(): void`
销毁事件监听。

**示例**:
```typescript
eventHandler.destroy();
```

### 游戏控制

#### `handleWin(): void`
处理游戏胜利。

**示例**:
```typescript
eventHandler.handleWin();
```

#### `handleLose(): void`
处理游戏失败。

**示例**:
```typescript
eventHandler.handleLose();
```

#### `togglePause(): void`
切换暂停/继续。

**示例**:
```typescript
eventHandler.togglePause();
```

### AI相关

#### `executeAITurn(): void`
执行AI回合。

**示例**:
```typescript
eventHandler.executeAITurn();
```

#### `settleRound(): void`
处理游戏回合结算。

**示例**:
```typescript
eventHandler.settleRound();
```

### 拖拽状态

#### `getDragState(): DragState`
获取拖拽状态。

**返回值**:
```typescript
interface DragState {
  isDragging: boolean;
  dragStart: Vector | null;
  dragEnd: Vector | null;
}
```

**示例**:
```typescript
const dragState = eventHandler.getDragState();
if (dragState.isDragging) {
  // 绘制瞄准线
}
```

---

## EventManager

事件管理器（重构版），作为 GameStateManager 和 GameEventHandler 的协调器。

### 类定义

```typescript
export default class EventManager {
  constructor(mainInstance: RetroMarbleGame, canvas: WechatMinigame.Canvas, menu: MenuSystem);
}
```

### 初始化和销毁

#### `init(): void`
初始化事件管理器。

**示例**:
```typescript
const eventManager = new EventManager(game, canvas, menu);
eventManager.init();
```

#### `destroy(): void`
销毁事件管理器。

**示例**:
```typescript
eventManager.destroy();
```

### 状态管理（委托给 GameStateManager）

#### `getGameState(): GameState`
#### `setGameState(state: GameState): void`
#### `getMenuState(): MenuState`
#### `setMenuState(state: MenuState): void`
#### `getTurn(): Turn`
#### `switchTurn(): void`
#### `resetTurnTimer(): void`

### 游戏对象管理（委托给 GameStateManager）

#### `getBalls(): GameBall[]`
#### `getPlayerBall(): GameBall`
#### `getEnemyBall(): GameBall`
#### `getObstacles(): GameObstacle[]`

### 获取管理器

#### `getGameStateManager(): GameStateManager`
获取游戏状态管理器实例。

#### `getEventHandler(): GameEventHandler`
获取事件处理器实例。

---

## DataBus

数据总线，负责数据存储、配置管理和本地持久化。

### 类定义

```typescript
export default class DataBus {
  public static getInstance(): DataBus;
}
```

### 弹珠管理

#### `getCurrentMarble(): string`
获取当前使用的弹珠ID。

#### `setCurrentMarble(marbleId: string): void`
设置当前使用的弹珠。

#### `isMarbleUnlocked(marbleId: string): boolean`
检查弹珠是否已解锁。

#### `unlockMarble(marbleId: string): void`
解锁弹珠。

#### `getMarbleUnlocks(): { [key: string]: boolean }`
获取所有弹珠解锁状态。

#### `getCurrentMarbleColor(): string`
获取当前弹珠颜色。

#### `updatePlayerMarbleColor(): void`
更新游戏中玩家弹珠颜色。

### 积分管理

#### `addScore(amount: number): void`
增加积分。

#### `spendScore(amount: number): boolean`
消费积分。

#### `getScore(): number`
获取当前积分。

### 经验管理

#### `addExp(amount: number): void`
增加经验值。

#### `getExp(): number`
获取当前经验值。

#### `getGrade(): number`
获取当前等级。

### 本地存储

#### `saveToLocal(): void`
保存数据到本地存储。

#### `loadFromLocal(): void`
从本地存储加载数据。

---

## GameStates

游戏状态定义模块，包含所有状态枚举和类型定义。

### 枚举类型

#### `GameState`
游戏主状态枚举：
- `MENU` - 主菜单
- `PLAYING` - 游戏进行中
- `AIMING` - 瞄准状态
- `MOVING` - 弹珠移动中
- `SETTLING` - 弹珠稳定中
- `GAME_OVER` - 游戏结束
- `PAUSED` - 游戏暂停
- `PREVIEW` - 预览状态
- `BETTING` - 下注状态
- `FINISHED` - 游戏完成

#### `MenuState`
菜单状态枚举：
- `MAIN` - 主菜单
- `HELP` - 帮助页面
- `GAME_OVER` - 游戏结束菜单
- `SETTINGS` - 设置页面
- `STORE` - 商店页面
- `NONE` - 无菜单状态

#### `Turn`
回合状态枚举：
- `PLAYER` - 玩家回合
- `AI` - AI回合

#### `GameSubState`
游戏子状态枚举：
- `IDLE` - 空闲
- `PREVIEW` - 预览
- `BETTING` - 下注
- `RUNNING` - 运行中
- `PAUSED` - 暂停
- `FINISHED` - 完成

### 工具函数

#### `isValidGameStateTransition(from: GameState, to: GameState): boolean`
验证游戏状态转换是否有效。

#### `isValidMenuStateTransition(from: MenuState, to: MenuState): boolean`
验证菜单状态转换是否有效。

#### `isGameState(value: string): value is GameState`
类型守卫：检查值是否为有效的游戏状态。

#### `isMenuState(value: string): value is MenuState`
类型守卫：检查值是否为有效的菜单状态。

#### `isTurn(value: string): value is Turn`
类型守卫：检查值是否为有效的回合状态。

### 使用示例

```typescript
import { GameState, MenuState, Turn } from './GameStates';

// 设置游戏状态
const gameState: GameState = GameState.PLAYING;

// 验证状态转换
if (isValidGameStateTransition(GameState.MENU, GameState.PLAYING)) {
  // 执行状态转换
}

// 类型守卫使用
const stateStr = 'PLAYING';
if (isGameState(stateStr)) {
  // TypeScript 知道 stateStr 是 GameState 类型
  console.log(stateStr); // 可以安全使用
}
```

---

## 使用示例

### 完整的游戏初始化流程

```typescript
import GameStateManager from './GameStateManager';
import GameEventHandler from './GameEventHandler';
import EventManager from './eventmanager';
import { GameState, MenuState } from './GameStates';

// 1. 获取游戏状态管理器
const gameStateManager = GameStateManager.getInstance();

// 2. 创建事件处理器
const eventHandler = new GameEventHandler(canvas, menu);

// 3. 设置事件回调
eventHandler.onStart = () => {
  console.log('游戏开始');
  gameStateManager.setGameState(GameState.PLAYING);
};

eventHandler.onGameWin = () => {
  console.log('游戏胜利');
  gameStateManager.recordGameResult(true);
  gameStateManager.setMenuState(MenuState.GAME_OVER);
};

// 4. 创建事件管理器
const eventManager = new EventManager(game, canvas, menu);

// 5. 初始化
eventManager.init();

// 6. 游戏循环
function gameLoop() {
  // 更新游戏逻辑
  if (gameStateManager.isGameActive()) {
    // 处理游戏逻辑
  }
  
  // 渲染
  render();
  
  requestAnimationFrame(gameLoop);
}

function render() {
  // 获取拖拽状态用于渲染
  const dragState = eventHandler.getDragState();
  
  // 渲染游戏场景
  // ...
}
```

### 状态转换示例

```typescript
const gameStateManager = GameStateManager.getInstance();

// 从菜单开始游戏
gameStateManager.setGameState(GameState.PLAYING);
gameStateManager.setMenuState(MenuState.NONE);

// 玩家瞄准
gameStateManager.setGameState(GameState.AIMING);

// 发射弹珠
gameStateManager.setGameState(GameState.MOVING);

// 弹珠停止
gameStateManager.setGameState(GameState.SETTLING);

// 切换回合
gameStateManager.switchTurn();
gameStateManager.setGameState(GameState.PLAYING);
```

---

## 注意事项

1. **单例模式**: GameStateManager 使用单例模式，确保全局只有一个实例。
2. **状态验证**: 所有状态转换都会进行有效性验证，无效转换会被忽略。
3. **事件回调**: 使用事件回调时，确保在不需要时设置为 null 以避免内存泄漏。
4. **类型安全**: 使用 TypeScript 提供的守卫函数确保类型安全。
5. **向后兼容**: EventManager 保持向后兼容，现有代码可以继续使用。

---

## 更新日志

### v1.0.0 (2024-04-03)
- 初始版本
- 重构 EventManager 和 DataBus
- 添加 GameStateManager 和 GameEventHandler
- 统一状态定义到 GameStates 模块
