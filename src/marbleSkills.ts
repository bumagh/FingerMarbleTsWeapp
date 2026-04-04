// src/marbleSkills.ts
// 弹珠技能配置 - 转换为 TypeScript 模块以避免微信小游戏 JSON 导入问题

export default {
  comment: "弹珠赛前技能配置。每个技能都应贴合弹珠玩法，主要影响碰撞、穿障、反弹等规则；对局开始时读取一次，不在对局中实时变更。",
  defaultMarbleSkillIds: [
    "wall_pass_once"
  ],
  skills: {
    wall_pass_once: {
      name: "借道穿障",
      description: "本局可穿过障碍物1次，适合在复杂地形中寻找直线突破机会。",
      comment: "可穿墙1次",
      effects: {
        passThroughObstacleCount: 1,
        bonusBounceCount: 0,
        bonusBounceRestitution: 1.0
      }
    },
    double_ricochet: {
      name: "双段反弹",
      description: "本局前2次碰撞墙壁时获得额外反弹机会，反弹系数提升至1.2。",
      comment: "强化反弹2次",
      effects: {
        passThroughObstacleCount: 0,
        bonusBounceCount: 2,
        bonusBounceRestitution: 1.2
      }
    },
    wall_pass_and_bounce: {
      name: "穿墙反弹",
      description: "本局可穿过障碍物1次，且首次墙壁反弹系数提升至1.3。",
      comment: "穿墙+强化反弹",
      effects: {
        passThroughObstacleCount: 1,
        bonusBounceCount: 1,
        bonusBounceRestitution: 1.3
      }
    },
    triple_ricochet: {
      name: "三段反弹",
      description: "本局前3次碰撞墙壁时获得额外反弹机会，反弹系数提升至1.15。",
      comment: "强化反弹3次",
      effects: {
        passThroughObstacleCount: 0,
        bonusBounceCount: 3,
        bonusBounceRestitution: 1.15
      }
    },
    explosive_penetration: {
      name: "爆破穿障",
      description: "本局可穿过障碍物1次，穿障时对周围产生小范围推动效果。",
      comment: "爆破穿墙1次",
      effects: {
        passThroughObstacleCount: 1,
        bonusBounceCount: 0,
        bonusBounceRestitution: 1.0
      }
    },
    gravity_boost: {
      name: "重力加速",
      description: "本局发射力度提升20%，适合远距离精准打击。",
      comment: "发射力度+20%",
      effects: {
        passThroughObstacleCount: 0,
        bonusBounceCount: 0,
        bonusBounceRestitution: 1.0
      }
    }
  },
  marbleSkills: {
    basic_red: {
      marbleName: "赤焰珠",
      comment: "基础突破型弹珠，强调直线过障。",
      skillIds: [
        "wall_pass_once"
      ]
    },
    ocean_blue: {
      marbleName: "深海珠",
      comment: "偏运营路线，适合借边回弹。",
      skillIds: [
        "double_ricochet"
      ]
    },
    emerald_green: {
      marbleName: "翡翠珠",
      comment: "强调复杂地形中的折返路线。",
      skillIds: [
        "wall_pass_and_bounce"
      ]
    },
    golden_sun: {
      marbleName: "金阳珠",
      comment: "擅长边界多段回弹，适合秀操作。",
      skillIds: [
        "triple_ricochet"
      ]
    },
    purple_magic: {
      marbleName: "紫幻珠",
      comment: "更偏向灵活绕障打法。",
      skillIds: [
        "wall_pass_and_bounce"
      ]
    },
    crystal_clear: {
      marbleName: "水晶珠",
      comment: "综合型弹珠，兼顾穿透与稳定回弹。",
      skillIds: [
        "explosive_penetration"
      ]
    },
    obsidian_black: {
      marbleName: "黑曜珠",
      comment: "高爆发型弹珠，强调一击制胜。",
      skillIds: [
        "gravity_boost"
      ]
    }
  }
};
