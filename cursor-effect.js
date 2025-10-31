/**************** 光标渲染 *******************/
class Circle {
    /**
     * 粒子类
     * @param {Object} options - 配置项
     * @param {Object} options.origin - 初始位置 {x, y}
     * @param {number} options.speed - 移动速度
     * @param {string} options.color - 粒子颜色
     * @param {number} options.angle - 移动角度(弧度)
     * @param {CanvasRenderingContext2D} options.context - 绘图上下文
     */
    constructor({ origin, speed, color, angle, context }) {
        this.origin = { ...origin };
        this.position = { ...this.origin };
        this.color = color;
        this.speed = speed;
        this.angle = angle;
        this.context = context;
        this.renderCount = 0;
    }

    // 绘制粒子
    draw() {
        const ctx = this.context;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // 更新粒子位置
    move() {
        this.position.x += Math.sin(this.angle) * this.speed;
        this.position.y += Math.cos(this.angle) * this.speed + (this.renderCount * 0.3);
        this.renderCount++;
    }
}

class Boom {
    /**
     * 爆炸效果类
     * @param {Object} options - 配置项
     * @param {Object} options.origin - 爆炸原点 {x, y}
     * @param {CanvasRenderingContext2D} options.context - 绘图上下文
     * @param {number} [options.circleCount=10] - 粒子数量
     * @param {Object} options.area - 边界范围 {width, height}
     */
    constructor({ origin, context, circleCount = 10, area }) {
        this.origin = origin;
        this.context = context;
        this.circleCount = circleCount;
        this.area = area;
        this.stop = false;
        this.circles = [];
    }

    // 从数组随机取元素
    #randomArray(range) {
        return range[Math.floor(range.length * Math.random())];
    }

    // 生成随机颜色
    #randomColor() {
        const range = ['8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        return `#${[...Array(6)].map(() => this.#randomArray(range)).join('')}`;
    }

    // 生成指定范围随机数
    #randomRange(start, end) {
        return (end - start) * Math.random() + start;
    }

    // 初始化粒子
    init() {
        for (let i = 0; i < this.circleCount; i++) {
            this.circles.push(new Circle({
                context: this.context,
                origin: this.origin,
                color: this.#randomColor(),
                angle: this.#randomRange(Math.PI - 1, Math.PI + 1),
                speed: this.#randomRange(1, 6)
            }));
        }
    }

    // 更新所有粒子位置
    move() {
        for (let i = this.circles.length - 1; i >= 0; i--) {
            const circle = this.circles[i];
            circle.move();
            
            // 超出边界时移除粒子（倒序遍历优化删除性能）
            if (circle.position.x < 0 || 
                circle.position.x > this.area.width || 
                circle.position.y > this.area.height) {
                this.circles.splice(i, 1);
            }
        }
        this.stop = this.circles.length === 0;
    }

    // 绘制所有粒子
    draw() {
        this.circles.forEach(circle => circle.draw());
    }
}

class CursorSpecialEffects {
    constructor() {
        this.computerCanvas = document.createElement('canvas');
        this.renderCanvas = document.createElement('canvas');

        this.computerContext = this.computerCanvas.getContext('2d');
        this.renderContext = this.renderCanvas.getContext('2d');

        this.globalWidth = window.innerWidth;
        this.globalHeight = window.innerHeight;

        this.booms = [];
        this.running = false;
        this.animationId = null; // 用于存储动画帧ID

        // 绑定事件处理函数上下文
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handlePageHide = this.handlePageHide.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.run = this.run.bind(this);
    }

    /**
     * 处理鼠标点击事件
     * @param {MouseEvent} e - 鼠标事件对象
     */
    handleMouseDown(e) {
        const boom = new Boom({
            origin: { x: e.clientX, y: e.clientY },
            context: this.computerContext,
            area: {
                width: this.globalWidth,
                height: this.globalHeight
            }
        });
        boom.init();
        this.booms.push(boom);
        
        if (!this.running) {
            this.run();
        }
    }

    // 处理页面隐藏
    handlePageHide() {
        this.booms = [];
        this.stopAnimation();
    }

    // 处理窗口大小变化
    handleResize() {
        this.globalWidth = window.innerWidth;
        this.globalHeight = window.innerHeight;
        
        // 更新画布尺寸
        [this.renderCanvas, this.computerCanvas].forEach(canvas => {
            canvas.width = this.globalWidth;
            canvas.height = this.globalHeight;
        });
    }

    // 停止动画
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.running = false;
    }

    // 初始化画布和事件监听
    init() {
        const style = this.renderCanvas.style;
        Object.assign(style, {
            position: 'fixed',
            top: '0',
            left: '0',
            zIndex: '999999999', // 减少不必要的9
            pointerEvents: 'none'
        });

        this.handleResize(); // 初始化尺寸
        document.body.appendChild(this.renderCanvas);

        // 添加事件监听
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('pagehide', this.handlePageHide);
        window.addEventListener('resize', this.handleResize);
    }

    // 动画循环
    run() {
        this.running = true;
        
        // 没有爆炸效果时停止动画
        if (this.booms.length === 0) {
            return this.stopAnimation();
        }

        this.animationId = requestAnimationFrame(this.run);

        // 清空画布
        this.computerContext.clearRect(0, 0, this.globalWidth, this.globalHeight);
        this.renderContext.clearRect(0, 0, this.globalWidth, this.globalHeight);

        // 更新并绘制所有爆炸效果
        for (let i = this.booms.length - 1; i >= 0; i--) {
            const boom = this.booms[i];
            if (boom.stop) {
                this.booms.splice(i, 1);
                continue;
            }
            boom.move();
            boom.draw();
        }

        // 复制计算画布到渲染画布
        this.renderContext.drawImage(
            this.computerCanvas, 
            0, 0, 
            this.globalWidth, this.globalHeight
        );
    }
}

// 初始化效果（确保DOM加载完成）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CursorSpecialEffects().init();
    });
} else {
    new CursorSpecialEffects().init();
}
