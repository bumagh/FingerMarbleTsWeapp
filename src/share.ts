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

export interface ShareStats {
  totalShares: number;
  friendShares: number;
  timelineShares: number;
  scoreShares: number;
  victoryShares: number;
  marbleUnlockShares: number;
  lastShareTime: number;
}

export class ShareManager {
  private static instance: ShareManager;
  private stats: ShareStats;

  private constructor() {
    this.loadStats();
    this.initShareConfig();
  }

  public static getInstance(): ShareManager {
    if (!ShareManager.instance) {
      ShareManager.instance = new ShareManager();
    }
    return ShareManager.instance;
  }

  /**
   * 加载分享统计数据
   */
  private loadStats(): void {
    this.stats = {
      totalShares: 0,
      friendShares: 0,
      timelineShares: 0,
      scoreShares: 0,
      victoryShares: 0,
      marbleUnlockShares: 0,
      lastShareTime: 0
    };

    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const savedStats = wx.getStorageSync('shareStats');
      if (savedStats) {
        this.stats = { ...this.stats, ...savedStats };
      }
    }
  }

  /**
   * 保存分享统计数据
   */
  private saveStats(): void {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync('shareStats', this.stats);
    }
  }

  /**
   * 更新分享统计
   */
  private updateStats(type: 'friend' | 'timeline', category?: string): void {
    this.stats.totalShares++;
    this.stats.lastShareTime = Date.now();
    
    if (type === 'friend') {
      this.stats.friendShares++;
    } else {
      this.stats.timelineShares++;
    }

    // 根据分类更新统计
    switch (category) {
      case 'score':
        this.stats.scoreShares++;
        break;
      case 'victory':
        this.stats.victoryShares++;
        break;
      case 'marble_unlock':
        this.stats.marbleUnlockShares++;
        break;
    }

    this.saveStats();
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
        this.updateStats('friend');
        return this.getDefaultShareConfig();
      });

      // 设置朋友圈分享内容
      wx.onShareTimeline(() => {
        this.updateStats('timeline');
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

      // 更新统计
      this.updateStats('friend');
      
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
   * 分享到朋友圈
   */
  public shareToTimeline(config?: Partial<ShareConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      // 微信小游戏只能通过右上角菜单分享到朋友圈，不能主动调用
      // 这里只能更新分享内容，实际分享需要用户手动操作
      if (typeof wx === 'undefined') {
        reject(new Error('分享功能不可用'));
        return;
      }

      const shareConfig = { ...this.getTimelineShareConfig(), ...config };
      
      // 更新朋友圈分享内容
      wx.onShareTimeline(() => shareConfig);

      // 更新统计（模拟分享，实际分享需要用户操作）
      this.updateStats('timeline');
      
      resolve();
    });
  }

  /**
   * 分享最高分
   */
  public shareHighScore(highScore: number, winRate: number): Promise<void> {
    const title = `我的谁是珠王最高分：${highScore}分！胜率${winRate}%，谁能超越我？`;
    return this.shareToTimeline({
      title,
      query: `from=high_score&score=${highScore}&winRate=${winRate}`
    });
  }

  /**
   * 分享游戏统计
   */
  public shareGameStats(totalGames: number, wins: number, marblesUnlocked: number): Promise<void> {
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const title = `谁是珠王战报：${totalGames}场对战，${wins}场胜利，解锁${marblesUnlocked}种弹珠！`;
    return this.shareToFriends({
      title,
      query: `from=stats&games=${totalGames}&wins=${wins}&marbles=${marblesUnlocked}`
    });
  }

  /**
   * 检查分享功能是否可用
   */
  public isShareAvailable(): boolean {
    return typeof wx !== 'undefined' && 
           typeof wx.shareAppMessage === 'function';
  }

  /**
   * 检查朋友圈分享是否可用
   */
  public isTimelineShareAvailable(): boolean {
    return typeof wx !== 'undefined' && 
           typeof wx.onShareTimeline === 'function';
  }

  /**
   * 获取分享统计数据
   */
  public getShareStats(): ShareStats {
    return { ...this.stats };
  }

  /**
   * 重置分享统计
   */
  public resetStats(): void {
    this.stats = {
      totalShares: 0,
      friendShares: 0,
      timelineShares: 0,
      scoreShares: 0,
      victoryShares: 0,
      marbleUnlockShares: 0,
      lastShareTime: 0
    };
    this.saveStats();
  }

  /**
   * 检查是否可以获得分享奖励
   */
  public canGetShareReward(): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    return now - this.stats.lastShareTime >= oneHour;
  }

  /**
   * 获取分享奖励
   */
  public getShareReward(): number {
    if (this.canGetShareReward()) {
      this.stats.lastShareTime = Date.now();
      this.saveStats();
      return 10; // 分享奖励10积分
    }
    return 0;
  }
}

// 导出单例
export default ShareManager.getInstance();
