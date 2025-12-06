import './render';
import DataBus from './databus.js'
import Ball from './game/ball.js'
import Obstacle from './game/obstacle.js'
import Camera from './game/camera.js'
import GameInfo from './runtime/gameinfo.js'
import Background from './runtime/background.js'
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './render';

const ctx = canvas.getContext('2d')

const databus = new DataBus()

let gameInfo = null
let background = null
let camera = null
let previewStartTime = 0
const PREVIEW_DURATION = 5000

// 障碍物颜色
const OBSTACLE_COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff00ff', '#00ffff']

/**
 * 游戏主函数
 */
export default class Main {
  aniId = 0 // 用于存储动画帧的ID
  bg = null // 背景实例
  gameInfo = null // 游戏UI实例

  constructor() {
    this.init()
    this.bindEvents()
    this.loop()
  }
  // 在需要显示输入框的地方调用
  showBetInput () {
    this.inputManager.showInput('', (value) => {
      const betAmount = parseInt(value)
      if (betAmount && betAmount > 0) {
        // 处理助力逻辑
        this.confirmBet(betAmount)
      }
    })
  }
  /**
   * 初始化游戏
   */
  init () {
    this.inputManager = new InputManager()

    // 初始化数据总线
    databus.reset()

    // 设置canvas尺寸
    canvas.width = SCREEN_WIDTH
    canvas.height = SCREEN_HEIGHT

    // 初始化各模块
    databus.mapHeight = canvas.height * 10
    this.bg = new Background(canvas.width, canvas.height, databus.mapHeight)
    this.gameInfo = new GameInfo()
    camera = new Camera(canvas.width, canvas.height, databus.mapHeight)

    // 初始化游戏对象
    this.initGameObjects()
  }

  /**
   * 初始化游戏对象
   */
  initGameObjects () {
    // 初始化滚珠
    databus.balls = []
    const centerX = canvas.width / 2
    const ballCount = 4
    const baseSpacing = 80
    const randomOffsets = []

    for (let i = 0; i < ballCount / 2; i++) {
      const offset = baseSpacing + Math.random() * 80
      randomOffsets.push(offset)
    }

    for (let i = 0; i < ballCount; i++) {
      const isLeftSide = i % 2 === 0
      const pairIndex = Math.floor(i / 2)
      const offset = randomOffsets[pairIndex] || baseSpacing

      const ball = new Ball(
        i,
        centerX + (isLeftSide ? -offset : offset),
        100,
        15,
        `hsl(${i * (360 / ballCount)}, 70%, 50%)`
      )
      databus.balls.push(ball)
    }

    // 初始化障碍物
    databus.obstacles = []
    const rows = 25
    const startY = 250
    const endY = databus.mapHeight - 200
    const totalHeight = endY - startY
    const rowSpacing = totalHeight / rows

    for (let i = 0; i < rows; i++) {
      const y = startY + i * rowSpacing
      const width = canvas.width * 0.45

      // 增加角度和布局的多样性
      const angleBase = 15 * (Math.PI / 180)
      const angleVariation = (Math.sin(i * 0.8) * 15) * (Math.PI / 180)
      const finalAngle = angleBase + angleVariation

      // 随机选择颜色
      const colorIndex = i % OBSTACLE_COLORS.length
      const obstacleColor = OBSTACLE_COLORS[colorIndex]

      // 两侧障碍物
      databus.obstacles.push(new Obstacle(
        width * 0.3,
        y,
        width,
        20,
        finalAngle,
        0.9,
        obstacleColor
      ))

      databus.obstacles.push(new Obstacle(
        canvas.width - width * 0.3,
        y,
        width,
        20,
        -finalAngle,
        0.9,
        obstacleColor
      ))

      // 中间障碍物
      if (i % 3 === 1) {
        const centerAngle = (Math.random() - 0.5) * 45 * (Math.PI / 180)
        const centerWidth = 80 + Math.random() * 60
        const centerColor = OBSTACLE_COLORS[(colorIndex + 2) % OBSTACLE_COLORS.length]

        databus.obstacles.push(new Obstacle(
          centerX,
          y + rowSpacing * 0.5,
          centerWidth,
          20,
          centerAngle,
          1.2,
          centerColor
        ))
      }

      // 干扰障碍物
      if (i % 5 === 0) {
        const extraX = centerX + (Math.random() > 0.5 ? 1 : -1) * (canvas.width * 0.2)
        databus.obstacles.push(new Obstacle(
          extraX,
          y + rowSpacing * 0.3,
          40,
          40,
          Math.PI / 4,
          1.5,
          '#ffffff',
          'block'
        ))
      }
    }

    // 设置终点线
    databus.finishLine = {
      x: 0,
      y: databus.mapHeight - 80,
      width: canvas.width,
      height: 20
    }

    camera.reset()
  }

  /**
   * 生成障碍物
   */
  obstacleGenerate () {
    // 这里可以根据需要动态生成障碍物
    // 当前版本使用静态障碍物，所以此方法暂时为空
  }

  /**
   * 碰撞检测
   */
  collisionDetection () {
    // 滚珠与障碍物碰撞检测
    databus.balls.forEach(ball => {
      if (ball.finished) return

      databus.obstacles.forEach(obstacle => {
        obstacle.checkCollision(ball, databus.bounceDamping)
      })
    })
  }

  /**
   * 边界碰撞检测
   */
  boundaryDetection () {
    databus.balls.forEach(ball => {
      if (ball.finished) return

      // 左右边界
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius
        ball.vx *= -databus.bounceDamping
      } else if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius
        ball.vx *= -databus.bounceDamping
      }

      // 底部边界
      if (ball.y + ball.radius > databus.mapHeight) {
        ball.y = databus.mapHeight - ball.radius
        ball.vy *= -databus.bounceDamping
        ball.vx *= databus.friction
      }
    })
  }

  /**
   * 终点检测
   */
  finishDetection () {
    databus.balls.forEach(ball => {
      if (ball.finished) return

      if (ball.y + ball.radius > databus.finishLine.y &&
        ball.y - ball.radius < databus.finishLine.y + databus.finishLine.height &&
        ball.x > databus.finishLine.x &&
        ball.x < databus.finishLine.x + databus.finishLine.width) {
        ball.finished = true
        ball.finishTime = Date.now()
        ball.vy *= 0.5
        ball.vx *= 0.5
      }
    })
  }

  /**
   * 游戏结束检查
   */
  checkGameFinish () {
    const finishedBalls = databus.balls.filter(b => b.finished)

    if (finishedBalls.length === databus.balls.length && databus.gameState === 'running') {
      databus.gameState = 'finished'

      // 排序
      finishedBalls.sort((a, b) => a.finishTime - b.finishTime)

      // 计算奖励
      const playerRank = finishedBalls.findIndex(b => b.id === databus.selectedBall?.id) + 1
      if (playerRank === 1) {
        databus.score += databus.betAmount * 4
      } else if (playerRank === 2) {
        databus.score += databus.betAmount * 2
      }

      this.gameInfo.score = databus.score

      // 显示结果
      this.gameInfo.uiPositions.resultModal.visible = true
      this.gameInfo.uiPositions.resultModal.ranking = finishedBalls
    }
  }

  /**
   * 更新游戏逻辑
   */
  update () {
    if (databus.gameState === 'running') {
      // 更新滚珠物理状态
      databus.balls.forEach(ball => {
        ball.update(databus.gravity, databus.friction, databus.airResistance)
      })

      this.collisionDetection() // 碰撞检测
      this.boundaryDetection() // 边界检测
      this.finishDetection() // 终点检测
      this.checkGameFinish() // 游戏结束检查

    } else if (databus.gameState === 'preview') {
      const elapsed = Date.now() - previewStartTime

      // 预览结束后自动进入助力选择
      if (elapsed >= PREVIEW_DURATION) {
        databus.gameState = 'betting'
        this.gameInfo.uiPositions.betModal.visible = true
      }
    }

    // 更新相机，传入预览相关参数
    camera.update(
      databus.balls,
      databus.selectedBall,
      databus.gameState,
      PREVIEW_DURATION,
      databus.gameState === 'preview' ? Date.now() - previewStartTime : 0
    )
  }

  /**
   * canvas重绘函数
   * 每一帧重新绘制所有的需要展示的元素
   */
  render () {
    // if (!ctx) {
    //   console.error('ctx is null')
    //   return
    // }

    // console.log('开始渲染，canvas尺寸:', canvas.width, 'x', canvas.height)
    // console.log('相机偏移:', camera.offsetY)
    // console.log('滚珠数量:', databus.balls.length)
    // console.log('障碍物数量:', databus.obstacles.length)
    ctx.clearRect(0, 0, canvas.width, canvas.height) // 清空画布
    // 绘制背景
    this.bg.render(ctx, camera.offsetY)

    // 保存状态并应用相机变换
    ctx.save()

    // 应用相机偏移
    ctx.translate(0, -camera.offsetY)

    // 绘制终点线
    ctx.fillStyle = '#44ff44'
    ctx.shadowColor = 'rgba(68, 255, 68, 0.8)'
    ctx.shadowBlur = 20
    ctx.fillRect(
      databus.finishLine.x,
      databus.finishLine.y,
      databus.finishLine.width,
      databus.finishLine.height
    )
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ffffff'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('终点线', canvas.width / 2, databus.finishLine.y - 10)

    // 绘制所有障碍物
    databus.obstacles.forEach(obstacle => {
      obstacle.render(ctx)
    })

    // 绘制所有滚珠
    databus.balls.forEach(ball => {
      ball.render(ctx)
    })

    ctx.restore()

    // 绘制游戏UI
    if (this.gameInfo && typeof this.gameInfo.render === 'function') {
      this.gameInfo.render(ctx, canvas.width, canvas.height)
    }

    // 在预览状态显示提示信息
    if (databus.gameState === 'preview') {
      this.drawPreviewInfo()
    }


  }

  /**
 * 绘制预览状态提示信息
 */
  drawPreviewInfo () {
    const elapsed = Date.now() - previewStartTime
    const remaining = Math.max(0, PREVIEW_DURATION - elapsed)
    const seconds = (remaining / 1000).toFixed(1)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(canvas.width / 2 - 150, 150, 300, 80)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.strokeRect(canvas.width / 2 - 150, 150, 300, 80)

    ctx.fillStyle = '#ffffff'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('赛道预览中...', canvas.width / 2, 180)

    ctx.font = '16px Arial'
    ctx.fillText(`${seconds}秒后选择助力积分`, canvas.width / 2, 210)

    // 绘制进度条
    const progress = elapsed / PREVIEW_DURATION
    const barWidth = 260
    const barHeight = 10
    const barX = canvas.width / 2 - barWidth / 2
    const barY = 220

    // 进度条背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // 进度条前景
    ctx.fillStyle = '#44ff44'
    ctx.fillRect(barX, barY, barWidth * progress, barHeight)

    // 进度条边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)
  }
  /**
   * 游戏主循环
   */
  loop () {
    this.update() // 更新游戏逻辑
    this.render() // 渲染游戏画面

    // 请求下一帧动画
    this.aniId = requestAnimationFrame(this.loop.bind(this))
  }

  /**
   * 绑定事件
   */
  // 修改 bindEvents 方法中的触摸事件处理
  bindEvents () {
    wx.onTouchStart((e) => {
      const x = e.touches[0].clientX
      const y = e.touches[0].clientY

      // 处理UI按钮点击
      const buttonAction = this.gameInfo.handleClick(x, y)
      if (buttonAction) {
        this.handleButtonAction(buttonAction)
        return
      }

      // 处理助力模态框点击
      if (this.gameInfo.uiPositions.betModal.visible) {
        const betAction = this.gameInfo.handleBetModalClick(x, y, canvas.width, canvas.height)
        if (betAction) {
          if (betAction.type === 'bet') {
            this.confirmBet(betAction.amount)
          } else if (betAction.type === 'cancel') {
            this.cancelBet()
          }
          return
        }
      }

      if (this.gameInfo.uiPositions.helpModal.visible) {
        if (this.isPointInHelpModalClose(x, y)) {
          this.gameInfo.uiPositions.helpModal.visible = false
        }
        return
      }

      if (this.gameInfo.uiPositions.resultModal.visible) {
        if (this.isPointInResultModalButton(x, y)) {
          this.restartGame()
        }
        return
      }

      // 处理滚珠选择
      if (databus.gameState === 'idle' || databus.gameState === 'betting') {
        const worldY = y + camera.offsetY
        databus.balls.forEach(ball => {
          if (ball.isPointInside(x, worldY)) {
            databus.selectedBall = ball
            ball.selected = true
          } else {
            ball.selected = false
          }
        })
      }
    })
  }

  /**
   * 处理按钮点击
   */
  handleButtonAction (action) {
    switch (action) {
      case 'claim':
        this.claimPoints()
        break
      case 'help':
        this.gameInfo.uiPositions.helpModal.visible = true
        break
      case 'start':
        this.startBetting()
        break
      case 'pause':
        if (databus.gameState === 'running') {
          databus.gameState = 'paused'
        } else if (databus.gameState === 'paused') {
          databus.gameState = 'running'
        }
        break
      case 'restart':
        this.restartGame()
        break
    }
  }

  /**
   * 处理助力模态框点击
   */
  handleBetModalClick (x, y, canvasWidth, canvasHeight) {
    const modalWidth = 320
    const modalHeight = 200
    const modalX = (canvasWidth - modalWidth) / 2
    const modalY = (canvasHeight - modalHeight) / 2

    // 确认按钮
    if (x >= modalX + 60 && x <= modalX + 140 &&
      y >= modalY + 140 && y <= modalY + 180) {
      this.confirmBet()
    }
    // 取消按钮
    else if (x >= modalX + 180 && x <= modalX + 260 &&
      y >= modalY + 140 && y <= modalY + 180) {
      this.cancelBet()
      // 关闭键盘
      this.gameInfo.closeInputBox()
    }
  }

  /**
   * 判断是否点击帮助模态框关闭按钮
   */
  isPointInHelpModalClose (x, y) {
    const modalWidth = 400
    const modalHeight = 320
    const modalX = (canvas.width - modalWidth) / 2
    const modalY = (canvas.height - modalHeight) / 2

    return x >= modalX + 100 && x <= modalX + 300 &&
      y >= modalY + 240 && y <= modalY + 280
  }

  /**
   * 判断是否点击结果模态框按钮
   */
  isPointInResultModalButton (x, y) {
    const modalWidth = 400
    const modalHeight = 400
    const modalX = (canvas.width - modalWidth) / 2
    const modalY = (canvas.height - modalHeight) / 2

    return x >= modalX + 100 && x <= modalX + 300 &&
      y >= modalY + 320 && y <= modalY + 370
  }



  // 修改 startMapPreview 方法

  /**
   * 开始地图预览
   */
  startMapPreview () {
    databus.gameState = 'preview'
    previewStartTime = Date.now()

    // 重置相机预览状态
    camera.previewProgress = 0
    camera.previewDirection = 1

    console.log('开始地图预览，总时长:', PREVIEW_DURATION, 'ms')
  }

  /**
   * 确认助力
   */
  // 修改 confirmBet 方法，接受金额参数
  confirmBet (betAmount) {
    console.log('确认助力: 滚珠', databus.selectedBall.id, '积分', betAmount)

    if (!databus.selectedBall) {
      wx.showToast({
        title: '请先选择一个滚珠！',
        icon: 'none'
      })
      return
    }

    if (betAmount <= 0) {
      wx.showToast({
        title: '积分必须大于0！',
        icon: 'none'
      })
      return
    }

    if (betAmount > databus.score) {
      wx.showToast({
        title: '积分不足！',
        icon: 'none'
      })
      return
    }

    // 下注
    databus.balls.forEach(b => b.hasBet = false)
    databus.selectedBall.hasBet = true
    databus.betAmount = betAmount
    databus.score -= betAmount
    this.gameInfo.score = databus.score
    this.gameInfo.betAmount = betAmount

    // 开始游戏
    this.gameInfo.uiPositions.betModal.visible = false
    databus.gameState = 'running'

    // 给滚珠初始速度
    setTimeout(() => {
      databus.balls.forEach(ball => {
        ball.vy = 2
        ball.vx = (Math.random() - 0.5) * 1.0
      })
    }, 1000)

    // 显示助力成功的提示
    wx.showToast({
      title: `助力成功！投入${betAmount}积分`,
      icon: 'success',
      duration: 2000
    })
  }

  // 修改 cancelBet 方法
  cancelBet () {
    this.gameInfo.uiPositions.betModal.visible = false
    databus.gameState = 'idle'
  }
  bindEvents () {
    wx.onTouchStart((e) => {
      const x = e.touches[0].clientX
      const y = e.touches[0].clientY

      // 处理菜单按钮点击
      if (this.gameInfo.handleMenuButtonClick(x, y)) {
        this.toggleMenuModal()
        return
      }

      // 处理菜单弹窗点击
      if (this.gameInfo.uiPositions.menuModal.visible) {
        const menuAction = this.gameInfo.handleMenuModalClick(x, y)
        if (menuAction) {
          this.handleMenuAction(menuAction)
          return
        }
        // 点击弹窗外部关闭弹窗
        this.closeAllModals()
        return
      }

      // 处理助力弹窗点击
      if (this.gameInfo.uiPositions.betModal.visible) {
        const betAction = this.gameInfo.handleBetModalClick(x, y, canvas.width, canvas.height)
        if (betAction) {
          if (betAction.type === 'bet') {
            this.confirmBet(betAction.amount)
          } else if (betAction.type === 'cancel') {
            this.cancelBet()
          }
          return
        }
        // 点击弹窗外部关闭弹窗
        this.closeAllModals()
        return
      }

      // 处理帮助弹窗点击
      if (this.gameInfo.uiPositions.helpModal.visible) {
        if (this.gameInfo.handleHelpModalClick(x, y, canvas.width, canvas.height)) {
          this.gameInfo.uiPositions.helpModal.visible = false
        }
        return
      }

      // 处理结果弹窗点击
      if (this.gameInfo.uiPositions.resultModal.visible) {
        if (this.gameInfo.handleResultModalClick(x, y, canvas.width, canvas.height)) {
          this.restartGame()
        }
        return
      }

      // 处理滚珠选择
      if (databus.gameState === 'idle' || databus.gameState === 'betting') {
        const worldY = y + camera.offsetY
        databus.balls.forEach(ball => {
          if (ball.isPointInside(x, worldY)) {
            databus.selectedBall = ball
            ball.selected = true
          } else {
            ball.selected = false
          }
        })
      }
    })
  }

  /**
   * 切换菜单弹窗显示/隐藏
   */
  toggleMenuModal () {
    this.gameInfo.uiPositions.menuModal.visible = !this.gameInfo.uiPositions.menuModal.visible

    // 关闭其他弹窗
    this.gameInfo.uiPositions.betModal.visible = false
    this.gameInfo.uiPositions.helpModal.visible = false
  }

  /**
   * 关闭所有弹窗
   */
  closeAllModals () {
    this.gameInfo.uiPositions.menuModal.visible = false
    this.gameInfo.uiPositions.betModal.visible = false
    this.gameInfo.uiPositions.helpModal.visible = false
    this.gameInfo.selectedMenuItem = null
  }

  /**
   * 处理菜单动作
   */
  handleMenuAction (action) {
    this.closeAllModals()

    switch (action) {
      case 'claim':
        this.claimPoints()
        break
      case 'start':
        this.startBetting()
        break
      case 'pause':
        this.togglePause()
        break
      case 'restart':
        this.restartGame()
        break
      case 'help':
        this.gameInfo.uiPositions.helpModal.visible = true
        break
    }
  }

  /**
   * 切换暂停/继续
   */
  togglePause () {
    if (databus.gameState === 'running') {
      databus.gameState = 'paused'
      wx.showToast({
        title: '游戏已暂停',
        icon: 'none'
      })
    } else if (databus.gameState === 'paused') {
      databus.gameState = 'running'
      wx.showToast({
        title: '游戏继续',
        icon: 'none'
      })
    }
  }

  /**
   * 开始助力流程
   */
  startBetting () {
    if (databus.gameState === 'idle') {
      if (!databus.selectedBall) {
        wx.showToast({
          title: '请先点击选择一个滚珠进行助力！',
          icon: 'none'
        })
        return
      }

      // 检查积分是否足够
      const hasEnoughScore = this.gameInfo.betOptions.some(amount => amount <= databus.score)
      if (!hasEnoughScore) {
        wx.showToast({
          title: '积分不足，请先领取积分！',
          icon: 'none'
        })
        return
      }

      this.startMapPreview()
    }
  }
  /**
   * 领取积分
   */
  claimPoints () {
    const currentTime = Date.now()
    if (currentTime - databus.lastClaimTime < databus.claimCooldown) {
      wx.showToast({
        title: '冷却时间未到',
        icon: 'none'
      })
      return
    }

    databus.score += databus.claimAmount
    databus.lastClaimTime = currentTime
    this.gameInfo.score = databus.score
  }

  /**
   * 重新开始游戏
   */
  restartGame () {
    databus.gameState = 'idle'
    databus.selectedBall = null
    databus.betAmount = 0
    this.gameInfo.selectedBall = null
    this.gameInfo.betAmount = 0

    this.gameInfo.uiPositions.betModal.visible = false
    this.gameInfo.uiPositions.helpModal.visible = false
    this.gameInfo.uiPositions.resultModal.visible = false
    this.gameInfo.uiPositions.betModal.inputValue = ''

    this.initGameObjects()
  }
}

class InputManager {
  constructor() {
    this.isKeyboardShowing = false
    this.currentValue = ''
  }

  showInput (initialValue = '', callback) {
    wx.showKeyboard({
      defaultValue: initialValue,
      maxLength: 10,
      multiple: false,
      confirmHold: false,
      confirmType: 'done',
      success: (res) => {
        this.isKeyboardShowing = true
      }
    })

    wx.onKeyboardInput((res) => {
      this.currentValue = res.value
    })

    wx.onKeyboardConfirm((res) => {
      callback && callback(this.currentValue)
      this.hideInput()
    })

    wx.onKeyboardComplete((res) => {
      this.hideInput()
    })
  }

  hideInput () {
    this.isKeyboardShowing = false
    wx.hideKeyboard()
    wx.offKeyboardInput()
    wx.offKeyboardConfirm()
    wx.offKeyboardComplete()
  }
}