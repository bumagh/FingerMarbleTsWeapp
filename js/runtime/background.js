/**
 * 背景类
 */
export default class Background {
  constructor(canvasWidth, canvasHeight, mapHeight) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.mapHeight = mapHeight
  }

  /**
   * 渲染背景
   * @param {CanvasRenderingContext2D} ctx - canvas上下文
   * @param {number} cameraOffsetY - 相机Y轴偏移
   */
  render (ctx, cameraOffsetY) {
    if (!ctx) return

    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight)
    gradient.addColorStop(0, '#0a0a0a')
    gradient.addColorStop(1, '#1a1a2a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    // 绘制参考线 - 预览状态时更明显
    const lineAlpha = 0.1 // 基础透明度
    const previewAlpha = 0.2 // 预览时增加透明度
    const effectiveAlpha = lineAlpha

    ctx.strokeStyle = `rgba(255, 255, 255, ${effectiveAlpha})`
    ctx.lineWidth = 1

    // 从相机位置开始绘制参考线
    const startLineY = Math.floor(cameraOffsetY / 100) * 100
    for (let i = startLineY; i < cameraOffsetY + this.canvasHeight; i += 100) {
      const lineY = i - cameraOffsetY
      if (lineY >= 0 && lineY <= this.canvasHeight) {
        ctx.beginPath()
        ctx.moveTo(0, lineY)
        ctx.lineTo(this.canvasWidth, lineY)
        ctx.stroke()
      }
    }

    // 绘制进度条
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(this.canvasWidth - 20, 10, 10, this.canvasHeight * 0.3)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    const indicatorY = 10 + (cameraOffsetY / this.mapHeight) * (this.canvasHeight * 0.3)
    ctx.fillRect(this.canvasWidth - 20, indicatorY, 10, 10)
  }
}