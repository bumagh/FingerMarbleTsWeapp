// src/game.ts
import { Vector, PhysicsBody } from "./physics";
import { PhysicsEngine } from "./physics";
import DataBus, { GameBall, GameObstacle } from "./databus";
import EventManager from "./eventmanager";
import { getScreenInfo } from '../mytsglib/core/utils/screen/screenUtils'
import UIAdapter from '../mytsglib/core/utils/ui/UIAdapter'
import ShareManager from './share';
import ToastManager from './toast';
import ErrorHandler, { ErrorLevel } from './errorhandler';
import { SkillManager } from './skills';
import { GameState, MenuState, Turn, GameSubState, GameResult } from './GameStates';
import { MenuSystem } from './menu';

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 获取 DataBus 实例
const databus = DataBus;

class RetroMarbleGame {
  private restartButtonRect: { x: number, y: number, width: number, height: number } | null = null;
  private exitButtonRect: { x: number, y: number, width: number, height: number } | null = null;
  private skillButtonRects: { id: string, x: number, y: number, width: number, height: number }[] = [];
  private state: GameState = GameState.MENU;
  private turn: Turn = Turn.PLAYER;
  private turnTimer: number = databus.config.TURN_TIME;
  private animationId: number | null = null;

  private physics: PhysicsEngine;
  private menu: MenuSystem;
  private eventManager: EventManager;
  private skillManager: SkillManager;

  // 添加菜单状态变量
  private menuState: MenuState = MenuState.MAIN;

  constructor() {
    try {
      // 初始化错误处理系统
      ErrorHandler.init();
      
      // 初始化 Toast 系统
      ToastManager.init(ctx, canvas);
      
      // 先获取真实屏幕尺寸并初始化配置
      var info = getScreenInfo();
      databus.initConfig(info.width, info.height);
      
      // 使用真实屏幕尺寸初始化物理引擎
      this.physics = new PhysicsEngine(databus.config.WIDTH, databus.config.HEIGHT);
      // 初始化菜单系统
      this.menu = new MenuSystem(ctx, canvas);

      // 初始化事件管理器
      this.eventManager = new EventManager(this, canvas, this.menu);
      this.eventManager.init();

      // 初始化技能管理器
      this.skillManager = new SkillManager();

      // 初始化分享功能
      ShareManager;
      
      // 监听屏幕尺寸变化
      this.setupScreenResizeListener();
      
      // 初始化游戏
      this.resetGame();
      this.gameLoop();
      
      // ToastManager.success('游戏初始化成功');
    } catch (error) {
      ErrorHandler.handleError(error as Error, ErrorLevel.CRITICAL, 'Game Initialization');
    }
  }

  /**
   * 销毁游戏实例，清理资源
   */
  public destroy(): void {
    console.log('销毁游戏实例...');
    
    // 停止游戏循环
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // 销毁事件管理器
    if (this.eventManager) {
      this.eventManager.destroy();
      this.eventManager = null;
    }
    
    // 清理其他资源
    this.physics = null;
    this.menu = null;
    this.skillManager = null;
    
    console.log('游戏实例销毁完成');
  }

  /**
   * 更新物理引擎边界以匹配当前屏幕尺寸
   */
  public updatePhysicsBounds(): void {
    if (this.physics) {
      this.physics = new PhysicsEngine(databus.config.WIDTH, databus.config.HEIGHT);
      console.log(`物理引擎边界已更新: ${databus.config.WIDTH}x${databus.config.HEIGHT}`);
    }
  }

  /**
   * 设置屏幕尺寸变化监听器
   */
  private setupScreenResizeListener(): void {
    // 微信小游戏监听窗口变化
    wx.onWindowResize?.((res) => {
      console.log('屏幕尺寸变化:', res.windowWidth, res.windowHeight);
      
      // 更新配置
      databus.initConfig(res.windowWidth, res.windowHeight);
      
      // 更新物理引擎边界
      this.updatePhysicsBounds();
    });
  }

  private isObstaclePlacementValid(x: number, y: number, width: number, height: number): boolean {
    const padding = 6;

    const overlapsBall = databus.balls.some(ball => {
      const closestX = Math.max(x, Math.min(ball.x, x + width));
      const closestY = Math.max(y, Math.min(ball.y, y + height));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      const minDistance = ball.radius + padding;

      return dx * dx + dy * dy < minDistance * minDistance;
    });

    if (overlapsBall) {
      return false;
    }

    return !databus.obstacles.some(obstacle => {
      const left = x - padding;
      const right = x + width + padding;
      const top = y - padding;
      const bottom = y + height + padding;

      const obstacleLeft = obstacle.x - padding;
      const obstacleRight = obstacle.x + obstacle.width + padding;
      const obstacleTop = obstacle.y - padding;
      const obstacleBottom = obstacle.y + obstacle.height + padding;

      return left < obstacleRight &&
        right > obstacleLeft &&
        top < obstacleBottom &&
        bottom > obstacleTop;
    });
  }

  private getSkillButtonColor(skillId: string): string {
    const skillColors: { [key: string]: string } = {
      wall_pass_once: '#8e44ad',
      double_ricochet: '#2980b9',
      wall_pass_and_bounce: '#16a085',
      triple_ricochet: '#d35400'
    };

    return skillColors[skillId] || '#7f8c8d';
  }

  public resetGame(): void {
    // 重置 DataBus
    databus.reset();
    var info = getScreenInfo();
    databus.initConfig(info.width, info.height);
    // 同步更新物理引擎边界
    this.updatePhysicsBounds();
    // 重置游戏状态
    this.turn = Math.random() > 0.5 ? Turn.PLAYER : Turn.AI;
    this.turnTimer = databus.config.TURN_TIME;
    this.skillManager.configureSkillsForMatch(databus.getCurrentMarble());

    // 创建玩家弹珠
    const playerBall = databus.createBall(
      'player',
      100,
      databus.config.HEIGHT / 2,
      'player',
      (other, force) => this.handleCollision('player', force)
    );
    this.skillManager.applyMatchSkillsToBall(playerBall);
    databus.balls.push(playerBall);

    // 创建敌人弹珠
    const enemyBall = databus.createBall(
      'enemy',
      databus.config.WIDTH - 100,
      databus.config.HEIGHT / 2,
      'enemy',
      (other, force) => this.handleCollision('enemy', force)
    );
    enemyBall.matchSkills = [];
    enemyBall.skillNotes = [];
    databus.balls.push(enemyBall);

    // 创建障碍物
    for (let i = 0; i < databus.config.OBSTACLE_COUNT; i++) {
      const width = 40 + Math.random() * 60;
      const height = 40 + Math.random() * 60;

      // 避免与弹珠位置重叠
      let x = 0;
      let y = 0;
      let valid = false;
      let attempts = 0;
      while (!valid && attempts < 50) {
        attempts++;
        x = 80 + Math.random() * (databus.config.WIDTH - 160);
        y = 100 + Math.random() * (databus.config.HEIGHT - 200);

        valid = this.isObstaclePlacementValid(x, y, width, height);
      }

      if (!valid) {
        continue;
      }

      const obstacle = databus.createObstacle(
        `obstacle_${i}`,
        x, y,
        width, height
      );
      databus.obstacles.push(obstacle);
    }

    // 设置选中的弹珠（默认为玩家弹珠）
    databus.selectBall('player');
  }

  private handleCollision(type: 'player' | 'enemy', force: number): void {
    if (force > 50) {
      console.log(`${type}碰撞，力度: ${force.toFixed(1)}`);
    }
  }

  private update(dt: number): void {
    // 只有在游戏进行中才更新物理
    if (this.state === GameState.PLAYING || this.state === GameState.AIMING ||
      this.state === GameState.MOVING || this.state === GameState.SETTLING) {
      // 合并所有游戏对象用于物理更新
      const allBodies: PhysicsBody[] = [
        ...databus.balls,
        ...databus.obstacles
      ];

      // 更新物理引擎
      this.physics.update(allBodies, dt);

      // 应用额外的物理效果（重力、空气阻力等）
      databus.balls.forEach(ball => {
        if (!ball.isStatic) {
          ball.vy += databus.gravity * dt;
          ball.vx *= databus.airResistance;
          ball.vy *= databus.airResistance;
        }
      });

      // 调试：打印当前状态和回合
      if (Date.now() % 1000 < 50) { // 每1秒打印一次
        console.log(`[状态] ${GameState[this.state]}, [回合] ${Turn[this.turn]}`);
      }
      // 检测是否静止
      const isMoving = databus.balls.some(ball =>
        !ball.isStatic && (Math.abs(ball.vx) > 0.1 || Math.abs(ball.vy) > 0.1)
      );
      if (this.state === GameState.MOVING && !isMoving) {
        console.log("this.state === GameState.MOVING to SETTLING");
        this.state = GameState.SETTLING;
        setTimeout(() => this.eventManager.settleRound(), 100);
      }
    }

    // AI回合逻辑
    if (this.state === GameState.PLAYING && this.turn === Turn.AI) {
      this.turnTimer -= dt;
      if (this.turnTimer <= 0) {
        this.eventManager.executeAITurn();
      }
    }

    // 更新技能系统
    this.skillManager.update(dt);
  }

  private render(): void {
    try {
      // 清空画布
      ctx.clearRect(0, 0, databus.config.WIDTH, databus.config.HEIGHT);

      // 根据游戏状态决定渲染内容
      if (this.state === GameState.MENU || this.state === GameState.GAME_OVER) {
        // 菜单状态：只渲染菜单，不渲染游戏场景
        this.menu.render(this.menuState, databus.score);
      } else {
        // 游戏状态：渲染游戏场景和UI按钮
        this.renderGame();
        this.renderRestartButton();
        this.renderExitButton();
      }

      // 渲染 Toast 消息（始终在最上层）
      // ToastManager.render();
    } catch (error) {
      ErrorHandler.handleError(error as Error, ErrorLevel.ERROR, 'Game Render');
    }
  }

  // 添加新的渲染方法
  private renderRestartButton(): void {
    const layoutConfig = UIAdapter.getLayoutConfig();
    const buttonConfig = layoutConfig.buttons.topLeft;

    // 绘制按钮背景
    ctx.fillStyle = 'rgba(231, 76, 60, 0.8)'; // 红色
    ctx.fillRect(buttonConfig.x, buttonConfig.y, buttonConfig.width, buttonConfig.height);

    // 绘制按钮边框
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(buttonConfig.x, buttonConfig.y, buttonConfig.width, buttonConfig.height);

    // 绘制按钮文字
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '重新开始',
      buttonConfig.x + buttonConfig.width / 2,
      buttonConfig.y + buttonConfig.height / 2
    );

    // 存储按钮位置信息用于点击检测
    this.restartButtonRect = {
      x: buttonConfig.x,
      y: buttonConfig.y,
      width: buttonConfig.width,
      height: buttonConfig.height
    };
  }

  // 添加退出按钮渲染方法
  private renderExitButton(): void {
    const layoutConfig = UIAdapter.getLayoutConfig();
    const buttonConfig = layoutConfig.buttons.topLeftSecond;

    // 绘制按钮背景
    ctx.fillStyle = 'rgba(52, 73, 94, 0.8)'; // 深灰色
    ctx.fillRect(buttonConfig.x, buttonConfig.y, buttonConfig.width, buttonConfig.height);

    // 绘制按钮边框
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(buttonConfig.x, buttonConfig.y, buttonConfig.width, buttonConfig.height);

    // 绘制按钮文字
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '返回',
      buttonConfig.x + buttonConfig.width / 2,
      buttonConfig.y + buttonConfig.height / 2
    );

    // 存储按钮位置信息用于点击检测
    this.exitButtonRect = {
      x: buttonConfig.x,
      y: buttonConfig.y,
      width: buttonConfig.width,
      height: buttonConfig.height
    };
  }

  private renderGame(): void {
    // 绘制背景
    ctx.fillStyle = databus.config.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, databus.config.WIDTH, databus.config.HEIGHT);

    // 绘制所有物体
    [...databus.balls, ...databus.obstacles].forEach(body => {
      ctx.save();

      ctx.fillStyle = body.color;
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 2;

      if (body.type === 'circle') {
        const ball = body as GameBall;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 圆形高光
        ctx.beginPath();
        ctx.arc(
          ball.x - ball.radius * 0.3,
          ball.y - ball.radius * 0.3,
          ball.radius * 0.4,
          0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        // 如果已下注，显示特殊标记
        if (ball.hasBet) {
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (body.type === 'rectangle') {
        const obstacle = body as GameObstacle;

        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }

      ctx.restore();
    });

    // 绘制拖拽线（从事件管理器获取拖拽状态）
    const dragState = this.eventManager.getDragState();
    if (dragState.isDragging && dragState.dragStart && dragState.dragEnd) {
      const dx = dragState.dragStart.x - dragState.dragEnd.x;
      const dy = dragState.dragStart.y - dragState.dragEnd.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist, 200) / 200;

      // 绘制瞄准辅助线
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(dragState.dragStart.x, dragState.dragStart.y);
      ctx.lineTo(dragState.dragEnd.x, dragState.dragEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 绘制预测轨迹点
      const trajectoryPoints = this.calculateTrajectory(dragState.dragStart, { x: dx, y: dy }, power * 500);
      trajectoryPoints.forEach((point, index) => {
        const alpha = 1 - (index / trajectoryPoints.length) * 0.7;
        ctx.fillStyle = `rgba(46, 204, 113, ${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // 绘制力量指示器
      const powerBarX = databus.config.WIDTH - 50;
      const powerBarY = 50;
      const powerBarHeight = 150;
      
      // 背景框
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(powerBarX - 5, powerBarY - 5, 30, powerBarHeight + 10);
      
      // 力量条
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(powerBarX, powerBarY + (1 - power) * powerBarHeight, 20, power * powerBarHeight);
      
      // 边框
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(powerBarX, powerBarY, 20, powerBarHeight);
      
      // 力量文字
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(power * 100)}%`, powerBarX + 10, powerBarY - 10);

      // 绘制发射点
      ctx.fillStyle = `rgb(${Math.floor(power * 255)}, ${Math.floor((1 - power) * 255)}, 0)`;
      ctx.beginPath();
      ctx.arc(dragState.dragEnd.x, dragState.dragEnd.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制"一扎"范围
    if (this.state === GameState.SETTLING) {
      const player = databus.getPlayerBall();
      if (player) {
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, databus.handSpan, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 渲染技能效果
    this.skillManager.render(ctx);

    // 绘制UI - 只在游戏进行中显示
    if (this.state !== GameState.MENU && this.state !== GameState.GAME_OVER) {
      const layoutConfig = UIAdapter.getLayoutConfig();
      const infoConfig = layoutConfig.infoPanel;
      
      ctx.fillStyle = '#ecf0f1';
      ctx.font = `${infoConfig.fontSize}px Arial`;
      ctx.textAlign = 'left';
      
      // 使用 UIAdapter 的行位置
      ctx.fillText(`等级: ${databus.playerGrade}`, infoConfig.x, UIAdapter.getInfoLineY(0));
      ctx.fillText(`经验: ${databus.playerExp}/100`, infoConfig.x, UIAdapter.getInfoLineY(1));
      ctx.fillText(`积分: ${databus.score}`, infoConfig.x, UIAdapter.getInfoLineY(2));
      ctx.fillText(`回合: ${this.turn === Turn.PLAYER ? '玩家' : 'AI'}`, infoConfig.x, UIAdapter.getInfoLineY(3));
      ctx.fillText(`时间: ${Math.max(0, this.turnTimer).toFixed(1)}s`, infoConfig.x, UIAdapter.getInfoLineY(4));

      // 显示下注金额
      if (databus.betAmount > 0) {
        ctx.fillText(`下注: ${databus.betAmount}`, infoConfig.x, UIAdapter.getInfoLineY(5));
      }

      // 显示一扎距离
      ctx.fillText(`一扎: ${databus.handSpan}px`, infoConfig.x, UIAdapter.getInfoLineY(6));

      // 绘制技能按钮
      this.renderSkillButtons();
    }
  }

  // 赛前被动技能标签渲染
  private renderSkillButtons(): void {
    const skillButtonHeight = 44;
    const skillButtonSpacing = 10;
    const skillButtonY = databus.config.HEIGHT - skillButtonHeight - 20;
    const skillButtons = this.skillManager.getMatchSkills();

    if (skillButtons.length === 0) {
      this.skillButtonRects = [];
      return;
    }

    this.skillButtonRects = [];
    let currentX = 20;
    
    skillButtons.forEach((skill, index) => {
      const label = skill.comment || skill.name;
      const width = Math.max(96, label.length * 14 + 24);
      const x = currentX;
      currentX += width + skillButtonSpacing;
      
      ctx.fillStyle = this.getSkillButtonColor(skill.id);
      ctx.fillRect(x, skillButtonY, width, skillButtonHeight);
      
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, skillButtonY, width, skillButtonHeight);
      
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + width / 2, skillButtonY + skillButtonHeight / 2);
      
      this.skillButtonRects.push({
        id: skill.id,
        x: x,
        y: skillButtonY,
        width: width,
        height: skillButtonHeight
      });
    });
  }

  /**
   * 计算弹珠预测轨迹
   */
  private calculateTrajectory(startPos: { x: number; y: number }, velocity: { x: number; y: number }, force: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const maxPoints = 20;
    const dt = 0.016; // 60fps
    let x = startPos.x;
    let y = startPos.y;
    let vx = velocity.x * force * 0.001;
    let vy = velocity.y * force * 0.001;

    for (let i = 0; i < maxPoints; i++) {
      // 应用重力
      vy += databus.gravity * dt;
      // 应用空气阻力
      vx *= databus.airResistance;
      vy *= databus.airResistance;
      
      // 更新位置
      x += vx * dt * 60;
      y += vy * dt * 60;
      
      // 添加到轨迹点
      points.push({ x, y });
      
      // 检查边界碰撞
      if (x < 0 || x > databus.config.WIDTH || y < 0 || y > databus.config.HEIGHT) {
        break;
      }
    }
    
    return points;
  }

  private lastTime: number = 0;
  private gameLoop = (): void => {
    const current = Date.now();
    const dt = (current - this.lastTime) / 1000 || 0.016;
    this.lastTime = current;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * 获取游戏状态
   */
  public getState(): GameState {
    return this.state;
  }

  /**
   * 设置游戏状态
   */
  public setState(state: GameState): void {
    this.state = state;
  }

  /**
   * 获取菜单状态
   */
  public getMenuState(): MenuState {
    return this.menuState;
  }

  /**
   * 设置菜单状态
   */
  public setMenuState(state: MenuState): void {
    this.menuState = state;
    if (state !== 'NONE') {
      this.state = GameState.MENU;
      
      // 添加状态切换提示
      switch (state) {
        case 'STORE':
          // ToastManager.info('进入积分商店');
          break;
        case 'SETTINGS':
          // ToastManager.info('进入游戏设置');
          break;
        case 'HELP':
          // ToastManager.info('查看游戏说明');
          break;
        case 'MAIN':
          // ToastManager.info('返回主菜单');
          break;
        default:
          break;
      }
    }
  }

  /**
   * 获取当前回合
   */
  public getTurn(): Turn {
    return this.turn;
  }

  /**
   * 切换回合
   */
  public switchTurn(): void {
    this.turn = this.turn === Turn.PLAYER ? Turn.AI : Turn.PLAYER;
  }

  /**
   * 重置回合计时器
   */
  public resetTurnTimer(): void {
    this.turnTimer = databus.config.TURN_TIME;
  }

  /**
   * 获取物理引擎
   */
  public getPhysicsEngine(): PhysicsEngine {
    return this.physics;
  }

  /**
   * 外部方法：领取积分
   */
  public claimPoints(): boolean {
    if (databus.claimPoints()) {
      return true;
    }
    return false;
  }

  /**
   * 外部方法：下注
   */
  public placeBet(amount: number): boolean {
    return databus.placeBet(amount);
  }

  /**
   * 外部方法：切换暂停/继续
   */
  public togglePause(): void {
    this.eventManager.togglePause();
  }

  // 添加获取重新开始按钮信息的方法
  public getRestartButtonRect(): { x: number, y: number, width: number, height: number } | null {
    return this.restartButtonRect;
  }

  // 添加获取退出按钮信息的方法
  public getExitButtonRect(): { x: number, y: number, width: number, height: number } | null {
    return this.exitButtonRect;
  }

  // 添加获取技能按钮信息的方法
  public getSkillButtonRects(): { id: string, x: number, y: number, width: number, height: number }[] {
    return this.skillButtonRects || [];
  }

  // 添加技能激活方法
  public activateSkill(skillId: string): boolean {
    if (this.turn !== Turn.PLAYER || this.state !== GameState.PLAYING) {
      console.log('只能在玩家回合且游戏进行中使用技能');
      return false;
    }

    const playerBall = databus.getPlayerBall();
    if (!playerBall) {
      console.log('找不到玩家弹珠');
      return false;
    }

    return this.skillManager.activateSkill(skillId, playerBall, null, this);
  }

  /**
   * 退出游戏
   */
  public exitGame(): void {
    this.state = GameState.MENU;
    this.menuState = MenuState.MAIN;
    this.resetGame();
  }

  /**
   * 分享游戏成绩
   */
  public shareScore(): void {
    ShareManager.shareScore(databus.score, databus.playerGrade)
      .then(() => {
        console.log('分享成功');
        ToastManager.success('分享成功！获得10积分奖励');

        const reward = ShareManager.getShareReward();
        if (reward > 0) {
          databus.addScore(reward);
        }
      })
      .catch((error) => {
        console.error('分享失败:', error);
        ToastManager.error('分享失败');
      });
  }

  /**
   * 分享胜利
   */
  public shareVictory(): void {
    ShareManager.shareVictory()
      .then(() => {
        console.log('胜利分享成功');
        ToastManager.success('胜利分享成功！获得10积分奖励');
        
        // 获取分享奖励
        const reward = ShareManager.getShareReward();
        if (reward > 0) {
          databus.addScore(reward);
        }
      })
      .catch((error) => {
        console.error('分享失败:', error);
        ToastManager.error('分享失败');
      });
  }

  /**
   * 分享弹珠解锁
   */
  public shareMarbleUnlock(marbleName: string): void {
    ShareManager.shareMarbleUnlock(marbleName)
      .then(() => {
        console.log('弹珠解锁分享成功');
        ToastManager.success('弹珠解锁分享成功！获得10积分奖励');
        
        // 获取分享奖励
        const reward = ShareManager.getShareReward();
        if (reward > 0) {
          databus.addScore(reward);
        }
      })
      .catch((error) => {
        console.error('分享失败:', error);
        ToastManager.error('分享失败');
      });
  }

  /**
   * 分享最高分
   */
  public shareHighScore(): void {
    const stats = databus.getGameStats();
    ShareManager.shareHighScore(stats.highestScore, stats.winRate)
      .then(() => {
        console.log('最高分分享成功');
        ToastManager.success('最高分分享成功！获得10积分奖励');
        
        // 获取分享奖励
        const reward = ShareManager.getShareReward();
        if (reward > 0) {
          databus.addScore(reward);
        }
      })
      .catch((error) => {
        console.error('分享失败:', error);
        ToastManager.error('分享失败');
      });
  }

  /**
   * 分享游戏统计
   */
  public shareGameStats(): void {
    const stats = databus.getGameStats();
    ShareManager.shareGameStats(stats.totalGamesPlayed, stats.totalWins, stats.totalMarblesUnlocked)
      .then(() => {
        console.log('游戏统计分享成功');
        ToastManager.success('游戏统计分享成功！获得10积分奖励');
        
        // 获取分享奖励
        const reward = ShareManager.getShareReward();
        if (reward > 0) {
          databus.addScore(reward);
        }
      })
      .catch((error) => {
        console.error('分享失败:', error);
        ToastManager.error('分享失败');
      });
  }
}

export default RetroMarbleGame;

// 微信小游戏需要 CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RetroMarbleGame;
}