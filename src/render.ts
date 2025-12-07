// 导入微信小游戏类型定义
declare const wx: any;
declare const GameGlobal: any;

// 创建画布并设置全局变量
GameGlobal.canvas = wx.createCanvas();

// 获取窗口/屏幕信息
const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();

// 设置画布尺寸
GameGlobal.canvas.width = windowInfo.screenWidth;
GameGlobal.canvas.height = windowInfo.screenHeight;

// 导出屏幕尺寸常量
export const SCREEN_WIDTH: number = windowInfo.screenWidth;
export const SCREEN_HEIGHT: number = windowInfo.screenHeight;