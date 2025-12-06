/**
 * 障碍物类
 */
export default class Obstacle {
  constructor(x, y, width, height, angle, elasticity, color, type = 'slanted') {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.angle = angle
    this.elasticity = elasticity
    this.color = color
    this.type = type
    this.visible = true
  }

  /**
   * 渲染障碍物
   */
  render(ctx) {
    if (!this.visible) return

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    ctx.fillStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = 10
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
    ctx.shadowBlur = 0

    ctx.restore()
  }

  /**
   * 碰撞检测与响应
   */
  checkCollision(ball, bounceDamping) {
    const ox = this.x
    const oy = this.y

    const dx = ball.x - ox
    const dy = ball.y - oy

    const angle = this.angle || 0
    const cos = Math.cos(-angle)
    const sin = Math.sin(-angle)

    const localX = dx * cos - dy * sin
    const localY = dx * sin + dy * cos

    const halfW = this.width / 2
    const halfH = this.height / 2

    const nearestX = Math.max(-halfW, Math.min(localX, halfW))
    const nearestY = Math.max(-halfH, Math.min(localY, halfH))

    const distX = localX - nearestX
    const distY = localY - nearestY
    const distSq = distX * distX + distY * distY

    if (distSq > 0 && distSq < ball.radius * ball.radius) {
      const dist = Math.sqrt(distSq)

      const nxLocal = distX / dist
      const nyLocal = distY / dist

      const overlap = ball.radius - dist

      const cosR = Math.cos(angle)
      const sinR = Math.sin(angle)

      const nxWorld = nxLocal * cosR - nyLocal * sinR
      const nyWorld = nxLocal * sinR + nyLocal * cosR

      ball.x += nxWorld * overlap
      ball.y += nyWorld * overlap

      const vDotN = ball.vx * nxWorld + ball.vy * nyWorld

      if (vDotN < 0) {
        const impulse = -(1 + this.elasticity) * vDotN

        ball.vx += impulse * nxWorld
        ball.vy += impulse * nyWorld

        const tx = -nyWorld
        const ty = nxWorld
        const vDotT = ball.vx * tx + ball.vy * ty

        ball.vx -= vDotT * 0.1 * tx
        ball.vy -= vDotT * 0.1 * ty
      }
      return true
    }
    return false
  }
}