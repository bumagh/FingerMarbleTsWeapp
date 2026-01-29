// src/ui/TextButton.ts

export interface UIPosition {
    x: number;
    y: number;
}

export interface ButtonConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    visible?: boolean;
    id?: string;
    disabled?: boolean;
    onClick?: () => void;
}

export interface TextButtonStyle {
    backgroundColor: string;
    primaryColor: string;
    accentColor: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    shadowColor: string;
    shadowOffset: { x: number; y: number };
    borderWidth: number;
    innerBorderOffset: number;
    decorativeDotRadius: number;
    decorativeDotOffset: number;
}

export class TextButton {
    id: string;
    position: UIPosition;
    width: number;
    height: number;
    text: string;
    onClick: () => void;
    style: TextButtonStyle;
    ctx: CanvasRenderingContext2D;
    visible: boolean = true;
    disabled: boolean = false;
    hovered: boolean = false;

    constructor(
        id: string,
        position: UIPosition,
        width: number,
        height: number,
        text: string,
        ctx: CanvasRenderingContext2D,
        onClick: () => void,
        style?: Partial<TextButtonStyle>
    ) {
        this.id = id;
        this.position = position;
        this.width = width;
        this.height = height;
        this.text = text;
        this.ctx = ctx;
        this.onClick = onClick;

        // 默认样式
        this.style = {
            backgroundColor: '#2c3e50',
            primaryColor: '#ecf0f1',
            accentColor: '#3498db',
            fontSize: 18,
            fontFamily: "'Arial', 'Microsoft YaHei', sans-serif",
            fontWeight: 'bold',
            shadowColor: 'rgba(0,0,0,0.1)',
            shadowOffset: { x: 4, y: 4 },
            borderWidth: 2,
            innerBorderOffset: 4,
            decorativeDotRadius: 2,
            decorativeDotOffset: 12,
            ...style
        };
    }

    render(): void {
        if (!this.visible) return;

        const x = this.position.x;
        const y = this.position.y;

        // 保存当前状态
        this.ctx.save();

        // 绘制阴影
        this.ctx.fillStyle = this.style.shadowColor;
        this.ctx.fillRect(
            x + this.style.shadowOffset.x,
            y + this.style.shadowOffset.y,
            this.width,
            this.height
        );

        // 绘制背景
        this.ctx.fillStyle = this.disabled ? '#7f8c8d' : this.style.backgroundColor;
        this.ctx.fillRect(x, y, this.width, this.height);

        // 绘制双线边框
        this.ctx.strokeStyle = this.disabled ? '#95a5a6' : this.style.primaryColor;
        this.ctx.lineWidth = this.style.borderWidth;
        this.ctx.strokeRect(x, y, this.width, this.height);

        this.ctx.strokeStyle = this.disabled ? '#95a5a6' : this.style.accentColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            x + this.style.innerBorderOffset,
            y + this.style.innerBorderOffset,
            this.width - this.style.innerBorderOffset * 2,
            this.height - this.style.innerBorderOffset * 2
        );

        // 绘制文字
        this.ctx.font = `${this.style.fontWeight} ${this.style.fontSize}px ${this.style.fontFamily}`;
        this.ctx.fillStyle = this.disabled ? '#bdc3c7' : this.style.primaryColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            this.text,
            x + this.width / 2,
            y + this.height / 2
        );

        // 绘制装饰点
        if (!this.disabled) {
            this.ctx.beginPath();
            this.ctx.arc(
                x + this.style.decorativeDotOffset,
                y + this.height / 2,
                this.style.decorativeDotRadius,
                0,
                Math.PI * 2
            );
            this.ctx.arc(
                x + this.width - this.style.decorativeDotOffset,
                y + this.height / 2,
                this.style.decorativeDotRadius,
                0,
                Math.PI * 2
            );
            this.ctx.fillStyle = this.style.accentColor;
            this.ctx.fill();
        }

        // 恢复状态
        this.ctx.restore();
    }

    handleClick(x: number, y: number): boolean {
        if (!this.visible || this.disabled) return false;

        const isClicked = x >= this.position.x &&
            x <= this.position.x + this.width &&
            y >= this.position.y &&
            y <= this.position.y + this.height;

        if (isClicked) {
            this.onClick();
            return true;
        }

        return false;
    }

    show(): void {
        this.visible = true;
    }

    hide(): void {
        this.visible = false;
    }

    setDisabled(disabled: boolean): void {
        this.disabled = disabled;
    }

    isDisabled(): boolean {
        return this.disabled;
    }

    setHovered(hovered: boolean): void {
        this.hovered = hovered;
    }

    isHovered(): boolean {
        return this.hovered;
    }

    setText(text: string): void {
        this.text = text;
    }

    getText(): string {
        return this.text;
    }

    setStyle(style: Partial<TextButtonStyle>): void {
        this.style = { ...this.style, ...style };
    }

    getBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }

    // 静态方法：从ButtonConfig创建
    static fromConfig(
        config: ButtonConfig,
        ctx: CanvasRenderingContext2D,
        style?: Partial<TextButtonStyle>
    ): TextButton {
        return new TextButton(
            config.id || 'button_' + Date.now(),
            { x: config.x, y: config.y },
            config.width,
            config.height,
            config.text || '',
            ctx,
            config.onClick || (() => {}),
            style
        );
    }
}
