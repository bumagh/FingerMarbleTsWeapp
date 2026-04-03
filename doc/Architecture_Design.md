# 架构设计文档

## 概述

本文档描述了谁是珠王微信小游戏项目的整体架构设计，包括模块划分、依赖关系、设计模式和最佳实践。

## 目录

- [架构概览](#架构概览)
- [模块架构](#模块架构)
- [设计模式](#设计模式)
- [数据流](#数据流)
- [状态管理](#状态管理)
- [事件系统](#事件系统)
- [依赖关系](#依赖关系)
- [性能考虑](#性能考虑)
- [扩展性设计](#扩展性设计)

---

## 架构概览

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        游戏主循环                              │
│                    (RetroMarbleGame)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌──────▼──────┐    ┌─────▼─────┐
│EventManager│  │GameStateManager│  │  DataBus   │
│(协调器)   │◄──►│  (状态管理)   │◄──►│(数据存储)  │
└───┬────┘    └──────┬──────┘    └─────┬─────┘
    │                │                 │
    │        ┌───────▼───────┐         │
    │        │ GameEventHandler│        │
    │        │  (事件处理)     │        │
    │        └───────┬───────┘         │
    │                │                 │
    ▼                ▼                 ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│ MenuSystem │   │ Physics │   │ GameStates│
│ (UI系统) │   │ (物理引擎)│   │ (状态定义) │
└─────────┘    └─────────┘    └─────────┘
```

### 核心原则

1. **单一职责原则**: 每个模块只负责一个特定的功能领域
2. **依赖倒置**: 高层模块不依赖低层模块，都依赖抽象
3. **开闭原则**: 对扩展开放，对修改关闭
4. **接口隔离**: 使用小而专一的接口
5. **最少知识**: 模块间通过明确的接口通信，减少耦合

---

## 模块架构

### 1. GameStateManager (游戏状态管理器)

**职责**:
- 管理游戏状态 (GameState, MenuState, Turn)
- 管理游戏对象 (balls, obstacles)
- 管理游戏统计 (wins, losses, scores)
- 提供状态转换验证

**设计模式**:
- **单例模式**: 确保全局唯一的状态管理器实例
- **状态模式**: 封装状态相关的行为

**关键特性**:
```typescript
class GameStateManager {
  private static instance: GameStateManager;
  
  // 状态管理
  private currentGameState: GameState;
  private currentMenuState: MenuState;
  private currentTurn: Turn;
  
  // 游戏对象
  private balls: GameBall[];
  private obstacles: GameObstacle[];
  
  // 统计数据
  private totalGamesPlayed: number;
  private totalWins: number;
  private totalLosses: number;
}
```

### 2. GameEventHandler (游戏事件处理器)

**职责**:
- 处理用户输入 (触摸事件)
- 管理拖拽状态
- 处理菜单交互
- 执行AI逻辑
- 处理游戏回合结算

**设计模式**:
- **观察者模式**: 通过回调函数通知外部模块
- **策略模式**: 不同的事件处理策略

**关键特性**:
```typescript
class GameEventHandler {
  // 拖拽状态
  private isDragging: boolean;
  private dragStart: Vector | null;
  private dragEnd: Vector | null;
  
  // 事件回调
  public onStart: (() => void) | null;
  public onGameWin: (() => void) | null;
  public onGameLose: (() => void) | null;
}
```

### 3. EventManager (事件管理器)

**职责**:
- 作为 GameStateManager 和 GameEventHandler 的协调器
- 提供向后兼容的API接口
- 管理模块间的通信

**设计模式**:
- **外观模式**: 为复杂的子系统提供简化接口
- **适配器模式**: 保持向后兼容性

### 4. DataBus (数据总线)

**职责**:
- 数据持久化存储
- 配置管理
- 弹珠解锁状态管理
- 积分和经验管理

**设计模式**:
- **单例模式**: 全局数据访问点
- **数据映射对象**: 数据存储和对象映射

### 5. GameStates (游戏状态定义)

**职责**:
- 定义所有状态枚举
- 提供状态验证函数
- 提供类型守卫

**设计模式**:
- **枚举模式**: 类型安全的状态定义
- **工厂模式**: 状态验证和创建

---

## 设计模式

### 1. 单例模式 (Singleton)

**应用场景**: GameStateManager, DataBus

**目的**: 确保全局唯一实例，统一状态管理

```typescript
export class GameStateManager {
  private static instance: GameStateManager;
  
  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }
  
  private constructor() {}
}
```

### 2. 观察者模式 (Observer)

**应用场景**: GameEventHandler 的事件回调系统

**目的**: 解耦事件产生者和处理者

```typescript
class GameEventHandler {
  public onGameWin: (() => void) | null = null;
  public onGameLose: (() => void) | null = null;
  
  private handleWin(): void {
    if (this.onGameWin) {
      this.onGameWin();
    }
  }
}
```

### 3. 状态模式 (State)

**应用场景**: GameStateManager 的状态管理

**目的**: 封装状态相关的行为

```typescript
enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  AIMING = 'AIMING',
  MOVING = 'MOVING',
  GAME_OVER = 'GAME_OVER'
}

class GameStateManager {
  private isValidGameStateTransition(from: GameState, to: GameState): boolean {
    // 状态转换验证逻辑
  }
}
```

### 4. 外观模式 (Facade)

**应用场景**: EventManager 作为协调器

**目的**: 简化复杂子系统的接口

```typescript
class EventManager {
  // 为外部提供简化的接口
  public getGameState(): GameState {
    return this.gameStateManager.getGameState();
  }
  
  public setGameState(state: GameState): void {
    this.gameStateManager.setGameState(state);
  }
}
```

---

## 数据流

### 游戏循环数据流

```
用户输入 → GameEventHandler → GameStateManager → 游戏逻辑渲染
    ↑                                              ↓
    └─────────── EventManager ◄──────────────────────┘
```

### 状态转换流程

```
1. 用户操作 (触摸/点击)
   ↓
2. GameEventHandler.handleTouchStart()
   ↓
3. 验证操作合法性
   ↓
4. GameStateManager.setGameState()
   ↓
5. 状态转换验证
   ↓
6. 更新游戏状态
   ↓
7. 触发相应回调
   ↓
8. 更新UI/渲染
```

### 数据持久化流程

```
游戏数据变化 → DataBus.saveToLocal() → wx.setStorageSync() → 本地存储
本地存储读取 → wx.getStorageSync() → DataBus.loadFromLocal() → 游戏数据
```

---

## 状态管理

### 状态层次结构

```
GameState (游戏主状态)
├── MENU (主菜单)
├── PLAYING (游戏中)
├── AIMING (瞄准)
├── MOVING (移动)
├── SETTLING (稳定)
├── GAME_OVER (结束)
├── PAUSED (暂停)
├── PREVIEW (预览)
├── BETTING (下注)
└── FINISHED (完成)

MenuState (菜单状态)
├── MAIN (主菜单)
├── HELP (帮助)
├── GAME_OVER (结束菜单)
├── SETTINGS (设置)
├── STORE (商店)
└── NONE (无菜单)

Turn (回合状态)
├── PLAYER (玩家)
└── AI (AI)

GameSubState (子状态)
├── IDLE (空闲)
├── PREVIEW (预览)
├── BETTING (下注)
├── RUNNING (运行)
├── PAUSED (暂停)
└── FINISHED (完成)
```

### 状态转换规则

```typescript
const GameStateTransitions: Record<GameState, GameState[]> = {
  [GameState.MENU]: [GameState.PLAYING, GameState.PREVIEW],
  [GameState.PLAYING]: [GameState.AIMING, GameState.PAUSED, GameState.GAME_OVER],
  [GameState.AIMING]: [GameState.MOVING, GameState.PLAYING],
  [GameState.MOVING]: [GameState.SETTLING, GameState.GAME_OVER],
  [GameState.SETTLING]: [GameState.AIMING, GameState.PLAYING, GameState.GAME_OVER],
  [GameState.GAME_OVER]: [GameState.MENU, GameState.PLAYING],
  // ... 其他状态转换规则
};
```

---

## 事件系统

### 事件类型

1. **用户输入事件**
   - 触摸开始 (onTouchStart)
   - 触摸移动 (onTouchMove)
   - 触摸结束 (onTouchEnd)

2. **游戏控制事件**
   - 游戏开始 (onStart)
   - 游戏重新开始 (onRestart)
   - 游戏暂停/继续 (togglePause)

3. **菜单事件**
   - 显示帮助 (onHelp)
   - 显示设置 (onSettings)
   - 显示商店 (onStore)
   - 返回主菜单 (onBackToMenu)

4. **游戏结果事件**
   - 游戏胜利 (onGameWin)
   - 游戏失败 (onGameLose)

5. **弹珠事件**
   - 弹珠购买 (onMarblePurchase)
   - 弹珠选择 (onMarbleSelect)

### 事件处理流程

```
1. 用户交互
   ↓
2. GameEventHandler 捕获事件
   ↓
3. 验证事件有效性
   ↓
4. 更新 GameStateManager
   ↓
5. 触发相应回调
   ↓
6. 更新 UI/渲染
```

---

## 依赖关系

### 模块依赖图

```
RetroMarbleGame
    │
    ├── EventManager
    │   ├── GameStateManager
    │   │   └── GameStates
    │   ├── GameEventHandler
    │   │   ├── GameStateManager
    │   │   └── GameStates
    │   └── MenuSystem
    │
    ├── DataBus
    │   └── GameStates
    │
    ├── Physics
    │   └── GameStates
    │
    └── MenuSystem
        └── GameStates
```

### 依赖注入原则

1. **高层模块不依赖低层模块**
2. **抽象不依赖细节，细节依赖抽象**
3. **通过接口进行模块通信**

---

## 性能考虑

### 1. 对象池模式

**应用场景**: GameBall 和 GameObstacle 的创建和销毁

```typescript
class Pool {
  private poolDict: Map<string, any[]> = new Map();
  
  getItemByClass(name: string, className: any): any {
    const pool = this.poolDict.get(name);
    if (pool && pool.length > 0) {
      return pool.shift();
    }
    return new className();
  }
  
  recover(name: string, instance: any): void {
    const pool = this.poolDict.get(name);
    if (pool) {
      pool.push(instance);
    }
  }
}
```

### 2. 防抖和节流

**应用场景**: 触摸事件处理

```typescript
class GameEventHandler {
  private lastTouchTime: number = 0;
  private readonly TOUCH_DEBOUNCE = 16; // 60fps
  
  private handleTouchStart(e: any): void {
    const now = Date.now();
    if (now - this.lastTouchTime < this.TOUCH_DEBOUNCE) {
      return; // 防抖
    }
    this.lastTouchTime = now;
    // 处理触摸事件
  }
}
```

### 3. 内存管理

- 及时清理事件监听器
- 回收不用的游戏对象
- 避免内存泄漏

---

## 扩展性设计

### 1. 插件系统架构

```typescript
interface GamePlugin {
  name: string;
  version: string;
  init(gameState: GameStateManager): void;
  destroy(): void;
}

class PluginManager {
  private plugins: Map<string, GamePlugin> = new Map();
  
  registerPlugin(plugin: GamePlugin): void {
    this.plugins.set(plugin.name, plugin);
    plugin.init(GameStateManager.getInstance());
  }
}
```

### 2. 技能系统扩展

```typescript
interface Skill {
  id: string;
  name: string;
  cooldown: number;
  activate(gameState: GameStateManager): void;
}

class SkillManager {
  private skills: Map<string, Skill> = new Map();
  
  registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }
  
  activateSkill(skillId: string): void {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.activate(GameStateManager.getInstance());
    }
  }
}
```

### 3. AI策略扩展

```typescript
interface AIStrategy {
  name: string;
  execute(gameState: GameStateManager): void;
}

class AIManager {
  private strategies: Map<string, AIStrategy> = new Map();
  
  registerStrategy(strategy: AIStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }
  
  executeStrategy(name: string): void {
    const strategy = this.strategies.get(name);
    if (strategy) {
      strategy.execute(GameStateManager.getInstance());
    }
  }
}
```

---

## 测试策略

### 1. 单元测试

- **GameStateManager**: 测试状态管理逻辑
- **GameEventHandler**: 测试事件处理逻辑
- **DataBus**: 测试数据持久化

### 2. 集成测试

- 测试模块间交互
- 测试状态转换流程
- 测试事件处理流程

### 3. 端到端测试

- 测试完整游戏流程
- 测试用户交互场景
- 测试数据持久化

---

## 部署和构建

### 1. TypeScript 编译

```json
{
  "compilerOptions": {
    "target": "ES5",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### 2. 构建流程

```
1. TypeScript 编译
2. 代码压缩
3. 资源优化
4. 微信小游戏打包
```

---

## 维护和监控

### 1. 日志系统

```typescript
class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;
  
  static debug(message: string): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }
  
  static info(message: string): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`);
    }
  }
  
  static error(message: string): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`);
    }
  }
}
```

### 2. 性能监控

```typescript
class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  
  update(): void {
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastTime >= 1000) {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
      
      if (fps < 30) {
        Logger.warn(`Low FPS detected: ${fps}`);
      }
    }
  }
}
```

---

## 总结

本架构设计遵循了现代软件工程的最佳实践，通过模块化、单一职责、依赖倒置等原则，创建了一个可维护、可扩展、高性能的游戏架构。

### 关键优势

1. **模块化**: 清晰的模块划分，便于维护和扩展
2. **类型安全**: 使用 TypeScript 确保类型安全
3. **性能优化**: 对象池、防抖等性能优化技术
4. **测试友好**: 模块间低耦合，便于单元测试
5. **向后兼容**: 保持现有API的兼容性

### 未来扩展方向

1. **插件系统**: 支持第三方插件
2. **网络功能**: 多人对战支持
3. **AI增强**: 更智能的AI策略
4. **性能优化**: 进一步的性能提升
5. **可视化工具**: 调试和监控工具

这个架构为谁是珠王微信小游戏提供了坚实的技术基础，支持未来的功能扩展和性能优化需求。
