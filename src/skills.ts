// retro-marble-game-040926/frontend/public/src/skills.ts
/**
 * 技能系统模块
 * 管理弹珠技能的释放、效果和冷却
 */

declare const require: any;

import DataBus from './databus';

// 获取 DataBus 实例
const databus = DataBus;

interface PassiveSkillEffect {
  passThroughObstacleCount?: number;
  bonusBounceCount?: number;
  bonusBounceRestitution?: number;
}

interface SkillDefinitionConfig {
  name?: string;
  description?: string;
  comment?: string;
  effects?: PassiveSkillEffect;
}

interface MarbleSkillLoadoutConfig {
  marbleName?: string;
  comment?: string;
  skillIds?: string[];
}

const marbleSkillConfig = require('./marbleSkills.json') as {
  comment?: string;
  defaultMarbleSkillIds?: string[];
  skills?: { [key: string]: SkillDefinitionConfig };
  marbleSkills?: { [key: string]: MarbleSkillLoadoutConfig };
};

export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number; // 冷却时间（秒）
  duration: number; // 持续时间（秒）
  manaCost: number; // 法力消耗
  icon?: string; // 图标路径
  comment?: string;
  effects?: PassiveSkillEffect;

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
  private matchSkillIds: string[] = [];

  constructor() {
    this.initializeSkills();
  }

  /**
   * 初始化技能列表
   */
  private initializeSkills(): void {
    const configuredSkills = marbleSkillConfig.skills || {};

    Object.keys(configuredSkills).forEach(skillId => {
      const config = configuredSkills[skillId];
      this.registerSkill({
        id: skillId,
        name: config.name || skillId,
        description: config.description || '',
        comment: config.comment || '',
        effects: config.effects || {},
        cooldown: 0,
        duration: 0,
        manaCost: 0
      });
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
   * 配置技能快照
   */
  public configureSkillsForMatch(marbleId: string): void {
    const marbleSkills = marbleSkillConfig.marbleSkills || {};
    const defaultSkills = marbleSkillConfig.defaultMarbleSkillIds || [];
    const configuredSkillIds = marbleSkills[marbleId] && marbleSkills[marbleId].skillIds
      ? marbleSkills[marbleId].skillIds || []
      : defaultSkills;
    
    this.clearAllSkills();
    this.matchSkillIds = configuredSkillIds.filter((skillId, index, skillIds) => {
      return !!this.skills.get(skillId) && skillIds.indexOf(skillId) === index;
    });
  }

  public applyMatchSkillsToBall(user: any): void {
    user.matchSkills = this.getMatchSkillIds();
    user.skillNotes = [];
    user.passThroughObstacleCount = 0;
    user.bonusBounceCount = 0;
    user.bonusBounceRestitution = 1;

    this.getMatchSkills().forEach(skill => {
      const effects = skill.effects || {};

      user.passThroughObstacleCount += effects.passThroughObstacleCount || 0;
      user.bonusBounceCount += effects.bonusBounceCount || 0;

      if ((effects.bonusBounceRestitution || 0) > (user.bonusBounceRestitution || 1)) {
        user.bonusBounceRestitution = effects.bonusBounceRestitution;
      }

      if (skill.comment) {
        user.skillNotes.push(skill.comment);
      } else {
        user.skillNotes.push(skill.name);
      }
    });
  }
  
  /**
   * 获取技能快照
   */
  public getMatchSkillIds(): string[] {
    return this.matchSkillIds.slice();
  }
  
  /**
   * 获取技能快照
   */
  public getMatchSkills(): Skill[] {
    return this.matchSkillIds
      .map(skillId => this.skills.get(skillId))
      .filter((skill): skill is Skill => !!skill);
  }
  
  /**
   * 检查技能是否可用
   */
  public canUseSkill(skillId: string): boolean {
    return this.matchSkillIds.indexOf(skillId) !== -1;
  }
  
  /**
   * 激活技能
   */
  public activateSkill(skillId: string, user: any, target?: any, game?: any): boolean {
    console.log(`技能 ${skillId} 为赛前被动配置，不支持对局中主动释放`);
    return false;
  }
  
  /**
   * 更新技能状态
   */
  public update(deltaTime: number): void {
    return;
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
    this.activeSkills = [];
    this.cooldowns.clear();
  }
  
  /**
   * 渲染技能效果
   */
  public render(ctx: CanvasRenderingContext2D): void {
    return;
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
