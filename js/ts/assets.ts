// retro-marble-game-040926/frontend/public/src/assets.ts

/**
 * Asset Management Module
 * Handles preloading and storage of visual resources (images, textures)
 * 遵循极简高性能原则，使用Promise并发加载资源
 */

export interface GameAssets {
  images: Record<string, HTMLImageElement>;
}

export class AssetManager {
  private static instance: AssetManager;
  private images: Map<string, HTMLImageElement> = new Map();
  private loaded: boolean = false;

  // 资源清单：使用用户提供的复古风格素材
  private readonly resourceList = {
    // 装饰性边框/徽章素材
    'ornament_corner': 'https://hpi-hub.tos-cn-beijing.volces.com/static/batch_4/1757183192350-4337.jpg',
    // 复古墙纸纹理（用于背景或UI底板）
    'bg_texture': 'https://hpi-hub.tos-cn-beijing.volces.com/static/batch_23/1757578044234-2390.jpg',
    // 弹珠材质（多彩油滴效果）
    'marble_texture': 'https://hpi-hub.tos-cn-beijing.volces.com/static/mobilewallpapers/cHJpdmF0ZS9sci91748499182013-4686OGZfMS5qcGc.jpg',
    // 备用弹珠纹理（抽象艺术）
    'marble_alt': 'https://hpi-hub.tos-cn-beijing.volces.com/static/gif/23-18-14-953_512.gif'
  };

  private constructor() {}

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * 预加载所有定义的资源
   * @returns Promise<void>
   */
  public async preload(): Promise<void> {
    if (this.loaded) return;

    const promises = Object.entries(this.resourceList).map(([key, url]) => {
      return this.loadImage(key, url);
    });

    try {
      await Promise.all(promises);
      this.loaded = true;
      console.log('All assets loaded successfully.');
    } catch (error) {
      console.error('Failed to load assets:', error);
      // 即使部分失败也允许继续，后续通过默认绘制兜底
    }
  }

  /**
   * 加载单张图片
   */
  private loadImage(key: string, url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // 处理跨域
      img.src = url;
      
      img.onload = () => {
        this.images.set(key, img);
        resolve(img);
      };
      
      img.onerror = (e) => {
        console.warn(`Failed to load image: ${key}`, e);
        // 失败时不reject，而是resolve一个空图或让get返回undefined，避免阻塞游戏启动
        // 这里选择reject由上层捕获，或自行生成占位图
        resolve(img); 
      };
    });
  }

  /**
   * 获取图片资源
   * @param key 资源键名
   */
  public getImage(key: keyof typeof this.resourceList): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  /**
   * 检查是否加载完成
   */
  public isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 创建纯色纹理（用于资源加载失败时的兜底）
   */
  public createPlaceholderTexture(width: number, height: number, color: string): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
    }
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }
}