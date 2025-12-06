/**
 * 游戏状态管理器
 */
import Pool from './base/pool.js'

let instance

export default class DataBus {
  constructor() {
    if (instance) return instance

    instance = this

    this.pool = new Pool()
    this.reset()
  }

  reset() {
    this.frame = 0
    this.score = 10 // 增加初始积分，让玩家有更多选择
    this.gameState = 'idle' // idle, preview, betting, running, paused, finished
    this.selectedBall = null
    this.betAmount = 0
    this.lastClaimTime = 0
    this.claimCooldown = 3600000 // 1小时
    this.claimAmount = 5
    
    // 物理参数
    this.gravity = 0.6
    this.friction = 0.95
    this.bounceDamping = 0.85
    this.airResistance = 0.99
    
    this.balls = []
    this.obstacles = []
    this.finishLine = { x: 0, y: 0, width: 0, height: 0 }
    this.mapHeight = 0
    
    this.pool.clear()
  }

  /**
   * 回收对象到对象池
   */
  removeItem(item) {
    item.visible = false
  }
}