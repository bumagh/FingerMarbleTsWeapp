/**
 * 游戏信息显示类
 */
export default class GameInfo {
  constructor() {
    this.score = 10
    this.betAmount = 0
    this.selectedBall = null
    this.gameState = 'idle' // idle, preview, betting, running, paused, finished

    // 可选择的积分选项
    this.betOptions = [1, 2, 4, 8]

    // UI元素位置
    this.uiPositions = {
      // 状态栏（只显示积分）
      score: { x: 200, y: 80 },
      menuButton: { x: 20, y: 50, width: 80, height: 40 },

      // 菜单弹窗
      menuModal: {
        visible: false,
        buttons: {
          claim: { x: 0, y: 0, width: 200, height: 50 },
          start: { x: 0, y: 60, width: 200, height: 50 },
          pause: { x: 0, y: 120, width: 200, height: 50 },
          restart: { x: 0, y: 180, width: 200, height: 50 },
          help: { x: 0, y: 240, width: 200, height: 50 }
        }
      },

      // 助力弹窗
      betModal: {
        visible: false
      },

      // 帮助弹窗
      helpModal: {
        visible: false
      },

      // 结果弹窗
      resultModal: {
        visible: false,
        ranking: []
      }
    }

    // 当前选中的菜单项
    this.selectedMenuItem = null

    // 确保 betOptions 存在
    if (!this.betOptions) {
      this.betOptions = [1, 2, 4, 8]
    }
  }

  /**
   * 渲染游戏UI
   * @param {CanvasRenderingContext2D} ctx - canvas上下文
   * @param {number} canvasWidth - canvas宽度
   * @param {number} canvasHeight - canvas高度
   */
  render (ctx, canvasWidth, canvasHeight) {
    if (!ctx) return

    // 绘制状态栏背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.fillRect(0, 0, canvasWidth, 120)

    // 绘制积分
    ctx.fillStyle = '#ffffff'
    ctx.font = '18px Arial'
    ctx.fillText(`积分: ${this.score}`, this.uiPositions.score.x, this.uiPositions.score.y)

    // 绘制菜单按钮
    this.drawButton(ctx, '菜单', this.uiPositions.menuButton)

    // 绘制菜单弹窗
    if (this.uiPositions.menuModal.visible) {
      this.drawMenuModal(ctx, canvasWidth, canvasHeight)
    }

    // 绘制助力弹窗
    if (this.uiPositions.betModal.visible) {
      this.drawBetModal(ctx, canvasWidth, canvasHeight)
    }

    // 绘制帮助弹窗
    if (this.uiPositions.helpModal.visible) {
      this.drawHelpModal(ctx, canvasWidth, canvasHeight)
    }

    // 绘制结果弹窗
    if (this.uiPositions.resultModal.visible) {
      this.drawResultModal(ctx, canvasWidth, canvasHeight)
    }
  }

  /**
   * 绘制按钮
   */
  drawButton (ctx, text, position, isSelected = false) {
    // 按钮背景
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(position.x, position.y, position.width, position.height)

    // 按钮边框
    ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'
    ctx.strokeRect(position.x, position.y, position.width, position.height)

    // 按钮文字
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, position.x + position.width / 2, position.y + position.height / 2)
  }

  /**
   * 绘制菜单弹窗
   */
  drawMenuModal (ctx, canvasWidth, canvasHeight) {
    const modalWidth = 240
    const modalHeight = 310
    const x = (canvasWidth - modalWidth) / 2
    const y = (canvasHeight - modalHeight) / 2

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
    ctx.fillRect(x, y, modalWidth, modalHeight)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.strokeRect(x, y, modalWidth, modalHeight)

    // 标题
    ctx.fillStyle = '#ffffff'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('游戏菜单', canvasWidth / 2, y + 35)

    // 更新按钮位置
    const buttons = this.uiPositions.menuModal.buttons
    buttons.claim.x = x + 20
    buttons.claim.y = y + 60
    buttons.start.x = x + 20
    buttons.start.y = y + 120
    buttons.pause.x = x + 20
    buttons.pause.y = y + 180
    buttons.restart.x = x + 20
    buttons.restart.y = y + 240
    buttons.help.x = x + 20
    buttons.help.y = y + 300

    // 绘制菜单按钮
    this.drawButton(ctx, '领取积分', buttons.claim, this.selectedMenuItem === 'claim')
    this.drawButton(ctx, '开始游戏', buttons.start, this.selectedMenuItem === 'start')

    // 根据游戏状态显示暂停/继续按钮文字
    const pauseText = this.gameState === 'running' ? '暂停游戏' : '继续游戏'
    this.drawButton(ctx, pauseText, buttons.pause, this.selectedMenuItem === 'pause')

    this.drawButton(ctx, '重新开始', buttons.restart, this.selectedMenuItem === 'restart')
    this.drawButton(ctx, '游戏帮助', buttons.help, this.selectedMenuItem === 'help')
  }

  /**
   * 绘制助力弹窗
   */
  drawBetModal (ctx, canvasWidth, canvasHeight) {
    const modalWidth = 320
    const modalHeight = 280
    const x = (canvasWidth - modalWidth) / 2
    const y = (canvasHeight - modalHeight) / 2

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
    ctx.fillRect(x, y, modalWidth, modalHeight)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.strokeRect(x, y, modalWidth, modalHeight)

    // 标题
    ctx.fillStyle = '#ffffff'
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('选择助力积分', canvasWidth / 2, y + 40)

    // 当前积分显示
    ctx.fillStyle = '#ffff88'
    ctx.font = '16px Arial'
    ctx.fillText(`当前积分: ${this.score}`, canvasWidth / 2, y + 75)

    // 绘制积分选择按钮
    const buttonWidth = 60
    const buttonHeight = 50
    const gap = 20
    const totalWidth = this.betOptions.length * buttonWidth + (this.betOptions.length - 1) * gap
    const startX = x + (modalWidth - totalWidth) / 2

    this.betButtons = []
    this.betOptions.forEach((amount, index) => {
      const buttonX = startX + index * (buttonWidth + gap)
      const buttonY = y + 120

      // 检查积分是否足够
      const canBet = amount <= this.score

      // 按钮背景
      ctx.fillStyle = canBet ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 0, 0, 0.15)'
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight)

      // 按钮边框
      ctx.strokeStyle = canBet ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)'
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight)

      // 积分数字
      ctx.fillStyle = canBet ? '#ffffff' : '#ff8888'
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${amount}分`, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 8)

      // 保存按钮位置用于点击检测
      this.betButtons.push({
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
        amount: amount,
        canBet: canBet
      })
    })

    // 取消按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(x + 80, y + 200, modalWidth - 160, 50)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.strokeRect(x + 80, y + 200, modalWidth - 160, 50)
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.fillText('取消', canvasWidth / 2, y + 230)

    // 保存取消按钮位置
    this.cancelButton = {
      x: x + 80,
      y: y + 200,
      width: modalWidth - 160,
      height: 50
    }
  }

  /**
   * 绘制帮助弹窗
   */
  drawHelpModal (ctx, canvasWidth, canvasHeight) {
    const modalWidth = 400
    const modalHeight = 320
    const x = (canvasWidth - modalWidth) / 2
    const y = (canvasHeight - modalHeight) / 2

    // 背景
    ctx.fillStyle = 'rgba(15, 15, 20, 0.98)'
    ctx.fillRect(x, y, modalWidth, modalHeight)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.strokeRect(x, y, modalWidth, modalHeight)

    // 标题
    ctx.fillStyle = '#ffffff'
    ctx.font = '22px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('游戏规则', canvasWidth / 2, y + 40)

    // 规则列表
    const rules = [
      '点击心仪的滚珠为其助力并投入积分',
      '滚珠将在充满障碍的赛道中竞速，到达终点',
      '第一名：获得 4倍 助力积分奖励',
      '第二名：获得 2倍 助力积分奖励',
      '其他名次：将失去投入的助力积分'
    ]

    ctx.font = '14px Arial'
    ctx.textAlign = 'left'
    rules.forEach((rule, index) => {
      ctx.fillStyle = '#e0e0e0'
      ctx.fillText(rule, x + 30, y + 80 + index * 30)
    })

    // 关闭按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(x + 100, y + 240, modalWidth - 200, 40)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.strokeRect(x + 100, y + 240, modalWidth - 200, 40)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText('我明白了', canvasWidth / 2, y + 262)
  }

  /**
   * 绘制结果弹窗
   */
  drawResultModal (ctx, canvasWidth, canvasHeight) {
    const modalWidth = 400
    const modalHeight = 400
    const x = (canvasWidth - modalWidth) / 2
    const y = (canvasHeight - modalHeight) / 2

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(x, y, modalWidth, modalHeight)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.strokeRect(x, y, modalWidth, modalHeight)

    // 标题
    ctx.fillStyle = '#ffffff'
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('游戏结束！', canvasWidth / 2, y + 40)

    // 排名信息
    ctx.font = '16px Arial'
    this.uiPositions.resultModal.ranking.forEach((ball, index) => {
      const rankY = y + 80 + index * 40

      // 排名数字
      ctx.fillStyle = '#999999'
      ctx.textAlign = 'left'
      ctx.fillText(`${index + 1}.`, x + 30, rankY)

      // 滚珠颜色
      ctx.beginPath()
      ctx.arc(x + 70, rankY - 5, 8, 0, Math.PI * 2)
      ctx.fillStyle = ball.color
      ctx.fill()

      // 滚珠信息
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`滚珠 ${ball.id}`, x + 90, rankY)

      if (ball.hasBet) {
        ctx.fillStyle = '#ffff00'
        ctx.textAlign = 'right'
        ctx.fillText(`助力: ${this.betAmount}分`, x + modalWidth - 30, rankY)
      }
    })

    // 再玩一次按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(x + 100, y + 320, modalWidth - 200, 50)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.strokeRect(x + 100, y + 320, modalWidth - 200, 50)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText('再玩一次', canvasWidth / 2, y + 345)
  }

  /**
   * 判断点是否在按钮内
   */
  isPointInButton (x, y, button) {
    return x >= button.x && x <= button.x + button.width &&
      y >= button.y && y <= button.y + button.height
  }

  /**
   * 处理菜单按钮点击
   */
  handleMenuButtonClick (x, y) {
    const menuButton = this.uiPositions.menuButton
    return this.isPointInButton(x, y, menuButton)
  }

  /**
   * 处理菜单弹窗点击
   */
  handleMenuModalClick (x, y) {
    if (!this.uiPositions.menuModal.visible) return null

    const buttons = this.uiPositions.menuModal.buttons

    // 高亮选中的按钮
    if (this.isPointInButton(x, y, buttons.claim)) {
      this.selectedMenuItem = 'claim'
      return 'claim'
    } else if (this.isPointInButton(x, y, buttons.start)) {
      this.selectedMenuItem = 'start'
      return 'start'
    } else if (this.isPointInButton(x, y, buttons.pause)) {
      this.selectedMenuItem = 'pause'
      return 'pause'
    } else if (this.isPointInButton(x, y, buttons.restart)) {
      this.selectedMenuItem = 'restart'
      return 'restart'
    } else if (this.isPointInButton(x, y, buttons.help)) {
      this.selectedMenuItem = 'help'
      return 'help'
    }

    this.selectedMenuItem = null
    return null
  }

  /**
   * 处理助力弹窗点击
   */
  handleBetModalClick (x, y, canvasWidth, canvasHeight) {
    if (!this.uiPositions.betModal.visible) return null

    // 检查是否点击了积分选择按钮
    if (this.betButtons) {
      for (let i = 0; i < this.betButtons.length; i++) {
        const button = this.betButtons[i]
        if (this.isPointInButton(x, y, button) && button.canBet) {
          return {
            type: 'bet',
            amount: button.amount
          }
        }
      }
    }

    // 检查是否点击了取消按钮
    if (this.cancelButton && this.isPointInButton(x, y, this.cancelButton)) {
      return { type: 'cancel' }
    }

    return null
  }

  /**
   * 处理帮助弹窗点击
   */
  handleHelpModalClick (x, y, canvasWidth, canvasHeight) {
    if (!this.uiPositions.helpModal.visible) return false

    const modalWidth = 400
    const modalHeight = 320
    const modalX = (canvasWidth - modalWidth) / 2
    const modalY = (canvasHeight - modalHeight) / 2

    // 检查是否点击了关闭按钮
    return x >= modalX + 100 && x <= modalX + 300 &&
      y >= modalY + 240 && y <= modalY + 280
  }

  /**
   * 处理结果弹窗点击
   */
  handleResultModalClick (x, y, canvasWidth, canvasHeight) {
    if (!this.uiPositions.resultModal.visible) return false

    const modalWidth = 400
    const modalHeight = 400
    const modalX = (canvasWidth - modalWidth) / 2
    const modalY = (canvasHeight - modalHeight) / 2

    // 检查是否点击了再玩一次按钮
    return x >= modalX + 100 && x <= modalX + 300 &&
      y >= modalY + 320 && y <= modalY + 370
  }
}