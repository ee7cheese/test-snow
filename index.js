// 使用立即执行函数包裹，防止变量污染
(function() {
    // 【核心保险】延迟 500ms 执行，等待酒馆核心加载完毕
    setTimeout(() => {
        try {
            initAmbientPlugin();
        } catch (e) {
            console.warn("氛围特效插件启动失败:", e);
        }
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
            wind: 0,       // 风力
            opacity: 0.7,  // 新增：全局透明度 (0-1)
            color: '#ffffff'
        };

        // 安全读取配置
        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {
            console.log('读取配置失败，使用默认配置');
        }

        // --- 1. 粒子系统 ---
        let ctx, particles = [], w, h, animationFrame;

        class Particle {
            constructor() { this.reset(true); }

            reset(initial = false) {
                this.x = Math.random() * w;
                this.y = initial ? Math.random() * h : -20;
                
                // 基础大小
                this.size = Math.random() * config.size + (config.size / 2);
                
                // === 速度与角度计算 ===
                if (config.type === 'rain') {
                    // 雨滴下落速度 (垂直)
                    this.speedY = (Math.random() * 0.5 + 1.0) * config.speed * 3; 
                    
                    // 雨滴横向速度 (由风力决定)
                    this.speedX = config.wind * (this.speedY * 0.15); 

                    // 计算雨滴倾斜角度
                    this.angle = Math.atan2(this.speedX, this.speedY) * (180 / Math.PI) * -1;
                    
                    this.spin = 0;
                    
                    // 雨滴的基础层次感 (随机因子)
                    // 以前是 0.1~0.4，现在提高一点，完全交由全局透明度控制
                    this.alphaFactor = Math.random() * 0.4 + 0.6; 

                } else {
                    // 雪花/叶子/花瓣 逻辑
                    this.speedY = (Math.random() * 0.5 + 0.5) * config.speed;
                    this.speedX = (Math.random() - 0.5) * (config.speed * 0.5) + (config.wind * 0.5);
                    this.angle = Math.random() * 360;
                    this.spin = (Math.random() - 0.5) * 2; 
                    
                    // 普通粒子的基础层次感
                    this.alphaFactor = Math.random() * 0.5 + 0.5;
                }
            }

            update() {
                this.y += this.speedY;
                
                if (config.type === 'rain') {
                    this.x += this.speedX;
                } else {
                    this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5;
                    this.angle += this.spin; 
                }

                // 边界检查与重置
                if (this.y > h + 20 || (this.x > w + 20 && config.wind >= 0) || (this.x < -20 && config.wind <= 0)) {
                    this.reset();
                    // 随机修正位置，防止大风导致屏幕一侧空白
                    this.x = Math.random() * (w + 200) - 100; 
                }
            }

            draw() {
                if (!ctx) return;

                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle * Math.PI / 180);
                
                // 【核心修改】应用全局透明度
                // 最终透明度 = 粒子自身的随机因子 * 全局设置
                ctx.globalAlpha = this.alphaFactor * config.opacity;
                
                ctx.fillStyle = config.color;

                switch (config.type) {
                    case 'star': this.drawStar(ctx, this.size); break;
                    case 'flower': this.drawflower(ctx, this.size); break;
                    case 'leaf': this.drawLeaf(ctx, this.size); break;
                    case 'rain': this.drawRain(ctx, this.size); break;
                    default:
                        ctx.beginPath();
                        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                        ctx.shadowBlur = 5; ctx.shadowColor = config.color; ctx.fill();
                        break;
                }
                ctx.restore();
            }

            drawRain(c, r) {
                c.beginPath();
                c.rect(0, 0, r * 0.4, r * 8); 
                c.fill();
            }

            drawStar(c, r) {
                c.beginPath(); c.moveTo(0, -r);
                c.quadraticCurveTo(2, -2, r, 0); c.quadraticCurveTo(2, 2, 0, r);
                c.quadraticCurveTo(-2, 2, -r, 0); c.quadraticCurveTo(-2, -2, 0, -r); c.fill();
            }

            drawLeaf(c, r) {
                c.beginPath(); c.ellipse(0, 0, r, r/2, 0, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.strokeStyle = "rgba(0,0,0,0.2)"; c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke();
            }
            
            drawflower(c, r) {
                c.beginPath(); c.moveTo(0, 0);
                c.bezierCurveTo(r, -r, r*2, 0, 0, r); c.bezierCurveTo(-r*2, 0, -r, -r, 0, 0); c.fill();
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

        // --- 2. 菜单注入逻辑 ---
        function injectSettingsMenu() {
            const container = jQuery('#extensions_settings'); 
            if (container.length === 0 || jQuery(`#${MENU_ID}`).length) return;

            const html = `
                <div id="${MENU_ID}" class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>氛围特效✨</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content ambient-settings-box">
                        <div class="ambient-desc">自定义你的背景氛围效果</div>
                        
                        <div class="ambient-control-row">
                            <label>启用特效</label>
                            <input type="checkbox" id="ambient_enabled" ${config.enabled ? 'checked' : ''}>
                        </div>

                        <div class="ambient-control-row">
                            <label>特效类型</label>
                            <select id="ambient_type">
                                <option value="snow">❄️ 柔光雪花</option>
                                <option value="rain">🌧️ 倾盆大雨</option>
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
                            <label>透明度</label>
                            <!-- 新增透明度滑块 -->
                            <input type="range" id="ambient_opacity" min="0.1" max="1" step="0.05" value="${config.opacity}" title="调整特效的可见度">
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
                            <label>风向/斜率</label>
                            <input type="range" id="ambient_wind" min="-10" max="10" step="1" value="${config.wind}" title="左 <-> 直 <-> 右">
                        </div>

                        <div class="ambient-control-row">
                            <label>粒子密度</label>
                            <input type="range" id="ambient_count" min="10" max="500" step="10" value="${config.count}">
                        </div>
                    </div>
                </div>
            `;

            container.append(html);

            const menu = jQuery(`#${MENU_ID}`);
            menu.find('.inline-drawer-toggle').on('click', function() {
                jQuery(this).closest('.inline-drawer').toggleClass('expanded');
            });

            // 事件绑定
            jQuery('#ambient_enabled').on('change', function() { config.enabled = jQuery(this).is(':checked'); saveConfig(); });
            
            jQuery('#ambient_type').on('change', function() { 
                config.type = jQuery(this).val();
                if(config.type === 'leaf') config.color = '#88cc88';
                else if(config.type === 'flower') config.color = '#ffb7b2';
                else if(config.type === 'snow') config.color = '#ffffff';
                else if(config.type === 'star') config.color = '#fff6cc';
                else if(config.type === 'rain') config.color = '#aaddff';
                jQuery('#ambient_color').val(config.color);
                saveConfig(); 
                resetParticles(); 
            });

            jQuery('#ambient_color').on('input', function() { config.color = jQuery(this).val(); saveConfig(); });
            
            // 透明度改变 (不需要重置粒子，实时生效)
            jQuery('#ambient_opacity').on('input', function() { config.opacity = parseFloat(jQuery(this).val()); saveConfig(); });

            jQuery('#ambient_size').on('input', function() { config.size = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_speed').on('input', function() { config.speed = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_wind').on('input', function() { config.wind = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_count').on('input', function() { config.count = parseInt(jQuery(this).val()); saveConfig(); });
        }

        function saveConfig() { localStorage.setItem('st_ambient_config', JSON.stringify(config)); }
        function resetParticles() { particles = []; }

        initCanvas();
        const checkInterval = setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) {
                injectSettingsMenu();
            }
        }, 1000);
    }
})();
