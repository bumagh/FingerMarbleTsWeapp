// src/menu.ts
import { Vector } from "./physics";

// 扩展 MenuState 类型
export type MenuState = 'MAIN' | 'HELP' | 'GAME_OVER' | 'SETTINGS' | 'STORE' | 'NONE';

// 弹珠类型定义
export interface MarbleType
{
  id: string;
  name: string;
  description: string;
  cost: number;       // 解锁所需积分
  unlocked: boolean;  // 是否已解锁
  color: string;      // 主要颜色
  accent: string;     // 装饰颜色
  texture?: string;   // 纹理样式
  effect?: string;    // 特殊效果描述
}

// 设置选项
export interface SettingOption
{
  id: string;
  name: string;
  type: 'toggle' | 'slider' | 'select';
  value: any;
  options?: string[]; // 仅type为select时使用
  min?: number;       // 仅type为slider时使用
  max?: number;       // 仅type为slider时使用
}

interface Button
{
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  onClick: () => void;
}

export class MenuSystem
{
  private ctx: CanvasRenderingContext2D;
  private canvas: WechatMinigame.Canvas;
  private width: number;
  private height: number;
  private buttons: Button[] = [];
  private gameOverInfo: { win: boolean; message: string } | null = null;

  // 弹珠商店数据
  public marbleStore: MarbleType[] = [
    {
      id: 'basic_red',
      name: '赤焰珠',
      description: '基础红色弹珠，经典款式',
      cost: 0,
      unlocked: true,
      color: '#B22222',
      accent: '#8B0000'
    },
    {
      id: 'ocean_blue',
      name: '深海珠',
      description: '深邃蓝色，像大海一样神秘',
      cost: 100,
      unlocked: true,
      color: '#1E90FF',
      accent: '#000080'
    },
    {
      id: 'emerald_green',
      name: '翡翠珠',
      description: '翠绿色，带有自然气息',
      cost: 150,
      unlocked: false,
      color: '#32CD32',
      accent: '#006400'
    },
    {
      id: 'golden_sun',
      name: '金阳珠',
      description: '金色光泽，象征胜利',
      cost: 200,
      unlocked: false,
      color: '#FFD700',
      accent: '#DAA520'
    },
    {
      id: 'purple_magic',
      name: '紫幻珠',
      description: '紫色魔法弹珠',
      cost: 250,
      unlocked: false,
      color: '#9370DB',
      accent: '#4B0082'
    },
    {
      id: 'crystal_clear',
      name: '水晶珠',
      description: '透明水晶材质',
      cost: 300,
      unlocked: false,
      color: '#FFFFFF',
      accent: '#E0FFFF'
    }
  ];

  // 设置选项
  private settings: SettingOption[] = [
    {
      id: 'sound',
      name: '音效',
      type: 'toggle',
      value: true
    },
    {
      id: 'music',
      name: '背景音乐',
      type: 'toggle',
      value: true
    },
    {
      id: 'vibration',
      name: '震动反馈',
      type: 'toggle',
      value: true
    },
    {
      id: 'difficulty',
      name: '游戏难度',
      type: 'select',
      value: '中等',
      options: [ '简单', '中等', '困难' ]
    },
    {
      id: 'aim_assist',
      name: '瞄准辅助',
      type: 'toggle',
      value: true
    },
    {
      id: 'particle',
      name: '粒子效果',
      type: 'toggle',
      value: true
    }
  ];

  // 滑动条相关状态
  private sliderBeingDragged: string | null = null;
  private scrollOffset: number = 0; // 商店滚动偏移

  // 事件回调
  public onStart: ( () => void ) | null = null;
  public onRestart: ( () => void ) | null = null;
  public onHelp: ( () => void ) | null = null;
  public onStore: ( () => void ) | null = null;
  public onSettings: ( () => void ) | null = null;
  public onBackToMenu: ( () => void ) | null = null;
  public onSettingChange: ( ( id: string, value: any ) => void ) | null = null;
  public onMarblePurchase: ( ( marbleId: string ) => void ) | null = null;
  public onMarbleSelect: ( ( marbleId: string ) => void ) | null = null;

  // 风格常量
  private readonly colors = {
    primary: '#B22222',
    secondary: '#FAEBD7',
    accent: '#8B4513',
    text: '#2c2c2c',
    highlight: 'rgba(178, 34, 34, 0.1)',
    disabled: '#CCCCCC',
    gold: '#FFD700',
    silver: '#C0C0C0'
  };

  constructor ( ctx: CanvasRenderingContext2D, canvas: WechatMinigame.Canvas )
  {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.showMainMenu();
  }

  // 获取设置值
  public getSetting ( id: string ): any
  {
    const setting = this.settings.find( s => s.id === id );
    return setting ? setting.value : null;
  }

  // 更新设置值
  public updateSetting ( id: string, value: any ): void
  {
    const setting = this.settings.find( s => s.id === id );
    if ( setting )
    {
      setting.value = value;
      if ( this.onSettingChange )
      {
        this.onSettingChange( id, value );
      }
    }
  }

  // 解锁弹珠
  public unlockMarble ( marbleId: string ): void
  {
    const marble = this.marbleStore.find( m => m.id === marbleId );
    if ( marble )
    {
      marble.unlocked = true;
    }
  }

  // 设置当前使用的弹珠
  public setCurrentMarble ( marbleId: string ): void
  {
    // 标记为已使用
    if ( this.onMarbleSelect )
    {
      this.onMarbleSelect( marbleId );
    }
  }

  // 获取已解锁的弹珠
  public getUnlockedMarbles (): MarbleType[]
  {
    return this.marbleStore.filter( m => m.unlocked );
  }

  // 主渲染循环调用
  public render ( state: MenuState, playerScore: number = 1000 ): void
  {
    if ( state === 'NONE' ) return;

    this.ctx.save();

    // 绘制背景
    if ( state === 'MAIN' || state === 'HELP' || state === 'SETTINGS' || state === 'STORE' )
    {
      this.ctx.fillStyle = this.colors.secondary;
      this.ctx.fillRect( 0, 0, this.width, this.height );
      this.drawOrnamentalBorder();
    } else if ( state === 'GAME_OVER' )
    {
      this.ctx.fillStyle = 'rgba(250, 235, 215, 0.92)';
      this.ctx.fillRect( this.width * 0.1, this.height * 0.2, this.width * 0.8, this.height * 0.6 );
      this.ctx.strokeStyle = this.colors.primary;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect( this.width * 0.1, this.height * 0.2, this.width * 0.8, this.height * 0.6 );
    }

    // 绘制标题和文本
    if ( state === 'MAIN' )
    {
      this.drawTitle( "谁是珠王", 0.3 );
      this.drawSubtitle( "校园弹珠战术游戏", 0.38 );
      // 显示当前积分
      this.drawScore( playerScore );
    } else if ( state === 'HELP' )
    {
      this.drawTitle( "游戏说明", 0.25 );
      this.drawHelpText();
    } else if ( state === 'SETTINGS' )
    {
      this.drawTitle( "游戏设置", 0.15 );
      this.drawSettings();
    } else if ( state === 'STORE' )
    {
      this.drawTitle( "积分商店", 0.15 );
      this.drawStore( playerScore );
    } else if ( state === 'GAME_OVER' && this.gameOverInfo )
    {
      const titleY = 0.35;
      this.drawTitle( this.gameOverInfo.win ? "胜利！" : "失败！", titleY );
      this.drawSubtitle( this.gameOverInfo.message, titleY + 0.08 );
      // 显示获得的积分
      if ( this.gameOverInfo.win && playerScore > 0 )
      {
        this.drawSubtitle( `获得积分: +${ playerScore }`, titleY + 0.15 );
      }
    }

    // 绘制所有按钮
    this.buttons.forEach( btn => this.drawButton( btn ) );

    this.ctx.restore();
  }

  // 处理输入事件
  public handleInput ( x: number, y: number, state: MenuState ): boolean
  {
    let handled = false;

    // 倒序检测，确保覆盖在上面的元素优先响应
    for ( let i = this.buttons.length - 1; i >= 0; i-- )
    {
      const btn = this.buttons[ i ];
      if ( x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h )
      {
        btn.onClick();
        handled = true;
        break;
      }
    }

    // 处理设置界面的特殊输入
    if ( !handled && state === 'SETTINGS' )
    {
      handled = this.handleSettingsInput( x, y );
    }

    // 处理商店界面的特殊输入
    if ( !handled && state === 'STORE' )
    {
      handled = this.handleStoreInput( x, y );
    }

    return handled;
  }

  // 处理设置界面输入
  private handleSettingsInput ( x: number, y: number ): boolean
  {
    const startY = this.height * 0.25;
    const rowHeight = 45;

    for ( let i = 0; i < this.settings.length; i++ )
    {
      const setting = this.settings[ i ];
      const rowY = startY + i * rowHeight;

      // 开关按钮
      if ( setting.type === 'toggle' )
      {
        const toggleX = this.width * 0.7;
        const toggleY = rowY;
        const toggleRadius = 10;

        if ( Math.sqrt( ( x - toggleX ) ** 2 + ( y - toggleY ) ** 2 ) < toggleRadius + 5 )
        {
          this.updateSetting( setting.id, !setting.value );
          return true;
        }
      }
      // 下拉选择
      else if ( setting.type === 'select' )
      {
        const selectX = this.width * 0.7;
        const selectY = rowY;
        const selectWidth = 100;
        const selectHeight = 25;

        if ( x >= selectX - selectWidth / 2 && x <= selectX + selectWidth / 2 &&
          y >= selectY - selectHeight / 2 && y <= selectY + selectHeight / 2 )
        {
          this.handleSelectInput( setting );
          return true;
        }
      }
    }

    return false;
  }

  // 处理选择器输入
  private handleSelectInput ( setting: SettingOption ): void
  {
    if ( !setting.options ) return;

    const currentIndex = setting.options.indexOf( setting.value );
    const nextIndex = ( currentIndex + 1 ) % setting.options.length;
    this.updateSetting( setting.id, setting.options[ nextIndex ] );
  }

  // 处理商店界面输入
  private handleStoreInput ( x: number, y: number ): boolean
  {
    const startY = this.height * 0.25 + this.scrollOffset;
    const itemHeight = 100;

    for ( let i = 0; i < this.marbleStore.length; i++ )
    {
      const marble = this.marbleStore[ i ];
      const itemY = startY + i * itemHeight;

      // 检查是否点击了弹珠项
      if ( y >= itemY && y <= itemY + itemHeight - 20 )
      {
        // 购买按钮区域
        const buyBtnX = this.width * 0.8;
        const buyBtnY = itemY + itemHeight / 2;
        const buyBtnWidth = 80;
        const buyBtnHeight = 30;

        if ( !marble.unlocked &&
          x >= buyBtnX - buyBtnWidth / 2 && x <= buyBtnX + buyBtnWidth / 2 &&
          y >= buyBtnY - buyBtnHeight / 2 && y <= buyBtnY + buyBtnHeight / 2 )
        {

          if ( this.onMarblePurchase )
          {
            this.onMarblePurchase( marble.id );
          }
          return true;
        }

        // 选择按钮区域（已解锁的弹珠）
        if ( marble.unlocked )
        {
          const selectBtnX = this.width * 0.8;
          const selectBtnY = itemY + itemHeight / 2;
          const selectBtnWidth = 80;
          const selectBtnHeight = 30;

          if ( x >= selectBtnX - selectBtnWidth / 2 && x <= selectBtnX + selectBtnWidth / 2 &&
            y >= selectBtnY - selectBtnHeight / 2 && y <= selectBtnY + selectBtnHeight / 2 )
          {

            this.setCurrentMarble( marble.id );
            return true;
          }
        }
      }
    }

    return false;
  }

  // 切换到主菜单
  public showMainMenu (): void
  {
    this.gameOverInfo = null;
    this.setupMainMenu();
  }

  // 切换到设置界面
  public showSettings (): void
  {
    this.setupSettingsMenu();
  }

  // 切换到商店界面
  public showStore (): void
  {
    this.setupStoreMenu();
  }

  // 切换到帮助界面
  public showHelpMenu (): void
  {
    this.gameOverInfo = null;
    this.setupHelpMenu();
  }

  // 切换到游戏结束界面
  public showGameOver ( win: boolean, message: string ): void
  {
    this.gameOverInfo = { win, message };
    this.setupGameOverMenu( win );
  }

  // --- 布局初始化方法 ---

  private setupMainMenu (): void
  {
    this.buttons = [];
    const btnW = 220;
    const btnH = 60;
    const centerX = ( this.width - btnW ) / 2;
    const startY = this.height * 0.5;
    const gap = 20;

    this.addButton( "start_game", "开始游戏", centerX, startY, btnW, btnH, () =>
    {
      if ( this.onStart ) this.onStart();
    } );

    this.addButton( "settings", "游戏设置", centerX, startY + btnH + gap, btnW, btnH, () =>
    {
      this.showSettings();
      if ( this.onSettings ) this.onSettings();

    } );

    this.addButton( "store", "积分商店", centerX, startY + ( btnH + gap ) * 2, btnW, btnH, () =>
    {
      this.showStore();
      if ( this.onStore ) this.onStore();
    } );

    this.addButton( "help", "游戏说明", centerX, startY + ( btnH + gap ) * 3, btnW, btnH, () =>
    {
      this.showHelpMenu();
      if ( this.onHelp ) this.onHelp();
    } );
  }

  private setupSettingsMenu (): void
  {
    this.buttons = [];
    const btnW = 140;
    const btnH = 50;

    // 底部返回按钮
    this.addButton( "back", "返回", ( this.width - btnW ) / 2, this.height - 80, btnW, btnH, () =>
    {
      this.showMainMenu();
      if ( this.onBackToMenu ) this.onBackToMenu();
    } );
  }

  private setupStoreMenu (): void
  {
    this.buttons = [];
    const btnW = 140;
    const btnH = 50;

    // 底部返回按钮
    this.addButton( "back", "返回", ( this.width - btnW ) / 2, this.height - 80, btnW, btnH, () =>
    {
      this.showMainMenu();
      if ( this.onBackToMenu ) this.onBackToMenu();
    } );
  }

  private setupHelpMenu (): void
  {
    this.buttons = [];
    const btnW = 140;
    const btnH = 50;

    // 底部返回按钮
    this.addButton( "back", "返回", ( this.width - btnW ) / 2, this.height - 80, btnW, btnH, () =>
    {
      this.showMainMenu();
      if ( this.onBackToMenu ) this.onBackToMenu();
    } );
  }

  private setupGameOverMenu ( win: boolean ): void
  {
    this.buttons = [];
    const btnW = 200;
    const btnH = 55;
    const centerX = ( this.width - btnW ) / 2;
    const startY = this.height * 0.55;
    const gap = 20;

    const actionText = win ? "下一关" : "再试一次";

    this.addButton( "restart", actionText, centerX, startY, btnW, btnH, () =>
    {
      if ( this.onRestart ) this.onRestart();
    } );

    this.addButton( "home", "主菜单", centerX, startY + btnH + gap, btnW, btnH, () =>
    {
      this.showMainMenu();
      if ( this.onBackToMenu ) this.onBackToMenu();
    } );

    // 添加商店按钮（胜利时显示）
    if ( win )
    {
      this.addButton( "store", "去商店", centerX, startY + ( btnH + gap ) * 2, btnW, btnH, () =>
      {
        this.showStore();
      } );
    }
  }

  private addButton ( id: string, text: string, x: number, y: number, w: number, h: number, onClick: () => void ): void
  {
    this.buttons.push( { id, text, x, y, w, h, onClick } );
  }

  // --- 绘图辅助方法 ---

  private drawScore ( score: number ): void
  {
    this.ctx.font = "bold 18px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.gold;
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "top";
    this.ctx.fillText( `积分: ${ score }`, this.width - 20, 20 );
  }

  private drawTitle ( text: string, yRatio: number ): void
  {
    this.ctx.font = "bold 36px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText( text, this.width / 2, this.height * yRatio );

    // 装饰性下划线
    const lineY = this.height * yRatio + 30;
    this.ctx.beginPath();
    this.ctx.moveTo( this.width / 2 - 80, lineY );
    this.ctx.lineTo( this.width / 2 + 80, lineY );
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawSubtitle ( text: string, yRatio: number ): void
  {
    this.ctx.font = "italic 18px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = "center";
    this.ctx.fillText( text, this.width / 2, this.height * yRatio );
  }

  private drawHelpText (): void
  {
    const lines = [
      "游戏目标:",
      "将你的弹珠发射到敌人弹珠附近。",
      "捕获范围：在一扎距离内。",
      "",
      "操作方法:",
      "向后拖拽以瞄准和蓄力。",
      "松开手指进行发射。",
      "",
      "游戏规则:",
      "回合制游戏。",
      "不要掉出边界！",
      "",
      "积分系统:",
      "胜利获得积分。",
      "积分可解锁新弹珠。"
    ];

    this.ctx.font = "16px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = "center";
    let y = this.height * 0.35;
    const lineHeight = 24;

    lines.forEach( line =>
    {
      if ( line.endsWith( ':' ) )
      {
        this.ctx.font = "bold 17px 'Arial', 'Microsoft YaHei', sans-serif";
        this.ctx.fillStyle = this.colors.accent;
      } else
      {
        this.ctx.font = "16px 'Arial', 'Microsoft YaHei', sans-serif";
        this.ctx.fillStyle = this.colors.text;
      }
      this.ctx.fillText( line, this.width / 2, y );
      y += lineHeight;
    } );
  }

  private drawSettings (): void
  {
    const startY = this.height * 0.25;
    const rowHeight = 45;

    this.ctx.font = "18px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = "left";

    for ( let i = 0; i < this.settings.length; i++ )
    {
      const setting = this.settings[ i ];
      const y = startY + i * rowHeight;

      // 设置名称
      this.ctx.fillText( setting.name, this.width * 0.2, y );

      // 根据类型绘制控件
      if ( setting.type === 'toggle' )
      {
        this.drawToggle( setting.id, setting.value, this.width * 0.7, y );
      } else if ( setting.type === 'select' )
      {
        this.drawSelect( setting.value, this.width * 0.7, y );
      }
    }
  }

  private drawToggle ( id: string, value: boolean, x: number, y: number ): void
  {
    const radius = 10;

    // 背景
    this.ctx.fillStyle = value ? this.colors.primary : this.colors.disabled;
    this.ctx.beginPath();
    this.ctx.arc( x, y, radius, 0, Math.PI * 2 );
    this.ctx.fill();

    // 边框
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc( x, y, radius, 0, Math.PI * 2 );
    this.ctx.stroke();

    // 开关状态指示器
    this.ctx.fillStyle = this.colors.secondary;
    if ( value )
    {
      this.ctx.beginPath();
      this.ctx.arc( x + radius * 0.6, y, radius * 0.6, 0, Math.PI * 2 );
      this.ctx.fill();
    } else
    {
      this.ctx.beginPath();
      this.ctx.arc( x - radius * 0.6, y, radius * 0.6, 0, Math.PI * 2 );
      this.ctx.fill();
    }
  }

  private drawSelect ( value: string, x: number, y: number ): void
  {
    const width = 100;
    const height = 25;

    // 背景
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.fillRect( x - width / 2, y - height / 2, width, height );

    // 边框
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect( x - width / 2, y - height / 2, width, height );

    // 文本
    this.ctx.font = "16px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText( value, x, y );

    // 下拉箭头
    this.ctx.beginPath();
    this.ctx.moveTo( x + width / 2 - 10, y - 3 );
    this.ctx.lineTo( x + width / 2 - 10, y + 3 );
    this.ctx.lineTo( x + width / 2 - 5, y );
    this.ctx.closePath();
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fill();
  }

  private drawStore ( playerScore: number ): void
  {
    // 显示当前积分
    this.ctx.font = "bold 20px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.gold;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";
    this.ctx.fillText( `当前积分: ${ playerScore }`, this.width / 2, this.height * 0.2 );

    // 绘制弹珠列表
    const startY = this.height * 0.25 + this.scrollOffset;
    const itemHeight = 100;

    for ( let i = 0; i < this.marbleStore.length; i++ )
    {
      const marble = this.marbleStore[ i ];
      const y = startY + i * itemHeight;

      // 背景
      this.ctx.fillStyle = marble.unlocked ? this.colors.secondary : 'rgba(250, 235, 215, 0.5)';
      this.ctx.fillRect( this.width * 0.1, y, this.width * 0.8, itemHeight - 20 );

      // 边框
      this.ctx.strokeStyle = marble.unlocked ? this.colors.primary : this.colors.disabled;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect( this.width * 0.1, y, this.width * 0.8, itemHeight - 20 );

      // 弹珠预览
      this.drawMarblePreview( marble, this.width * 0.2, y + itemHeight / 2 - 20 );

      // 文本信息
      this.ctx.font = "bold 18px 'Arial', 'Microsoft YaHei', sans-serif";
      this.ctx.fillStyle = marble.unlocked ? this.colors.text : this.colors.disabled;
      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText( marble.name, this.width * 0.3, y + itemHeight / 2 - 20 );

      this.ctx.font = "14px 'Arial', 'Microsoft YaHei', sans-serif";
      this.ctx.fillText( marble.description, this.width * 0.3, y + itemHeight / 2 + 5 );

      // 价格或状态
      if ( marble.unlocked )
      {
        this.ctx.font = "bold 16px 'Arial', 'Microsoft YaHei', sans-serif";
        this.ctx.fillStyle = this.colors.accent;
        this.ctx.textAlign = "center";
        this.ctx.fillText( "已解锁", this.width * 0.8, y + itemHeight / 2 );

        // 选择按钮
        this.drawStoreButton( "使用", this.width * 0.8, y + itemHeight / 2 );
      } else
      {
        this.ctx.font = "bold 16px 'Arial', 'Microsoft YaHei', sans-serif";
        this.ctx.fillStyle = playerScore >= marble.cost ? this.colors.gold : this.colors.disabled;
        this.ctx.textAlign = "center";
        this.ctx.fillText( `${ marble.cost } 积分`, this.width * 0.8, y + itemHeight / 2 - 10 );

        // 购买按钮
        const canAfford = playerScore >= marble.cost;
        this.drawStoreButton( canAfford ? "购买" : "积分不足", this.width * 0.8, y + itemHeight / 2 + 15, canAfford );
      }
    }
  }

  private drawMarblePreview ( marble: MarbleType, x: number, y: number ): void
  {
    const radius = 20;

    // 弹珠主体
    this.ctx.fillStyle = marble.color;
    this.ctx.beginPath();
    this.ctx.arc( x, y, radius, 0, Math.PI * 2 );
    this.ctx.fill();

    // 高光效果
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc( x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2 );
    this.ctx.fill();

    // 装饰条纹
    this.ctx.strokeStyle = marble.accent;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc( x, y, radius * 0.7, 0, Math.PI );
    this.ctx.stroke();
  }

  private drawStoreButton ( text: string, x: number, y: number, enabled: boolean = true ): void
  {
    const width = 80;
    const height = 30;

    // 背景
    this.ctx.fillStyle = enabled ? this.colors.primary : this.colors.disabled;
    this.ctx.fillRect( x - width / 2, y - height / 2, width, height );

    // 边框
    this.ctx.strokeStyle = enabled ? this.colors.accent : this.colors.disabled;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect( x - width / 2, y - height / 2, width, height );

    // 文字
    this.ctx.font = "bold 14px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText( text, x, y );
  }

  private drawButton ( btn: Button ): void
  {
    // 阴影
    this.ctx.fillStyle = "rgba(0,0,0,0.1)";
    this.ctx.fillRect( btn.x + 4, btn.y + 4, btn.w, btn.h );

    // 背景
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.fillRect( btn.x, btn.y, btn.w, btn.h );

    // 双线边框风格
    this.ctx.strokeStyle = this.colors.primary;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect( btn.x, btn.y, btn.w, btn.h );

    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect( btn.x + 4, btn.y + 4, btn.w - 8, btn.h - 8 );

    // 文字
    this.ctx.font = "bold 18px 'Arial', 'Microsoft YaHei', sans-serif";
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText( btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2 );

    // 按钮两侧装饰点
    this.ctx.beginPath();
    this.ctx.arc( btn.x + 12, btn.y + btn.h / 2, 2, 0, Math.PI * 2 );
    this.ctx.arc( btn.x + btn.w - 12, btn.y + btn.h / 2, 2, 0, Math.PI * 2 );
    this.ctx.fillStyle = this.colors.accent;
    this.ctx.fill();
  }

  private drawOrnamentalBorder (): void
  {
    const p = 15; // padding
    const w = this.width;
    const h = this.height;
    const cornerSize = 30;

    this.ctx.strokeStyle = this.colors.primary;
    this.ctx.lineWidth = 3;

    // 绘制外框 (留出角落)
    this.ctx.beginPath();
    // Top
    this.ctx.moveTo( p + cornerSize, p );
    this.ctx.lineTo( w - p - cornerSize, p );
    // Bottom
    this.ctx.moveTo( p + cornerSize, h - p );
    this.ctx.lineTo( w - p - cornerSize, h - p );
    // Left
    this.ctx.moveTo( p, p + cornerSize );
    this.ctx.lineTo( p, h - p - cornerSize );
    // Right
    this.ctx.moveTo( w - p, p + cornerSize );
    this.ctx.lineTo( w - p, h - p - cornerSize );
    this.ctx.stroke();

    // 绘制四角花纹
    this.drawCornerTL( p, p );
    this.drawCornerTR( w - p, p );
    this.drawCornerBL( p, h - p );
    this.drawCornerBR( w - p, h - p );
  }

  // 左上角
  private drawCornerTL ( x: number, y: number ): void
  {
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo( x, y + 25 );
    this.ctx.lineTo( x, y );
    this.ctx.lineTo( x + 25, y );
    this.ctx.stroke();

    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fillRect( x + 4, y + 4, 8, 8 );
  }

  // 右上角
  private drawCornerTR ( x: number, y: number ): void
  {
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo( x, y + 25 );
    this.ctx.lineTo( x, y );
    this.ctx.lineTo( x - 25, y );
    this.ctx.stroke();

    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fillRect( x - 12, y + 4, 8, 8 );
  }

  // 左下角
  private drawCornerBL ( x: number, y: number ): void
  {
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo( x, y - 25 );
    this.ctx.lineTo( x, y );
    this.ctx.lineTo( x + 25, y );
    this.ctx.stroke();

    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fillRect( x + 4, y - 12, 8, 8 );
  }

  // 右下角
  private drawCornerBR ( x: number, y: number ): void
  {
    this.ctx.strokeStyle = this.colors.accent;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo( x, y - 25 );
    this.ctx.lineTo( x, y );
    this.ctx.lineTo( x - 25, y );
    this.ctx.stroke();

    this.ctx.fillStyle = this.colors.primary;
    this.ctx.fillRect( x - 12, y - 12, 8, 8 );
  }
}