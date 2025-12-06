/**
 * 滚珠类
 */
export default class Ball {
  constructor(id, x, y, radius, color) {
    this.id = id
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.radius = radius
    this.color = color
    this.hasBet = false
    this.finished = false
    this.finishTime = null
    this.selected = false
    this.visible = true
  }

  /**
   * 渲染滚珠
   */
  render(ctx) {
    if (!this.visible) return

    ctx.save()
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()

    // 如果被选中
    if (this.selected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 如果有助力
    if (this.hasBet) {
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 3
      ctx.shadowColor = 'rgba(255, 255, 0, 0.6)'
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.fillStyle = '#fff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('助力', this.x, this.y - 25)
    }

    // 如果完成
    if (this.finished) {
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('✓', this.x, this.y + 5)
    }

    ctx.restore()
  }

  /**
   * 更新滚珠状态
   */
  update(gravity, friction, airResistance) {
    if (this.finished) return

    this.vy += gravity
    this.vx *= airResistance
    this.vy *= airResistance

    this.x += this.vx
    this.y += this.vy
  }

  /**
   * 判断点是否在滚珠内
   */
  isPointInside(x, y) {
    const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2)
    return distance < this.radius * 2.5
  }

  /**
   * 重置滚珠状态
   */
  reset() {
    this.vx = 0
    this.vy = 0
    this.hasBet = false
    this.finished = false
    this.finishTime = null
    this.selected = false
  }
}