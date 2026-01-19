(function() {
    setTimeout(() => {
        try { initAmbientPlugin(); } catch (e) { console.warn(e); }
    }, 500);

    function initAmbientPlugin() {
        const CONTAINER_ID = 'st-ambient-container';
        const MENU_ID = 'ambient-effects-menu';
        
        let config = {
            enabled: false,
            type: 'snow',
            speed: 2,
            size: 3,
            count: 100,
            color: '#ffffff'
        };

        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}

        // --- 定义 Worker 线程的代码 (在一个独立的空间里运行) ---
        const workerCode = `
            let ctx, w, h;
            let particles = [];
            let config = {};
            let textureBitmap; // 发光贴图缓存

            // 监听主线程发来的消息
            self.onmessage = function(e) {
                const data = e.data;
                if (data.type === 'init') {
                    const canvas = data.canvas;
                    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
                    w = data.width;
                    h = data.height;
                    config = data.config;
                    generateTexture(); // 生成贴图
                    loop();
                } else if (data.type === 'resize') {
                    w = data.width;
                    h = data.height;
                    // OffscreenCanvas 会自动调整大小，不需要手动设 width
                } else if (data.type === 'updateConfig') {
                    const oldType = config.type;
                    const oldColor = config.color;
                    config = data.config;
                    
                    // 如果颜色或类型变了，重新生成发光贴图
                    if (oldType !== config.type || oldColor !== config.color) {
                        generateTexture();
                        particles = []; // 重置粒子
                    }
                }
            };

            // 生成带发光的离屏贴图 (性能核心)
            function generateTexture() {
                const size = 60;
                const canvas = new OffscreenCanvas(size, size);
                const tCtx = canvas.getContext('2d');
                const center = size / 2;
                const r = 10;

                tCtx.clearRect(0, 0, size, size);
                tCtx.fillStyle = config.color;
                tCtx.shadowBlur = 10; // 这里计算发光，只算一次
                tCtx.shadowColor = config.color;
                
                tCtx.translate(center, center);

                if (config.type === 'snow') {
                    tCtx.beginPath(); tCtx.arc(0, 0, r, 0, Math.PI * 2); tCtx.fill();
                } else if (config.type === 'star') {
                    tCtx.beginPath(); tCtx.moveTo(0, -r);
                    tCtx.quadraticCurveTo(2, -2, r, 0); tCtx.quadraticCurveTo(2, 2, 0, r);
                    tCtx.quadraticCurveTo(-2, 2, -r, 0); tCtx.quadraticCurveTo(-2, -2, 0, -r); tCtx.fill();
                } else if (config.type === 'leaf') {
                    tCtx.beginPath(); tCtx.ellipse(0, 0, r, r/2, 0, 0, Math.PI * 2); tCtx.fill();
                } else if (config.type === 'flower') {
                    tCtx.beginPath(); tCtx.moveTo(0, 0);
                    tCtx.bezierCurveTo(r, -r, r*2, 0, 0, r); tCtx.bezierCurveTo(-r*2, 0, -r, -r, 0, 0); tCtx.fill();
                }
                
                // 转成 Bitmap，渲染极快
                textureBitmap = canvas.transferToImageBitmap();
            }

            class Particle {
                constructor() { this.reset(true); }
                
                reset(initial = false) {
                    this.x = Math.random() * w;
                    this.y = initial ? Math.random() * h : -50;
                    this.size = Math.random() * config.size + (config.size / 2);
                    
                    // 恢复自然的物理随机性
                    this.speedY = (Math.random() * 0.5 + 0.5) * config.speed; 
                    this.speedX = (Math.random() - 0.5) * (config.speed * 0.5); 
                    
                    this.angle = Math.random() * 360;
                    this.spin = (Math.random() - 0.5) * 2; 
                    this.opacity = Math.random() * 0.5 + 0.3;
                    this.swayOffset = Math.random() * 100; // 随机摆动相位
                }

                update() {
                    this.y += this.speedY;
                    // 自然的正弦波摆动，这是 CSS 关键帧做不到的随机感
                    this.x += this.speedX + Math.sin((this.y + this.swayOffset) * 0.01) * 0.6;
                    this.angle += this.spin;

                    if (this.y > h + 50 || this.x > w + 50 || this.x < -50) this.reset();
                }

                draw() {
                    if (!textureBitmap) return;
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.angle * Math.PI / 180);
                    ctx.globalAlpha = this.opacity;
                    
                    const scale = this.size / 10;
                    ctx.scale(scale, scale);
                    ctx.drawImage(textureBitmap, -30, -30);
                    
                    ctx.restore();
                }
            }

            function loop() {
                if (!config.enabled) {
                    ctx.clearRect(0, 0, w, h);
                    requestAnimationFrame(loop);
                    return;
                }

                ctx.clearRect(0, 0, w, h);
                
                // 动态调整粒子数量
                if (particles.length < config.count) {
                    while(particles.length < config.count) particles.push(new Particle());
                } else if (particles.length > config.count) {
                    particles.splice(config.count);
                }

                for (let i = 0; i < particles.length; i++) {
                    particles[i].update();
                    particles[i].draw();
                }
                
                requestAnimationFrame(loop);
            }
        `;

        // --- 主线程逻辑 ---
        
        let worker;
        let container;

        function startWorker() {
            // 防止重复创建
            if (document.getElementById(CONTAINER_ID)) return;

            // 1. 创建容器
            container = document.createElement('div');
            container.id = CONTAINER_ID;
            
            // 2. 创建 Canvas
            const canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            // 设置内部逻辑分辨率
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            container.appendChild(canvas);
            document.body.appendChild(container);

            // 3. 核心：将 Canvas 控制权移交给 Worker
            // 这一步之后，主线程就再也无法操作这个 canvas 了，它属于副线程了
            const offscreen = canvas.transferControlToOffscreen();

            // 4. 从字符串创建 Worker (为了不用多文件)
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            worker = new Worker(URL.createObjectURL(blob));

            // 5. 初始化 Worker
            worker.postMessage({
                type: 'init',
                canvas: offscreen,
                width: window.innerWidth,
                height: window.innerHeight,
                config: config
            }, [offscreen]); // 转移所有权

            // 6. 监听窗口变化，通知 Worker
            window.addEventListener('resize', () => {
                worker.postMessage({
                    type: 'resize',
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            });
        }

        // --- 菜单注入 (UI) ---
        function injectSettingsMenu() {
            const container = jQuery('#extensions_settings'); 
            if (container.length === 0 || jQuery(`#${MENU_ID}`).length) return;

            const html = `
                <div id="${MENU_ID}" class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>✨ 氛围特效 (Ambient)</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content ambient-settings-box">
                        <div class="ambient-desc">多线程渲染 | 物理引擎 | 零卡顿</div>
                        
                        <div class="ambient-control-row">
                            <label>启用特效</label>
                            <input type="checkbox" id="ambient_enabled" ${config.enabled ? 'checked' : ''}>
                        </div>
                        <div class="ambient-control-row">
                            <label>特效类型</label>
                            <select id="ambient_type">
                                <option value="snow">❄️ 柔光雪花</option>
                                <option value="star">✨ 闪烁星光</option>
                                <option value="leaf">🍃 飘落树叶</option>
                                <option value="flower">💐 飞舞花瓣</option>
                            </select>
                        </div>
                        <div class="ambient-control-row">
                            <label>颜色</label>
                            <input type="color" id="ambient_color" value="${config.color}">
                        </div>
                        <div class="ambient-control-row">
                            <label>粒子大小</label>
                            <input type="range" id="ambient_size" min="1" max="10" step="0.5" value="${config.size}">
                        </div>
                        <div class="ambient-control-row">
                            <label>飘落速度</label>
                            <input type="range" id="ambient_speed" min="0.5" max="10" step="0.5" value="${config.speed}">
                        </div>
                        <div class="ambient-control-row">
                            <label>粒子密度</label>
                            <input type="range" id="ambient_count" min="10" max="300" step="10" value="${config.count}">
                        </div>
                    </div>
                </div>
            `;

            container.append(html);

            jQuery(`#${MENU_ID} .inline-drawer-toggle`).on('click', function() {
                jQuery(this).closest('.inline-drawer').toggleClass('expanded');
            });

            // 向 Worker 发送配置更新
            const update = () => {
                localStorage.setItem('st_ambient_config', JSON.stringify(config));
                if (worker) {
                    worker.postMessage({
                        type: 'updateConfig',
                        config: config
                    });
                }
            };

            jQuery('#ambient_enabled').on('change', function() { config.enabled = jQuery(this).is(':checked'); update(); });
            
            jQuery('#ambient_type').on('change', function() { 
                config.type = jQuery(this).val();
                if(config.type === 'leaf') config.color = '#88cc88';
                else if(config.type === 'flower') config.color = '#ffb7b2';
                else if(config.type === 'snow') config.color = '#ffffff';
                else if(config.type === 'star') config.color = '#fff6cc';
                jQuery('#ambient_color').val(config.color);
                update(); 
            });

            jQuery('#ambient_color').on('input', function() { config.color = jQuery(this).val(); update(); });
            
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('input', function() {
                config.size = parseFloat(jQuery('#ambient_size').val());
                config.speed = parseFloat(jQuery('#ambient_speed').val());
                config.count = parseInt(jQuery('#ambient_count').val());
                saveConfig(); // 滑动时只保存
            });
            
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('change', function() {
                 update(); // 松手时发送给 Worker，防止通信过于频繁
            });
        }

        function saveConfig() { localStorage.setItem('st_ambient_config', JSON.stringify(config)); }

        // --- 启动 ---
        // 1. 启动多线程
        startWorker();
        
        // 2. 注入菜单
        setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) injectSettingsMenu();
        }, 1000);
    }
})();
