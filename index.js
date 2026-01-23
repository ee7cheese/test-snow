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
            customText: '🎃', // 新增：自定义文字/Emoji的内容
            color: '#ffffff'
        };

        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) { console.log('读取配置失败'); }

        // --- 1. 粒子系统 ---
        let ctx, particles = [], splashes = [], w, h, animationFrame;

        // === 水花类 (仅雨天使用) ===
        class Splash {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = (Math.random() - 0.5) * 4 + (config.wind * 0.1); 
                this.speedY = -Math.random() * 3 - 1;   
                this.opacity = 1.0;
                this.gravity = 0.2;
            }
            update() {
                this.speedY += this.gravity;
                this.y += this.speedY;
                this.x += this.speedX;
                this.opacity -= 0.04;
            }
            draw() {
                ctx.globalAlpha = this.opacity * config.opacity;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // === 主粒子类 ===
        class Particle {
            constructor() { this.reset(true); }

            reset(initial = false) {
                this.x = Math.random() * w;
                this.y = initial ? Math.random() * h : -20;
                this.size = Math.random() * config.size + (config.size / 2);
                
                // === 根据类型设定运动逻辑 ===
                if (config.type === 'rain') {
                    // 雨：直线快速下落
                    this.speedY = (Math.random() * 0.5 + 1.0) * config.speed * 3; 
                    this.speedX = config.wind * (this.speedY * 0.15); 
                    this.angle = Math.atan2(this.speedX, this.speedY) * (180 / Math.PI) * -1;
                    this.spin = 0;
                    this.alphaFactor = Math.random() * 0.4 + 0.6; 
                } else {
                    // 雪/叶/自定义Emoji：飘落
                    this.speedY = (Math.random() * 0.5 + 0.5) * config.speed;
                    this.speedX = (Math.random() - 0.5) * (config.speed * 0.5) + (config.wind * 0.5);
                    
                    this.angle = Math.random() * 360;
                    // Emoji 和叶子可以旋转，显得更生动
                    this.spin = (Math.random() - 0.5) * 2; 
                    this.alphaFactor = Math.random() * 0.5 + 0.5;
                }
            }

            update() {
                this.y += this.speedY;
                
                if (config.type === 'rain') {
                    this.x += this.speedX;
                } else {
                    // 飘落效果
                    this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5;
                    this.angle += this.spin; 
                }

                // === 边界重置 ===
                if (this.y > h) {
                    // 只有雨天有水花
                    if (config.type === 'rain' && config.enabled) {
                        this.createSplash(this.x, h);
                    }
                    this.reset();
                }
                else if ((this.x > w + 20 && config.wind >= 0) || (this.x < -20 && config.wind <= 0)) {
                    this.reset();
                    this.x = Math.random() * (w + 200) - 100; 
                }
            }

            createSplash(x, y) {
                if (Math.random() > 0.5) return; 
                const count = Math.floor(Math.random() * 3) + 2;
                for(let i=0; i<count; i++) splashes.push(new Splash(x, y, config.color));
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
                    case 'custom': this.drawCustom(ctx, this.size); break; // 新增自定义绘制
                    default:
                        ctx.beginPath();
                        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                        ctx.shadowBlur = 5; ctx.shadowColor = config.color; ctx.fill();
                        break;
                }
                ctx.restore();
            }

            // === 新增：绘制自定义Emoji/文字 ===
            drawCustom(c, r) {
                // 字体大小需要比半径大，这里设为半径的5倍
                // 比如半径3，字体就是15px
                const fontSize = Math.max(10, r * 4); 
                c.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                c.textAlign = "center";
                c.textBaseline = "middle";
                // 绘制文字
                c.fillText(config.customText, 0, 0);
            }

            drawRain(c, r) {
                c.beginPath(); c.rect(0, 0, r * 0.4, r * 8); c.fill();
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
                if (particles.length < config.count) {
                    while(particles.length < config.count) particles.push(new Particle());
                } else if (particles.length > config.count) {
                    particles.splice(config.count);
                }
                particles.forEach(p => { p.update(); p.draw(); });

                // 水花只有下雨才有
                if (config.type === 'rain') {
                    for (let i = splashes.length - 1; i >= 0; i--) {
                        let s = splashes[i];
                        s.update(); s.draw();
                        if (s.opacity <= 0) splashes.splice(i, 1);
                    }
                } else {
                    if(splashes.length > 0) splashes = [];
                }
            } else {
                particles = []; splashes = [];
            }
            animationFrame = requestAnimationFrame(loop);
        }

        // --- 2. 菜单注入逻辑 ---
        function injectSettingsMenu() {
            const container = jQuery('#extensions_settings'); 
            if (container.length === 0 || jQuery(`#${MENU_ID}`).length) return;

            // 检查 custom 模式是否开启，决定输入框是否显示
            const customDisplay = config.type === 'custom' ? 'flex' : 'none';

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
                                <option value="custom">🎃 自定义图案</option> <!-- 新增选项 -->
                                <option value="star">✨ 闪烁星光</option>
                                <option value="leaf">🍃 飘落树叶</option>
                                <option value="flower">💐 飞舞花瓣</option>
                            </select>
                        </div>
                        
                        <!-- 新增：自定义输入框 (默认隐藏) -->
                        <div class="ambient-control-row" id="ambient_custom_row" style="display: ${customDisplay}">
                            <label>图案内容</label>
                            <input type="text" id="ambient_custom_text" value="${config.customText}" placeholder="输入Emoji或文字" style="text-align:right">
                        </div>

                        <div class="ambient-control-row">
                            <label>颜色</label>
                            <input type="color" id="ambient_color" value="${config.color}">
                        </div>

                        <div class="ambient-control-row">
                            <label>透明度</label>
                            <input type="range" id="ambient_opacity" min="0.1" max="1" step="0.05" value="${config.opacity}">
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
                            <input type="range" id="ambient_wind" min="-10" max="10" step="1" value="${config.wind}">
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
                
                // 控制自定义输入框的显示/隐藏
                if (config.type === 'custom') {
                    jQuery('#ambient_custom_row').slideDown();
                } else {
                    jQuery('#ambient_custom_row').slideUp();
                }

                if(config.type === 'leaf') config.color = '#88cc88';
                else if(config.type === 'flower') config.color = '#ffb7b2';
                else if(config.type === 'snow') config.color = '#ffffff';
                else if(config.type === 'star') config.color = '#fff6cc';
                else if(config.type === 'rain') config.color = '#aaddff';
                else if(config.type === 'custom') config.color = '#ffffff'; // 自定义模式默认白色
                
                jQuery('#ambient_color').val(config.color);
                saveConfig(); 
                resetParticles(); 
            });

            // 监听自定义文字输入
            jQuery('#ambient_custom_text').on('input', function() {
                config.customText = jQuery(this).val();
                saveConfig(); 
                // 注意：这里不需要重置粒子，下次绘制时会自动更新文字
            });

            jQuery('#ambient_color').on('input', function() { config.color = jQuery(this).val(); saveConfig(); });
            jQuery('#ambient_opacity').on('input', function() { config.opacity = parseFloat(jQuery(this).val()); saveConfig(); });
            jQuery('#ambient_size').on('input', function() { config.size = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_speed').on('input', function() { config.speed = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_wind').on('input', function() { config.wind = parseFloat(jQuery(this).val()); saveConfig(); resetParticles(); });
            jQuery('#ambient_count').on('input', function() { config.count = parseInt(jQuery(this).val()); saveConfig(); });
        }

        function saveConfig() { localStorage.setItem('st_ambient_config', JSON.stringify(config)); }
        function resetParticles() { particles = []; splashes = []; }

        initCanvas();
        const checkInterval = setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) {
                injectSettingsMenu();
            }
        }, 1000);
    }
})();
