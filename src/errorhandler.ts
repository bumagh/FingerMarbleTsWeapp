// src/errorhandler.ts
/**
 * 全局错误处理系统
 * 提供错误捕获、日志记录和用户提示
 */

import ToastManager, { ToastType } from './toast';

export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ErrorInfo {
  level: ErrorLevel;
  message: string;
  stack?: string;
  context?: string;
  timestamp: number;
  userAgent?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private toastManager: typeof ToastManager;
  private errors: ErrorInfo[] = [];
  private maxErrors: number = 50;

  private constructor() {
    this.toastManager = ToastManager;
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 初始化错误处理系统
   */
  public init(): void {
    // 设置全局错误处理
    if (typeof window !== 'undefined') {
      window.onerror = (message: string, source?: string, lineno?: number, colno?: number, error?: Error) => {
        this.handleError(error || new Error(String(message)), ErrorLevel.ERROR, 'Global Error');
        return true; // 阻止默认错误处理
      };

      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        this.handleError(
          new Error(String(event.reason)),
          ErrorLevel.ERROR,
          'Unhandled Promise Rejection'
        );
      });
    }

    // 设置微信小游戏错误处理
    if (typeof wx !== 'undefined') {
      wx.onError((res: any) => {
        this.handleError(new Error(res.message || res), ErrorLevel.ERROR, 'WeChat Error');
      });

      wx.onMemoryWarning((res: any) => {
        this.handleError(new Error('Memory Warning: ' + (res.level || 'unknown')), ErrorLevel.WARNING, 'Memory Warning');
      });
    }
  }

  /**
   * 处理错误
   */
  public handleError(error: Error, level: ErrorLevel = ErrorLevel.ERROR, context?: string): void {
    const errorInfo: ErrorInfo = {
      level,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'WeChat MiniGame'
    };

    // 记录错误
    this.logError(errorInfo);

    // 显示用户提示
    this.showUserMessage(errorInfo);

    // 严重错误时尝试恢复
    if (level === ErrorLevel.CRITICAL) {
      this.handleCriticalError(errorInfo);
    }
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo): void {
    // 添加到内存日志
    this.errors.push(errorInfo);

    // 限制日志数量
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // 控制台输出
    const logMethod = this.getLogMethod(errorInfo.level);
    logMethod(`[${errorInfo.level.toUpperCase()}] ${errorInfo.message}`, errorInfo);

    // 本地存储重要错误
    if (errorInfo.level === ErrorLevel.ERROR || errorInfo.level === ErrorLevel.CRITICAL) {
      this.saveErrorToStorage(errorInfo);
    }
  }

  /**
   * 获取日志方法
   */
  private getLogMethod(level: ErrorLevel): Function {
    switch (level) {
      case ErrorLevel.INFO:
        return console.log;
      case ErrorLevel.WARNING:
        return console.warn;
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * 显示用户提示
   */
  private showUserMessage(errorInfo: ErrorInfo): void {
    // 暂时关闭 Toast 显示
    return;
    
    if (!this.toastManager.isInitialized()) return;

    const userMessage = this.getUserFriendlyMessage(errorInfo);
    const toastType = this.getToastType(errorInfo.level);

    switch (errorInfo.level) {
      case ErrorLevel.INFO:
        this.toastManager.info(userMessage, 2000);
        break;
      case ErrorLevel.WARNING:
        this.toastManager.warning(userMessage, 3000);
        break;
      case ErrorLevel.ERROR:
        this.toastManager.error(userMessage, 4000);
        break;
      case ErrorLevel.CRITICAL:
        this.toastManager.error(userMessage, 5000);
        break;
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    // 根据错误类型和上下文返回友好的消息
    if (errorInfo.context) {
      if (errorInfo.context.includes('Share')) {
        return '分享功能暂时不可用，请稍后再试';
      }
      if (errorInfo.context.includes('Storage')) {
        return '数据保存失败，请检查存储空间';
      }
      if (errorInfo.context.includes('Network')) {
        return '网络连接异常，请检查网络设置';
      }
      if (errorInfo.context.includes('Physics')) {
        return '游戏物理引擎异常，请重新开始游戏';
      }
    }

    // 根据错误消息返回友好提示
    const message = errorInfo.message.toLowerCase();
    if (message.includes('memory') || message.includes('out of memory')) {
      return '内存不足，请关闭其他应用后重试';
    }
    if (message.includes('permission') || message.includes('denied')) {
      return '权限不足，请检查应用设置';
    }
    if (message.includes('timeout')) {
      return '操作超时，请重试';
    }

    // 默认错误消息
    switch (errorInfo.level) {
      case ErrorLevel.INFO:
        return errorInfo.message;
      case ErrorLevel.WARNING:
        return `注意：${errorInfo.message}`;
      case ErrorLevel.ERROR:
        return `操作失败：${errorInfo.message}`;
      case ErrorLevel.CRITICAL:
        return '系统出现严重错误，正在尝试恢复...';
      default:
        return errorInfo.message;
    }
  }

  /**
   * 获取 Toast 类型
   */
  private getToastType(level: ErrorLevel): ToastType {
    switch (level) {
      case ErrorLevel.INFO:
        return ToastType.INFO;
      case ErrorLevel.WARNING:
        return ToastType.WARNING;
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        return ToastType.ERROR;
      default:
        return ToastType.INFO;
    }
  }

  /**
   * 处理严重错误
   */
  private handleCriticalError(errorInfo: ErrorInfo): void {
    console.error('Critical error detected, attempting recovery:', errorInfo);

    // 尝试清理内存（如果可用）
    if (typeof (globalThis as any).gc === 'function') {
      (globalThis as any).gc();
    }

    // 清理缓存
    this.clearCache();

    // 可以在这里添加恢复逻辑，比如重置游戏状态
    console.warn('Critical error recovery attempted');
  }

  /**
   * 清理缓存
   */
  private clearCache(): void {
    // 清理错误日志
    if (this.errors.length > this.maxErrors / 2) {
      this.errors = this.errors.slice(-Math.floor(this.maxErrors / 2));
    }
  }

  /**
   * 保存错误到本地存储
   */
  private saveErrorToStorage(errorInfo: ErrorInfo): void {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      try {
        const key = 'error_logs';
        const logs = wx.getStorageSync(key) || [];
        logs.push(errorInfo);
        
        // 只保留最近 20 条错误日志
        if (logs.length > 20) {
          logs.splice(0, logs.length - 20);
        }
        
        wx.setStorageSync(key, logs);
      } catch (e) {
        console.error('Failed to save error log to storage:', e);
      }
    }
  }

  /**
   * 获取错误日志
   */
  public getErrorLogs(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * 清除错误日志
   */
  public clearErrorLogs(): void {
    this.errors = [];
    
    if (typeof wx !== 'undefined' && wx.removeStorageSync) {
      try {
        wx.removeStorageSync('error_logs');
      } catch (e) {
        console.error('Failed to clear error logs from storage:', e);
      }
    }
  }

  /**
   * 手动报告错误
   */
  public report(message: string, level: ErrorLevel = ErrorLevel.ERROR, context?: string): void {
    this.handleError(new Error(message), level, context);
  }
}

// 导出单例
export default ErrorHandler.getInstance();
