// src/share.ts
/**
 * 微信小游戏分享功能
 * 提供分享到好友、朋友圈等功能
 */

export interface ShareConfig {
  title: string;
  imageUrl?: string;
  query?: string;
}

export class ShareManager {
  private static instance: ShareManager;

  private constructor() {
    this.initShareConfig();
  }

  public static getInstance(): ShareManager {
    if (!ShareManager.instance) {
      ShareManager.instance = new ShareManager();
    }
    return ShareManager.instance;
  }

  /**
   * 初始化分享配置
   */
  private initShareConfig(): void {
    if (typeof wx !== 'undefined' && wx.showShareMenu) {
      // 显示分享按钮
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });

      // 设置默认分享内容
      wx.onShareAppMessage(() => {
        return this.getDefaultShareConfig();
      });

      // 设置朋友圈分享内容
      wx.onShareTimeline(() => {
        return this.getTimelineShareConfig();
      });
    }
  }

  /**
   * 获取默认分享配置
   */
  private getDefaultShareConfig(): ShareConfig {
    return {
      title: '谁是珠王 - 校园弹珠战术游戏',
      imageUrl: 'assets/share_image.png', // 需要添加分享图片
      query: 'from=share'
    };
  }

  /**
   * 获取朋友圈分享配置
   */
  private getTimelineShareConfig(): ShareConfig {
    return {
      title: '我在玩谁是珠王，快来挑战我！',
      imageUrl: 'assets/share_image.png',
      query: 'from=timeline'
    };
  }

  /**
   * 主动分享到好友
   */
  public shareToFriends(config?: Partial<ShareConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof wx === 'undefined' || !wx.shareAppMessage) {
        reject(new Error('分享功能不可用'));
        return;
      }

      const shareConfig = { ...this.getDefaultShareConfig(), ...config };

      wx.shareAppMessage({
        ...shareConfig
      });

      // 微信小游戏分享是同步的，直接返回成功
      resolve();
    });
  }

  /**
   * 分享游戏成绩
   */
  public shareScore(score: number, grade: number): Promise<void> {
    return this.shareToFriends({
      title: `我在谁是珠王中获得了${score}积分，达到了${grade}级！`,
      query: `from=share&score=${score}&grade=${grade}`
    });
  }

  /**
   * 分享胜利
   */
  public shareVictory(): Promise<void> {
    return this.shareToFriends({
      title: '我在谁是珠王中成功捕获了对手！',
      query: 'from=victory'
    });
  }

  /**
   * 分享弹珠解锁
   */
  public shareMarbleUnlock(marbleName: string): Promise<void> {
    return this.shareToFriends({
      title: `我在谁是珠王中解锁了${marbleName}！`,
      query: 'from=marble_unlock'
    });
  }

  /**
   * 检查分享功能是否可用
   */
  public isShareAvailable(): boolean {
    return typeof wx !== 'undefined' && 
           typeof wx.shareAppMessage === 'function';
  }
}

// 导出单例
export default ShareManager.getInstance();
