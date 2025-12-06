// retro-marble-game-040926/frontend/public/src/physics.ts

/**
 * Physics Engine Module
 * Handles movement, collision detection, and physical response
 * 遵循极简高性能原则，实现基础的2D物理模拟
 */

export interface Vector {
  x: number;
  y: number;
}

export interface PhysicsBody {
  id: string;
  type: 'circle' | 'rectangle';
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius?: number; // For circle
  width?: number;  // For rectangle
  height?: number; // For rectangle
  isStatic: boolean;
  restitution: number; // 弹性系数 0-1
  friction: number;    // 摩擦系数 0-1
  onCollide?: (other: PhysicsBody, force: number) => void; // 碰撞回调
}

export class PhysicsEngine {
  private bounds: { width: number; height: number };

  constructor(width: number, height: number) {
    this.bounds = { width, height };
  }

  // 主更新循环
  public update(bodies: PhysicsBody[], dt: number): void {
    bodies.forEach(body => this.updateBody(body, dt));
    
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        this.resolveCollision(bodies[i], bodies[j]);
      }
    }
  }

  // 更新单个物体
  private updateBody(body: PhysicsBody, dt: number): void {
    if (body.isStatic) return;

    body.x += body.vx * dt;
    body.y += body.vy * dt;

    const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
    if (speed > 0.5) {
      const frictionScalar = Math.pow(1 - body.friction, dt * 60);
      body.vx *= frictionScalar;
      body.vy *= frictionScalar;
    } else {
      body.vx = 0;
      body.vy = 0;
    }

    this.checkWorldBounds(body);
  }

  // 检测两点距离是否在阈值内（核心玩法：“一扎”距离）
  public checkDistance(b1: PhysicsBody, b2: PhysicsBody, threshold: number): boolean {
    const dx = b1.x - b2.x;
    const dy = b1.y - b2.y;
    return (dx * dx + dy * dy) <= (threshold * threshold);
  }

  // 边界处理
  private checkWorldBounds(body: PhysicsBody): void {
    const r = body.radius || 0;
    if (body.x - r < 0) { body.x = r; this.reflect(body, 'x'); }
    else if (body.x + r > this.bounds.width) { body.x = this.bounds.width - r; this.reflect(body, 'x'); }
    
    if (body.y - r < 0) { body.y = r; this.reflect(body, 'y'); }
    else if (body.y + r > this.bounds.height) { body.y = this.bounds.height - r; this.reflect(body, 'y'); }
  }

  private reflect(body: PhysicsBody, axis: 'x' | 'y'): void {
    if (axis === 'x') body.vx = -body.vx * body.restitution;
    else body.vy = -body.vy * body.restitution;
    // 触发边界碰撞事件（可选）
    if(body.onCollide) body.onCollide({ ...body, id: 'wall' } as PhysicsBody, Math.abs(axis === 'x' ? body.vx : body.vy));
  }

  // 解决碰撞分发
  private resolveCollision(b1: PhysicsBody, b2: PhysicsBody): void {
    if (b1.type === 'circle' && b2.type === 'circle') {
      this.resolveCircleCollision(b1, b2);
    } else if (b1.type === 'circle' && b2.type === 'rectangle') {
      this.resolveCircleRectCollision(b1, b2);
    } else if (b1.type === 'rectangle' && b2.type === 'circle') {
      this.resolveCircleRectCollision(b2, b1);
    }
  }

  // 圆形碰撞逻辑
  private resolveCircleCollision(b1: PhysicsBody, b2: PhysicsBody): void {
    const dx = b2.x - b1.x, dy = b2.y - b1.y;
    const distSq = dx * dx + dy * dy;
    const radSum = (b1.radius || 0) + (b2.radius || 0);

    if (distSq < radSum * radSum && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist, ny = dy / dist;
      
      this.resolveOverlap(b1, b2, nx, ny, radSum - dist);
      this.calculateImpulse(b1, b2, nx, ny);
    }
  }

  // 修正重叠
  private resolveOverlap(b1: PhysicsBody, b2: PhysicsBody, nx: number, ny: number, overlap: number): void {
    const factor = 0.5 * overlap;
    if (!b1.isStatic && !b2.isStatic) {
      b1.x -= nx * factor; b1.y -= ny * factor;
      b2.x += nx * factor; b2.y += ny * factor;
    } else if (!b1.isStatic) {
      b1.x -= nx * overlap; b1.y -= ny * overlap;
    } else if (!b2.isStatic) {
      b2.x += nx * overlap; b2.y += ny * overlap;
    }
  }

  // 计算物理冲量
  private calculateImpulse(b1: PhysicsBody, b2: PhysicsBody, nx: number, ny: number): void {
    const dvx = b2.vx - b1.vx, dvy = b2.vy - b1.vy;
    const velNormal = dvx * nx + dvy * ny;

    if (velNormal > 0) return; // 正在分离

    const e = Math.min(b1.restitution, b2.restitution);
    const invM1 = b1.isStatic ? 0 : 1 / b1.mass;
    const invM2 = b2.isStatic ? 0 : 1 / b2.mass;
    
    let j = -(1 + e) * velNormal / (invM1 + invM2);
    
    const ix = j * nx, iy = j * ny;
    if (!b1.isStatic) { b1.vx -= ix * invM1; b1.vy -= iy * invM1; }
    if (!b2.isStatic) { b2.vx += ix * invM2; b2.vy += iy * invM2; }

    const force = Math.abs(j);
    if (b1.onCollide) b1.onCollide(b2, force);
    if (b2.onCollide) b2.onCollide(b1, force);
  }

  // 圆矩碰撞
  private resolveCircleRectCollision(c: PhysicsBody, r: PhysicsBody): void {
    const closestX = Math.max(r.x, Math.min(c.x, r.x + (r.width || 0)));
    const closestY = Math.max(r.y, Math.min(c.y, r.y + (r.height || 0)));

    const dx = c.x - closestX, dy = c.y - closestY;
    const distSq = dx * dx + dy * dy;
    const rad = c.radius || 0;

    if (distSq < rad * rad && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist, ny = dy / dist;
      
      // 简化处理：仅反弹圆，假设矩形是静态障碍物
      if (!c.isStatic) {
        c.x += nx * (rad - dist);
        c.y += ny * (rad - dist);
        
        // 简单的反射逻辑
        const dot = c.vx * nx + c.vy * ny;
        c.vx -= 2 * dot * nx * c.restitution;
        c.vy -= 2 * dot * ny * c.restitution;
        
        if (c.onCollide) c.onCollide(r, Math.abs(dot * 2));
      }
    }
  }
}