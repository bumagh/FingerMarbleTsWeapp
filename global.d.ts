// 扩展全局对象
declare global
{
    // 微信小游戏 API
    const wx: WechatMinigame.Wx;

    // 游戏全局对象
    interface GameGlobal
    {
        globalData: any;
        canvas?: HTMLCanvasElement;
        context?: CanvasRenderingContext2D;
        [ key: string ]: any;
    }

    const GameGlobal: GameGlobal;

    // 标准浏览器 API（在微信小游戏中也可用）
    const console: Console;
    const setTimeout: typeof global.setTimeout;
    const setInterval: typeof global.setInterval;
    const clearTimeout: typeof global.clearTimeout;
    const clearInterval: typeof global.clearInterval;
    const requestAnimationFrame: ( callback: FrameRequestCallback ) => number;

    // Node.js 风格的模块导出（微信小游戏支持）
    const module: { exports: any };
    const exports: any;
}

// 确保文件被视为模块
export { };