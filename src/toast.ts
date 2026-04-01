// src/toast.ts
/**
 * Toast 提示系统
 * 提供用户友好的消息提示
 */

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  timestamp: number;
}

export class ToastManager {
  private static instance: ToastManager;
  private messages: ToastMessage[] = [];
  private ctx: CanvasRenderingContext2D;
  private canvas: WechatMinigame.Canvas;
  private maxMessages: number = 3;
  private defaultDuration: number = 3000;

  private constructor() {}

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  /**
   * 初始化 Toast 系统
   */
  public init(ctx: CanvasRenderingContext2D, canvas: WechatMinigame.Canvas): void {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /**
   * 显示成功消息
   */
  public success(message: string, duration?: number): void {
    this.showMessage(message, ToastType.SUCCESS, duration);
  }

  /**
   * 显示错误消息
   */
  public error(message: string, duration?: number): void {
    this.showMessage(message, ToastType.ERROR, duration);
  }

  /**
   * 显示警告消息
   */
  public warning(message: string, duration?: number): void {
    this.showMessage(message, ToastType.WARNING, duration);
  }

  /**
   * 显示信息消息
   */
  public info(message: string, duration?: number): void {
    this.showMessage(message, ToastType.INFO, duration);
  }

  /**
   * 显示消息
   */
  private showMessage(message: string, type: ToastType, duration?: number): void {
    const toast: ToastMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      duration: duration || this.defaultDuration,
      timestamp: Date.now()
    };

    // 添加到消息列表
    this.messages.push(toast);

    // 限制消息数量
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }

    // 自动移除过期消息
    setTimeout(() => {
      this.removeMessage(toast.id);
    }, toast.duration);
  }

  /**
   * 移除消息
   */
  private removeMessage(id: string): void {
    const index = this.messages.findIndex(msg => msg.id === id);
    if (index !== -1) {
      this.messages.splice(index, 1);
    }
  }

  /**
   * 渲染所有 Toast 消息
   */
  public render(): void {
    if (!this.ctx || !this.canvas) return;

    const now = Date.now();
    const startY = this.canvas.height - 20;
    const spacing = 60;

    this.messages.forEach((toast, index) => {
      const age = now - toast.timestamp;
      const opacity = Math.max(0, 1 - age / toast.duration);
      const y = startY - (index * spacing);

      this.renderToast(toast, y, opacity);
    });
  }

  /**
   * 渲染单个 Toast
   */
  private renderToast(toast: ToastMessage, y: number, opacity: number): void {
    if (!this.ctx) return;

    const padding = 12;
    const borderRadius = 8;
    const fontSize = 14;
    const maxWidth = this.canvas.width - 40;

    // 设置样式
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // 测量文本宽度
    const textWidth = Math.min(this.ctx.measureText(toast.message).width + padding * 2, maxWidth);
    const x = (this.canvas.width - textWidth) / 2;

    // 绘制背景
    this.ctx.fillStyle = this.getBackgroundColor(toast.type);
    this.roundRect(x, y - 20, textWidth, 40, borderRadius);
    this.ctx.fill();

    // 绘制文本
    this.ctx.fillStyle = this.getTextColor(toast.type);
    this.ctx.fillText(toast.message, x + textWidth / 2, y);

    this.ctx.restore();
  }

  /**
   * 绘制圆角矩形
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * 获取背景颜色
   */
  private getBackgroundColor(type: ToastType): string {
    switch (type) {
      case ToastType.SUCCESS:
        return 'rgba(46, 204, 113, 0.9)';
      case ToastType.ERROR:
        return 'rgba(231, 76, 60, 0.9)';
      case ToastType.WARNING:
        return 'rgba(241, 196, 15, 0.9)';
      case ToastType.INFO:
        return 'rgba(52, 152, 219, 0.9)';
      default:
        return 'rgba(149, 165, 166, 0.9)';
    }
  }

  /**
   * 获取文本颜色
   */
  private getTextColor(type: ToastType): string {
    return '#ffffff';
  }

  /**
   * 清除所有消息
   */
  public clear(): void {
    this.messages = [];
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return !!(this.ctx && this.canvas);
  }
}

// 导出单例
export default ToastManager.getInstance();
