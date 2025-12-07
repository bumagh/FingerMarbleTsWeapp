// src/screen.ts
/**
 * 屏幕尺寸工具
 * 避免循环依赖，动态获取屏幕尺寸
 */

// 获取屏幕信息
export function getScreenInfo() {
    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      return {
        width: windowInfo.screenWidth,
        height: windowInfo.screenHeight,
        pixelRatio: windowInfo.pixelRatio || 1
      };
    } catch (error) {
      console.error('获取屏幕信息失败:', error);
      // 返回默认值
      return {
        width: 375,
        height: 667,
        pixelRatio: 1
      };
    }
  }
  
  // 导出屏幕尺寸常量（动态获取）
  export const SCREEN_WIDTH = getScreenInfo().width;
  export const SCREEN_HEIGHT = getScreenInfo().height;