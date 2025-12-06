/**
 * 简易的对象池实现
 */
export default class Pool {
  constructor() {
    this.pool = []
  }

  get() {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].visible) {
        return this.pool[i]
      }
    }
    return null
  }

  add(obj) {
    this.pool.push(obj)
  }

  run() {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].visible) {
        this.pool[i].update && this.pool[i].update()
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].visible) {
        this.pool[i].drawToCanvas(ctx)
      }
    }
  }

  clear() {
    this.pool = []
  }
}