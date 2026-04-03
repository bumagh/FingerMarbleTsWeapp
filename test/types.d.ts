// test/types.d.ts
// Jest 和微信小游戏 API 类型声明

declare global {
  var wx: {
    setStorageSync: jest.Mock;
    getStorageSync: jest.Mock;
    removeStorageSync: jest.Mock;
    clearStorageSync: jest.Mock;
    getStorageInfoSync: jest.Mock;
    onTouchStart: jest.Mock;
    onTouchMove: jest.Mock;
    onTouchEnd: jest.Mock;
    offTouchStart: jest.Mock;
    offTouchMove: jest.Mock;
    offTouchEnd: jest.Mock;
    shareAppMessage: jest.Mock;
    onShareAppMessage: jest.Mock;
    showShareMenu: jest.Mock;
    hideShareMenu: jest.Mock;
    showToast: jest.Mock;
    hideToast: jest.Mock;
    showModal: jest.Mock;
    vibrateShort: jest.Mock;
    vibrateLong: jest.Mock;
    createCanvas: jest.Mock;
  };

  var CanvasRenderingContext2D: jest.MockConstructor<CanvasRenderingContext2D>;
}

declare namespace jest {
  interface Matchers<R> {
    toBeValidGameState(): R;
    toBeValidMenuState(): R;
    toBeValidTurn(): R;
  }
}
