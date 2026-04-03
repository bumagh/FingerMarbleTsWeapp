// retro-marble-game-040926/frontend/public/src/skills.ts

/**
 * 技能系统模块
 * 管理弹珠技能的释放、效果和冷却
 */

import DataBus from './databus';

// 获取 DataBus 实例
const databus = DataBus;

export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number; // 冷却时间（秒）
  duration: number; // 持续时间（秒）
  manaCost: number; // 法力消耗
  icon?: string; // 图标路径
  
  // 技能效果
  onActivate?: (user: any, target: any, game: any) => void;
  onUpdate?: (user: any, deltaTime: number) => void;
  onEnd?: (user: any) => void;
}

export interface ActiveSkill {
  skill: Skill;
  startTime: number;
  endTime: number;
  user: any;
  target?: any;
}

export class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private activeSkills: ActiveSkill[] = [];
  private cooldowns: Map<string, number> = new Map();
  
  constructor() {
    this.initializeSkills();
  }
  
  /**
   * 初始化技能列表
   */
  private initializeSkills(): void {
    // 冲击波技能
    this.registerSkill({
      id: 'shockwave',
      name: '冲击波',
      description: '释放冲击波推开周围敌人',
      cooldown: 10,
      duration: 0.5,
      manaCost: 20,
      onActivate: (user: any, target: any, game: any) => {
        const physics = game.getPhysicsEngine();
        const allBalls = databus.balls; // 直接访问databus
        
        allBalls.forEach(ball => {
          if (ball.id !== user.id) {
            const dx = ball.x - user.x;
            const dy = ball.y - user.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) { // 150像素范围内
              const force = (150 - distance) / 150 * 500;
              const angle = Math.atan2(dy, dx);
              
              ball.vx = Math.cos(angle) * force;
              ball.vy = Math.sin(angle) * force;
            }
          }
        });
        
        console.log(`${user.id} 释放冲击波技能`);
      }
    });
    
    // 护盾技能
    this.registerSkill({
      id: 'shield',
      name: '护盾',
      description: '生成临时护盾，免疫一次攻击',
      cooldown: 15,
      duration: 5,
      manaCost: 15,
      onActivate: (user: any, target: any, game: any) => {
        user.hasShield = true;
        user.shieldHealth = 1;
        console.log(`${user.id} 激活护盾`);
      },
      onEnd: (user: any) => {
        user.hasShield = false;
        user.shieldHealth = 0;
        console.log(`${user.id} 护盾消失`);
      }
    });
    
    // 传送技能
    this.registerSkill({
      id: 'teleport',
      name: '传送',
      description: '瞬间传送到指定位置',
      cooldown: 8,
      duration: 0.1,
      manaCost: 25,
      onActivate: (user: any, target: any, game: any) => {
        if (target) {
          user.x = target.x;
          user.y = target.y;
          user.vx = 0;
          user.vy = 0;
          console.log(`${user.id} 传送到 (${target.x}, ${target.y})`);
        }
      }
    });
    
    // 冰冻技能
    this.registerSkill({
      id: 'freeze',
      name: '冰冻',
      description: '冰冻所有敌人，使其无法移动',
      cooldown: 12,
      duration: 3,
      manaCost: 30,
      onActivate: (user: any, target: any, game: any) => {
        const allBalls = databus.balls; // 直接访问databus
        
        allBalls.forEach(ball => {
          if (ball.id !== user.id) {
            ball.isFrozen = true;
            ball.frozenEndTime = Date.now() + 3000; // 3秒
            ball.vx = 0;
            ball.vy = 0;
          }
        });
        
        console.log(`${user.id} 释放冰冻技能`);
      },
      onEnd: (user: any) => {
        const allBalls = databus.balls; // 直接访问databus
        if (allBalls) {
          allBalls.forEach(ball => {
            if (ball.id !== user.id) {
              ball.isFrozen = false;
              ball.frozenEndTime = 0;
            }
          });
        }
      }
    });
    
    // 加速技能
    this.registerSkill({
      id: 'speed_boost',
      name: '加速',
      description: '提升移动速度和发射力量',
      cooldown: 6,
      duration: 4,
      manaCost: 10,
      onActivate: (user: any, target: any, game: any) => {
        user.speedMultiplier = 1.5;
        user.forceMultiplier = 1.3;
        console.log(`${user.id} 激活加速状态`);
      },
      onEnd: (user: any) => {
        user.speedMultiplier = 1;
        user.forceMultiplier = 1;
        console.log(`${user.id} 加速状态结束`);
      }
    });
  }
  
  /**
   * 注册技能
   */
  public registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }
  
  /**
   * 获取技能
   */
  public getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }
  
  /**
   * 获取所有技能
   */
  public getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * 激活技能
   */
  public activateSkill(skillId: string, user: any, target?: any, game?: any): boolean {
    const skill = this.getSkill(skillId);
    if (!skill) return false;
    
    // 检查冷却时间
    if (this.isCooldown(skillId)) {
      console.log(`技能 ${skill.name} 还在冷却中`);
      return false;
    }
    
    // 检查法力值
    if (user.mana < skill.manaCost) {
      console.log(`法力值不足，需要 ${skill.manaCost}，当前 ${user.mana}`);
      return false;
    }
    
    // 消耗法力
    user.mana -= skill.manaCost;
    
    // 设置冷却
    this.setCooldown(skillId, skill.cooldown);
    
    // 激活技能效果
    if (skill.onActivate) {
      skill.onActivate(user, target, game);
    }
    
    // 添加到活动技能列表
    const activeSkill: ActiveSkill = {
      skill,
      startTime: Date.now(),
      endTime: Date.now() + skill.duration * 1000,
      user,
      target
    };
    
    this.activeSkills.push(activeSkill);
    
    console.log(`技能 ${skill.name} 已激活`);
    return true;
  }
  
  /**
   * 更新技能状态
   */
  public update(deltaTime: number): void {
    const currentTime = Date.now();
    
    // 更新活动技能
    this.activeSkills = this.activeSkills.filter(activeSkill => {
      if (currentTime >= activeSkill.endTime) {
        // 技能结束
        if (activeSkill.skill.onEnd) {
          activeSkill.skill.onEnd(activeSkill.user);
        }
        return false;
      }
      
      // 更新技能效果
      if (activeSkill.skill.onUpdate) {
        activeSkill.skill.onUpdate(activeSkill.user, deltaTime);
      }
      
      return true;
    });
    
    // 更新冷却时间
    this.cooldowns.forEach((endTime, skillId) => {
      if (currentTime >= endTime) {
        this.cooldowns.delete(skillId);
      }
    });
  }
  
  /**
   * 检查技能是否在冷却中
   */
  public isCooldown(skillId: string): boolean {
    const endTime = this.cooldowns.get(skillId);
    if (!endTime) return false;
    
    return Date.now() < endTime;
  }
  
  /**
   * 设置技能冷却
   */
  public setCooldown(skillId: string, cooldownSeconds: number): void {
    this.cooldowns.set(skillId, Date.now() + cooldownSeconds * 1000);
  }
  
  /**
   * 获取技能剩余冷却时间
   */
  public getCooldownRemaining(skillId: string): number {
    const endTime = this.cooldowns.get(skillId);
    if (!endTime) return 0;
    
    const remaining = endTime - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }
  
  /**
   * 获取用户的活动技能
   */
  public getActiveSkills(user: any): ActiveSkill[] {
    return this.activeSkills.filter(activeSkill => activeSkill.user === user);
  }
  
  /**
   * 清除所有技能效果
   */
  public clearAllSkills(): void {
    // 结束所有活动技能
    this.activeSkills.forEach(activeSkill => {
      if (activeSkill.skill.onEnd) {
        activeSkill.skill.onEnd(activeSkill.user);
      }
    });
    
    this.activeSkills = [];
    this.cooldowns.clear();
  }
  
  /**
   * 渲染技能效果
   */
  public render(ctx: CanvasRenderingContext2D): void {
    const currentTime = Date.now();
    
    this.activeSkills.forEach(activeSkill => {
      const progress = (currentTime - activeSkill.startTime) / (activeSkill.endTime - activeSkill.startTime);
      
      switch (activeSkill.skill.id) {
        case 'shield':
          this.renderShield(ctx, activeSkill.user, progress);
          break;
        case 'freeze':
          this.renderFreeze(ctx, activeSkill.user, progress);
          break;
        case 'speed_boost':
          this.renderSpeedBoost(ctx, activeSkill.user, progress);
          break;
      }
    });
  }
  
  /**
   * 渲染护盾效果
   */
  private renderShield(ctx: CanvasRenderingContext2D, user: any, progress: number): void {
    ctx.save();
    ctx.strokeStyle = `rgba(100, 200, 255, ${1 - progress * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(user.x, user.y, user.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    
    // 护盾光晕
    ctx.fillStyle = `rgba(100, 200, 255, ${(1 - progress * 0.5) * 0.2})`;
    ctx.fill();
    ctx.restore();
  }
  
  /**
   * 渲染冰冻效果
   */
  private renderFreeze(ctx: CanvasRenderingContext2D, user: any, progress: number): void {
    // 这里可以渲染冰冻特效，比如冰晶粒子等
    ctx.save();
    ctx.fillStyle = `rgba(150, 200, 255, ${(1 - progress) * 0.3})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
  
  /**
   * 渲染加速效果
   */
  private renderSpeedBoost(ctx: CanvasRenderingContext2D, user: any, progress: number): void {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 200, 100, ${1 - progress * 0.5})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(user.x, user.y, user.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
