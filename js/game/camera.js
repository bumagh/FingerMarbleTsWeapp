/**
 * 相机类
 */
export default class Camera {
  constructor(canvasWidth, canvasHeight, mapHeight) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.mapHeight = mapHeight
    this.offsetY = 0
    this.targetY = 0
    this.smoothing = 0.08
    this.switchDelayTimestamp = null
    
    // 预览动画相关
    this.previewProgress = 0
    this.previewDirection = 1 // 1: 向下, -1: 向上
  }

  update(balls, selectedBall, gameState, previewDuration = 0, previewElapsed = 0) {
    if (gameState === 'preview') {
      // 地图预览动画
      this.updatePreview(previewDuration, previewElapsed)
    } else if (gameState === 'running') {
      this.updateRunning(balls, selectedBall)
    }
  }

  /**
   * 更新预览动画
   */
  updatePreview(previewDuration, previewElapsed) {
    // 计算预览进度 (0到1之间循环)
    const cycleDuration = previewDuration / 2 // 半程时间
    const cycleProgress = (previewElapsed % previewDuration) / previewDuration
    
    let targetProgress
    if (cycleProgress < 0.5) {
      // 向下滑动
      targetProgress = this.easeInOutQuad(cycleProgress * 2)
    } else {
      // 向上滑动
      targetProgress = this.easeInOutQuad(1 - (cycleProgress - 0.5) * 2)
    }
    
    // 平滑过渡到目标位置
    this.previewProgress += (targetProgress - this.previewProgress) * 0.1
    
    // 计算相机位置
    this.targetY = this.previewProgress * (this.mapHeight - this.canvasHeight)
    this.offsetY += (this.targetY - this.offsetY) * this.smoothing
  }

  /**
   * 更新运行状态
   */
  updateRunning(balls, selectedBall) {
    let targetBall = null

    if (selectedBall) {
      if (selectedBall.finished) {
        if (this.switchDelayTimestamp === null) {
          this.switchDelayTimestamp = Date.now() + 2000
        }

        if (Date.now() < this.switchDelayTimestamp) {
          targetBall = selectedBall
        } else {
          targetBall = balls.find(b => !b.finished)
          if (!targetBall) targetBall = selectedBall
        }
      } else {
        targetBall = selectedBall
        this.switchDelayTimestamp = null
      }
    } else {
      targetBall = balls.find(b => !b.finished)
    }

    if (!targetBall) {
      targetBall = balls.reduce((prev, current) => prev.y > current.y ? prev : current)
    }

    if (targetBall) {
      this.targetY = targetBall.y - this.canvasHeight / 3
      this.targetY = Math.max(0, Math.min(this.targetY, this.mapHeight - this.canvasHeight))
      this.offsetY += (this.targetY - this.offsetY) * this.smoothing
    }
  }

  /**
   * 缓动函数
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  reset() {
    this.offsetY = 0
    this.targetY = 0
    this.switchDelayTimestamp = null
    this.previewProgress = 0
    this.previewDirection = 1
  }

  // 世界坐标转屏幕坐标
  worldToScreenY(worldY) {
    return worldY - this.offsetY
  }

  // 屏幕坐标转世界坐标
  screenToWorldY(screenY) {
    return screenY + this.offsetY
  }
}