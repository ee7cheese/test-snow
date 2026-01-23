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
            wind: 0,
            opacity: 0.7,
            color: '#ffffff'
        };

        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) { console.log('读取配置失败'); }

        // --- 1. 粒子系统 ---
        let ctx, particles = [], splashes = [], w, h, animationFrame;

        // === 新增：水花类 (专门负责溅起的小水珠) ===
        class Splash {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.color = color;
                // 水花比雨滴小一点
                this.size = Math.random() * 1.5 + 0.5;
                // 向左右随机炸开 + 一点点风的影响
                this.speedX = (Math.random() - 0.5) * 4 + (config.wind * 0.1); 
                // 向上跳起 (负数是向上)
                this.speedY = -Math.random() * 3 - 1;   
                this.opacity = 1.0;
                // 重力加速度
                this.gravity = 0.2;
            }

            update() {
                this.speedY += this.gravity; // 模拟重力，先升后降
                this.y += this.speedY;
                this.x += this.speedX;
                this.opacity -= 0.04; // 消失得很快
            }

            draw() {
                // 继承全局透明度
                ctx.globalAlpha = this.opacity * config.opacity;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // === 原有：主粒子类 ===
        class Particle {
            constructor() { this.reset(true); }

            reset(initial = false) {
                this.x = Math.random() * w;
                this.y = initial ? Math.random() * h : -20;
                this.size = Math.random() * config.size + (config.size / 2);
                
                if (config.type === 'rain') {
                    this.speedY = (Math.random() * 0.5 + 1.0) * config.speed * 3; 
                    this.speedX = config.wind * (this.speedY * 0.15); 
                    this.angle = Math.atan2(this.speedX, this.speedY) * (180 / Math.PI) * -1;
                    this.spin = 0;
                    this.alphaFactor = Math.random() * 0.4 + 0.6; 
                } else {
                    this.speedY = (Math.random() * 0.5 + 0.5) * config.speed;
                    this.speedX = (Math.random() - 0.5) * (config.speed * 0.5) + (config.wind * 0.5);
                    this.angle = Math.random() * 360;
                    this.spin = (Math.random() - 0.5) * 2; 
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

                // === 边界检测与重置 ===
                // 1. 如果超出底部
                if (this.y > h) {
                    // 【核心改动】如果是雨，且落到底部，生成水花
                    if (config.type === 'rain' && config.enabled) {
                        this.createSplash(this.x, h);
                    }
                    this.reset();
                }
                // 2. 如果因为风大超出了左右边界
                else if ((this.x > w + 20 && config.wind >= 0) || (this.x < -20 && config.wind <= 0)) {
                    this.reset();
                    this.x = Math.random() * (w + 200) - 100; 
                }
            }

            createSplash(x, y) {
                // 限制性能：不是每一滴雨都溅起水花，随机溅起，或者限制水花总数
                // 这里设置为 50% 概率溅起，防止满屏太乱
                if (Math.random() > 0.5) return; 

                // 每次撞击产生 2-4 个小水珠
                const count = Math.floor(Math.random() * 3) + 2;
                for(let i=0; i<count; i++) {
                    splashes.push(new Splash(x, y, config.color));
                }
            }

            draw() {
                if (!ctx) return;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle * Math.PI / 180);
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
            } else { setTimeout(initCanvas, 500); }
        }

        function loop() {
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);

            if (config.enabled) {
                // 1. 管理主粒子
                if (particles.length < config.count) {
                    while(particles.length < config.count) particles.push(new Particle());
                } else if (particles.length > config.count) {
                    particles.splice(config.count);
                }
                particles.forEach(p => { p.update(); p.draw(); });

                // 2. 管理水花粒子 (只有下雨时才处理水花数组)
                if (config.type === 'rain') {
                    for (let i = splashes.length - 1; i >= 0; i--) {
                        let s = splashes[i];
                        s.update();
                        s.draw();
                        // 如果完全透明了，从数组移除
                        if (s.opacity <= 0) {
                            splashes.splice(i, 1);
                        }
                    }
                } else {
                    // 如果不是下雨模式，清空水花
                    if(splashes.length > 0) splashes = [];
                }

            } else {
                particles = [];
                splashes = [];
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
            jQuery('#ambient_opacity').on('input', function() { config.opacity = parseFloat(jQuery(this).val()); saveConfig(); });
            jQuery('#ambient_size').on('input', function() { config.size = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_speed').on('input', function() { config.speed = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_wind').on('input', function() { config.wind = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_count').on('input', function() { config.count = parseInt(jQuery(this).val()); saveConfig(); });
        }

        function saveConfig() { localStorage.setItem('st_ambient_config', JSON.stringify(config)); }
        function resetParticles() { particles = []; splashes = []; } // 切换配置时也清空水花

        initCanvas();
        const checkInterval = setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) {
                injectSettingsMenu();
            }
        }, 1000);
    }
})();
