(function() {
    setTimeout(() => {
        try { initAmbientPlugin(); } catch (e) { console.warn(e); }
    }, 500);

    function initAmbientPlugin() {
        const CANVAS_ID = 'st-ambient-canvas';
        const MENU_ID = 'ambient-effects-menu';
        
        // --- 默认配置 ---
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

        let ctx, particles = [], w, h, animationFrame;
        
        // 【核心黑科技】预渲染纹理画布
        // 我们不每帧画图形，而是提前画好一张带发光的图，存在内存里
        let textureCanvas = document.createElement('canvas');
        let textureCtx = textureCanvas.getContext('2d');

        // 生成发光贴图
        function generateTexture() {
            const size = 60; // 贴图大小
            textureCanvas.width = size;
            textureCanvas.height = size;
            const center = size / 2;
            const r = 10; // 基础半径

            textureCtx.clearRect(0, 0, size, size);
            textureCtx.fillStyle = config.color;
            textureCtx.shadowBlur = 15; // 只有这里计算一次发光
            textureCtx.shadowColor = config.color;

            textureCtx.translate(center, center);

            if (config.type === 'snow') {
                textureCtx.beginPath();
                textureCtx.arc(0, 0, r, 0, Math.PI * 2);
                textureCtx.fill();
            } else if (config.type === 'star') {
                textureCtx.beginPath();
                textureCtx.moveTo(0, -r);
                textureCtx.quadraticCurveTo(2, -2, r, 0);
                textureCtx.quadraticCurveTo(2, 2, 0, r);
                textureCtx.quadraticCurveTo(-2, 2, -r, 0);
                textureCtx.quadraticCurveTo(-2, -2, 0, -r);
                textureCtx.fill();
            } else if (config.type === 'leaf') {
                textureCtx.beginPath();
                textureCtx.ellipse(0, 0, r, r/2, 0, 0, Math.PI * 2);
                textureCtx.fill();
            } else if (config.type === 'flower') {
                textureCtx.beginPath();
                textureCtx.moveTo(0, 0);
                textureCtx.bezierCurveTo(r, -r, r*2, 0, 0, r);
                textureCtx.bezierCurveTo(-r*2, 0, -r, -r, 0, 0);
                textureCtx.fill();
            }
        }

        // --- 粒子系统 (恢复了昨日的完美物理引擎) ---
        class Particle {
            constructor() { this.reset(true); }

            reset(initial = false) {
                this.x = Math.random() * w;
                this.y = initial ? Math.random() * h : -50;
                this.size = Math.random() * config.size + (config.size / 2);
                
                // 恢复原汁原味的速度算法
                this.speedY = (Math.random() * 0.5 + 0.5) * config.speed; 
                this.speedX = (Math.random() - 0.5) * (config.speed * 0.5); 
                
                this.angle = Math.random() * 360;
                this.spin = (Math.random() - 0.5) * 2; 
                this.opacity = Math.random() * 0.5 + 0.3;
                
                // 给每个粒子一个随机偏移，让摇摆不同步
                this.swayOffset = Math.random() * 100; 
            }

            update() {
                // 【核心物理】这就是你喜欢的那种“摇摆感” (Math.sin)
                this.y += this.speedY;
                this.x += this.speedX + Math.sin((this.y + this.swayOffset) * 0.01) * 0.6;
                this.angle += this.spin;

                if (this.y > h + 50 || this.x > w + 50 || this.x < -50) {
                    this.reset();
                }
            }

            draw() {
                if (!ctx) return;
                
                // 直接把预渲染好的带光影的图片贴上去，显卡占用几乎为0
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle * Math.PI / 180);
                ctx.globalAlpha = this.opacity;
                
                // 缩放贴图以匹配粒子大小
                const scale = this.size / 10;
                ctx.scale(scale, scale);
                
                // 绘制贴图 (极快)
                ctx.drawImage(textureCanvas, -30, -30);
                
                ctx.restore();
            }
        }

        function initCanvas() {
            if (document.getElementById(CANVAS_ID)) return;
            let canvas = document.createElement('canvas');
            canvas.id = CANVAS_ID;
            if (document.body) {
                document.body.appendChild(canvas);
                ctx = canvas.getContext('2d');
                
                const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
                window.addEventListener('resize', resize);
                resize();
                
                generateTexture(); // 生成贴图
                loop();
            } else {
                setTimeout(initCanvas, 500);
            }
        }

        function loop() {
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);

            if (config.enabled) {
                if (particles.length < config.count) {
                    while(particles.length < config.count) particles.push(new Particle());
                } else if (particles.length > config.count) {
                    particles.splice(config.count);
                }
                particles.forEach(p => { p.update(); p.draw(); });
            } else {
                particles = [];
            }
            animationFrame = requestAnimationFrame(loop);
        }

        // --- 菜单注入 (UI保持不变) ---
        function injectSettingsMenu() {
            const container = jQuery('#extensions_settings'); 
            if (container.length === 0 || jQuery(`#${MENU_ID}`).length) return;

            const html = `
                <div id="${MENU_ID}" class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>氛围特效 ❄️</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content ambient-settings-box">
                        <div class="ambient-desc">极速引擎版 | 动态摇摆物理</div>
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

            // 当配置改变时，重新生成贴图
            const updateConfig = () => {
                localStorage.setItem('st_ambient_config', JSON.stringify(config));
                generateTexture(); 
            };

            jQuery('#ambient_enabled').on('change', function() { config.enabled = jQuery(this).is(':checked'); updateConfig(); });
            jQuery('#ambient_type').on('change', function() { 
                config.type = jQuery(this).val();
                if(config.type === 'leaf') config.color = '#88cc88';
                else if(config.type === 'flower') config.color = '#ffb7b2';
                else if(config.type === 'snow') config.color = '#ffffff';
                else if(config.type === 'star') config.color = '#fff6cc';
                jQuery('#ambient_color').val(config.color);
                updateConfig(); 
                particles = []; // 切换类型时重置粒子位置
            });
            jQuery('#ambient_color').on('input', function() { config.color = jQuery(this).val(); updateConfig(); });
            jQuery('#ambient_size').on('input', function() { config.size = parseFloat(jQuery(this).val()); updateConfig(); });
            jQuery('#ambient_speed').on('input', function() { config.speed = parseFloat(jQuery(this).val()); updateConfig(); });
            jQuery('#ambient_count').on('input', function() { config.count = parseInt(jQuery(this).val()); updateConfig(); });
        }

        initCanvas();
        setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) injectSettingsMenu();
        }, 1000);
    }
})();
