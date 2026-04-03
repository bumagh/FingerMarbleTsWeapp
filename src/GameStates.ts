// src/GameStates.ts
/**
 * 游戏状态统一定义
 * 统一管理所有游戏相关的状态枚举和类型定义
 */

// 游戏主要状态
export enum GameState {
  MENU = 'MENU',           // 主菜单状态
  PLAYING = 'PLAYING',     // 游戏进行中
  AIMING = 'AIMING',       // 瞄准状态
  MOVING = 'MOVING',       // 弹珠移动中
  SETTLING = 'SETTLING',   // 弹珠稳定中
  GAME_OVER = 'GAME_OVER', // 游戏结束
  PAUSED = 'PAUSED',       // 游戏暂停
  PREVIEW = 'PREVIEW',     // 预览状态
  BETTING = 'BETTING',     // 下注状态
  FINISHED = 'FINISHED'    // 游戏完成
}

// 菜单状态
export enum MenuState {
  MAIN = 'MAIN',           // 主菜单
  HELP = 'HELP',           // 帮助页面
  GAME_OVER = 'GAME_OVER', // 游戏结束菜单
  SETTINGS = 'SETTINGS',   // 设置页面
  STORE = 'STORE',         // 商店页面
  NONE = 'NONE'            // 无菜单状态
}

// 回合状态
export enum Turn {
  PLAYER = 'PLAYER',       // 玩家回合
  AI = 'AI'                // AI回合
}

// 游戏子状态（用于DataBus）
export enum GameSubState {
  IDLE = 'idle',           // 空闲
  PREVIEW = 'preview',     // 预览
  BETTING = 'betting',     // 下注
  RUNNING = 'running',     // 运行中
  PAUSED = 'paused',       // 暂停
  FINISHED = 'finished'    // 完成
}

// 游戏结果状态
export enum GameResult {
  WIN = 'WIN',             // 胜利
  LOSE = 'LOSE',           // 失败
  DRAW = 'DRAW',           // 平局
  ABANDONED = 'ABANDONED'  // 放弃
}

// 技能状态
export enum SkillState {
  READY = 'READY',         // 就绪
  COOLDOWN = 'COOLDOWN',   // 冷却中
  ACTIVE = 'ACTIVE',       // 激活中
  DISABLED = 'DISABLED'    // 禁用
}

// UI状态
export enum UIState {
  NORMAL = 'NORMAL',       // 正常
  LOADING = 'LOADING',     // 加载中
  ERROR = 'ERROR',         // 错误
  SUCCESS = 'SUCCESS'      // 成功
}

// 网络状态（为未来扩展准备）
export enum NetworkState {
  OFFLINE = 'OFFLINE',     // 离线
  ONLINE = 'ONLINE',       // 在线
  CONNECTING = 'CONNECTING', // 连接中
  SYNCING = 'SYNCING'      // 同步中
}

// 状态转换映射
export const GameStateTransitions: Record<GameState, GameState[]> = {
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

// 菜单状态转换映射
export const MenuStateTransitions: Record<MenuState, MenuState[]> = {
  [MenuState.MAIN]: [MenuState.HELP, MenuState.SETTINGS, MenuState.STORE, MenuState.NONE],
  [MenuState.HELP]: [MenuState.MAIN],
  [MenuState.GAME_OVER]: [MenuState.MAIN, MenuState.STORE],
  [MenuState.SETTINGS]: [MenuState.MAIN],
  [MenuState.STORE]: [MenuState.MAIN],
  [MenuState.NONE]: [MenuState.MAIN, MenuState.HELP, MenuState.GAME_OVER, MenuState.SETTINGS, MenuState.STORE]
};

// 状态验证函数
export function isValidGameStateTransition(from: GameState, to: GameState): boolean {
  const transitions = GameStateTransitions[from];
  return transitions ? transitions.indexOf(to) !== -1 : false;
}

export function isValidMenuStateTransition(from: MenuState, to: MenuState): boolean {
  const transitions = MenuStateTransitions[from];
  return transitions ? transitions.indexOf(to) !== -1 : false;
}

// 状态类型守卫
export function isGameState(value: string): value is GameState {
  const gameStates = [GameState.MENU, GameState.PLAYING, GameState.AIMING, GameState.MOVING, GameState.SETTLING, GameState.GAME_OVER, GameState.PAUSED, GameState.PREVIEW, GameState.BETTING, GameState.FINISHED];
  return gameStates.indexOf(value as GameState) !== -1;
}

export function isMenuState(value: string): value is MenuState {
  const menuStates = [MenuState.MAIN, MenuState.HELP, MenuState.GAME_OVER, MenuState.SETTINGS, MenuState.STORE, MenuState.NONE];
  return menuStates.indexOf(value as MenuState) !== -1;
}

export function isTurn(value: string): value is Turn {
  const turns = [Turn.PLAYER, Turn.AI];
  return turns.indexOf(value as Turn) !== -1;
}

export function isGameSubState(value: string): value is GameSubState {
  const subStates = [GameSubState.IDLE, GameSubState.PREVIEW, GameSubState.BETTING, GameSubState.RUNNING, GameSubState.PAUSED, GameSubState.FINISHED];
  return subStates.indexOf(value as GameSubState) !== -1;
}

// 状态字符串映射（用于调试和日志）
export const GameStateNames: Record<GameState, string> = {
  [GameState.MENU]: '主菜单',
  [GameState.PLAYING]: '游戏中',
  [GameState.AIMING]: '瞄准中',
  [GameState.MOVING]: '移动中',
  [GameState.SETTLING]: '稳定中',
  [GameState.GAME_OVER]: '游戏结束',
  [GameState.PAUSED]: '暂停',
  [GameState.PREVIEW]: '预览',
  [GameState.BETTING]: '下注',
  [GameState.FINISHED]: '完成'
};

export const MenuStateNames: Record<MenuState, string> = {
  [MenuState.MAIN]: '主菜单',
  [MenuState.HELP]: '帮助',
  [MenuState.GAME_OVER]: '游戏结束',
  [MenuState.SETTINGS]: '设置',
  [MenuState.STORE]: '商店',
  [MenuState.NONE]: '无菜单'
};

export const TurnNames: Record<Turn, string> = {
  [Turn.PLAYER]: '玩家',
  [Turn.AI]: 'AI'
};

// 默认导出
export default {
  GameState,
  MenuState,
  Turn,
  GameSubState,
  GameResult,
  SkillState,
  UIState,
  NetworkState,
  GameStateTransitions,
  MenuStateTransitions,
  isValidGameStateTransition,
  isValidMenuStateTransition,
  isGameState,
  isMenuState,
  isTurn,
  isGameSubState,
  GameStateNames,
  MenuStateNames,
  TurnNames
};
