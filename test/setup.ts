// test/setup.ts
// Jest 测试环境设置

// Mock 微信小游戏API
global.wx = {
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),
  getStorageInfoSync: jest.fn(),
  onTouchStart: jest.fn(),
  onTouchMove: jest.fn(),
  onTouchEnd: jest.fn(),
  offTouchStart: jest.fn(),
  offTouchMove: jest.fn(),
  offTouchEnd: jest.fn(),
  shareAppMessage: jest.fn(),
  onShareAppMessage: jest.fn(),
  showShareMenu: jest.fn(),
  hideShareMenu: jest.fn(),
  showToast: jest.fn(),
  hideToast: jest.fn(),
  showModal: jest.fn(),
  vibrateShort: jest.fn(),
  vibrateLong: jest.fn(),
  createCanvas: jest.fn(() => ({
    width: 375,
    height: 667,
    getContext: jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      rect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      setTransform: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      clip: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 }))
    }))
  }))
};

// Mock Canvas 2D Context
global.CanvasRenderingContext2D = jest.fn().mockImplementation(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  rect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  setTransform: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  clip: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 }))
}));

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// 清理所有 mock
afterEach(() => {
  jest.clearAllMocks();
});
