// src/ui/ButtonManager.ts
import { TextButton, ButtonConfig } from './TextButton';

export class ButtonManager {
    private buttons: { [id: string]: TextButton } = {};
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    // 添加按钮
    addButton(button: TextButton): void {
        this.buttons[button.id] = button;
    }

    // 从配置创建并添加按钮
    addButtonFromConfig(config: ButtonConfig, style?: any): void {
        const button = TextButton.fromConfig(config, this.ctx, style);
        this.addButton(button);
    }

    // 移除按钮
    removeButton(id: string): boolean {
        if (this.buttons[id]) {
            delete this.buttons[id];
            return true;
        }
        return false;
    }

    // 获取按钮
    getButton(id: string): TextButton | undefined {
        return this.buttons[id];
    }

    // 渲染所有按钮
    renderAll(): void {
        for (const id in this.buttons) {
            this.buttons[id].render();
        }
    }

    // 处理点击事件
    handleClick(x: number, y: number): boolean {
        for (const id in this.buttons) {
            if (this.buttons[id].handleClick(x, y)) {
                return true;
            }
        }
        return false;
    }

    // 显示所有按钮
    showAll(): void {
        for (const id in this.buttons) {
            this.buttons[id].show();
        }
    }

    // 隐藏所有按钮
    hideAll(): void {
        for (const id in this.buttons) {
            this.buttons[id].hide();
        }
    }

    // 显示指定按钮
    showButton(id: string): void {
        const button = this.buttons[id];
        if (button) {
            button.show();
        }
    }

    // 隐藏指定按钮
    hideButton(id: string): void {
        const button = this.buttons[id];
        if (button) {
            button.hide();
        }
    }

    // 禁用所有按钮
    disableAll(): void {
        for (const id in this.buttons) {
            this.buttons[id].setDisabled(true);
        }
    }

    // 启用所有按钮
    enableAll(): void {
        for (const id in this.buttons) {
            this.buttons[id].setDisabled(false);
        }
    }

    // 禁用指定按钮
    disableButton(id: string): void {
        const button = this.buttons[id];
        if (button) {
            button.setDisabled(true);
        }
    }

    // 启用指定按钮
    enableButton(id: string): void {
        const button = this.buttons[id];
        if (button) {
            button.setDisabled(false);
        }
    }

    // 清空所有按钮
    clear(): void {
        this.buttons = {};
    }

    // 获取所有按钮
    getAllButtons(): TextButton[] {
        const result: TextButton[] = [];
        for (const id in this.buttons) {
            result.push(this.buttons[id]);
        }
        return result;
    }

    // 批量添加按钮
    addButtons(configs: ButtonConfig[], style?: any): void {
        configs.forEach(config => {
            this.addButtonFromConfig(config, style);
        });
    }

    // 更新按钮文字
    updateButtonText(id: string, text: string): void {
        const button = this.buttons[id];
        if (button) {
            button.setText(text);
        }
    }

    // 检查点是否在某个按钮内
    isPointInAnyButton(x: number, y: number): boolean {
        for (const id in this.buttons) {
            const bounds = this.buttons[id].getBounds();
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                return true;
            }
        }
        return false;
    }
}
