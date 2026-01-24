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
        
        // --- 默认配置 (已修改默认emoji为❄️) ---
        let config = {
            enabled: false,
            type: 'snow',
            speed: 2,
            size: 3,
            count: 100,
            wind: 0,
            opacity: 0.7,
            customText: '❄️',     // 修改：默认自定义文字为雪花
            customImage: '',
            color: '#ffffff'
        };

        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) { console.log('读取配置失败'); }

        // --- 1. 资源预加载 ---
        let userImgObj = new Image();
        if (config.customImage) userImgObj.src = config.customImage;

        // --- 2. 粒子系统 ---
        let ctx, particles = [], splashes = [], w, h, animationFrame;

        // === 水花类 (增强版) ===
        class Splash {
            constructor(x, y, color) {
                this.x = x; 
                this.y = y; 
                this.color = color;
                this.size = Math.random() * 1.5 + 0.5;
                
                // 横向散开范围变大
                this.speedX = (Math.random() - 0.5) * 6 + (config.wind * 0.1); 
                
                // 修改：向上跳得更高 (数值越大跳得越高，负数代表向上)
                // 之前是 -1 ~ -4，现在改为 -3 ~ -7
                this.speedY = -Math.random() * 4 - 3;   
                
                this.opacity = 1.0;
                // 重力稍微调小一点点，让它滞空久一点
                this.gravity = 0.15; 
            }
            update() {
                this.speedY += this.gravity;
                this.y += this.speedY; 
                this.x += this.speedX;
                // 修改：消失速度变慢，配合跳跃高度
                this.opacity -= 0.025; 
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

                // === 边界重置 ===
                if (this.y > h) {
                    if (config.type === 'rain' && config.enabled) this.createSplash(this.x, h);
                    this.reset();
                }
                else if ((this.x > w + 20 && config.wind >= 0) || (this.x < -20 && config.wind <= 0)) {
                    this.reset();
                    this.x = Math.random() * (w + 200) - 100; 
                }
            }

            createSplash(x, y) {
                if (Math.random() > 0.5) return; 
                // 修改：增加溅起的水珠数量 (3 到 6 个)
                const count = Math.floor(Math.random() * 4) + 3;
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
                    case 'custom': this.drawCustomText(ctx, this.size); break;
                    case 'image': this.drawImage(ctx, this.size); break;
                    default:
                        ctx.beginPath();
                        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                        ctx.shadowBlur = 5; ctx.shadowColor = config.color; ctx.fill();
                        break;
                }
                ctx.restore();
            }

            // === 绘制逻辑区 ===
            drawImage(c, r) {
                if (userImgObj.complete && userImgObj.naturalHeight !== 0) {
                    const s = r * 4; 
                    c.drawImage(userImgObj, -s/2, -s/2, s, s);
                } else {
                    c.font = `${r*3}px sans-serif`;
                    c.textAlign = "center";
                    c.textBaseline = "middle";
                    c.fillText("?", 0, 0);
                }
            }

            drawCustomText(c, r) {
                const fontSize = Math.max(10, r * 4); 
                c.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                c.textAlign = "center";
                c.textBaseline = "middle";
                c.fillText(config.customText, 0, 0);
            }

            drawRain(c, r) { c.beginPath(); c.rect(0, 0, r * 0.4, r * 8); c.fill(); }
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

                if (config.type === 'rain') {
                    for (let i = splashes.length - 1; i >= 0; i--) {
                        let s = splashes[i];
                        s.update(); s.draw();
                        if (s.opacity <= 0) splashes.splice(i, 1);
                    }
                } else { if(splashes.length > 0) splashes = []; }
            } else { particles = []; splashes = []; }
            animationFrame = requestAnimationFrame(loop);
        }

        // --- 2. 菜单注入逻辑 ---
        function injectSettingsMenu() {
            const container = jQuery('#extensions_settings'); 
            if (container.length === 0 || jQuery(`#${MENU_ID}`).length) return;

            const showText = config.type === 'custom' ? 'flex' : 'none';
            const showImg = config.type === 'image' ? 'flex' : 'none';

            // 修改：完全按照要求的顺序和名称
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
                                <option value="rain">🌧️ 下雨天</option>
                                <option value="star">✨ 闪烁星光</option>
                                <option value="leaf">🍃 飘落树叶</option>
                                <option value="flower">💐 飞舞花瓣</option>
                                <option value="custom">🪩 自定义emoji</option> 
                                <option value="image">🖼️ 自定义图片</option>
                            </select>
                        </div>
                        
                        <!-- 文字输入框 -->
                        <div class="ambient-control-row" id="ambient_custom_row" style="display: ${showText}">
                            <label>图案内容</label>
                            <input type="text" id="ambient_custom_text" value="${config.customText}" placeholder="输入Emoji或文字" style="text-align:right">
                        </div>

                        <!-- 图片URL输入框 -->
                        <div class="ambient-control-row" id="ambient_image_row" style="display: ${showImg}">
                            <label>图片链接</label>
                            <input type="text" id="ambient_custom_image" value="${config.customImage}" placeholder="粘贴图片URL (https://...)" style="text-align:right; width: 60%;">
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
                
                // 切换菜单显示
                if (config.type === 'custom') {
                    jQuery('#ambient_custom_row').slideDown();
                    jQuery('#ambient_image_row').slideUp();
                } else if (config.type === 'image') {
                    jQuery('#ambient_custom_row').slideUp();
                    jQuery('#ambient_image_row').slideDown();
                } else {
                    jQuery('#ambient_custom_row').slideUp();
                    jQuery('#ambient_image_row').slideUp();
                }

                // 预设颜色逻辑
                if(config.type === 'leaf') config.color = '#88cc88';
                else if(config.type === 'flower') config.color = '#ffb7b2';
                else if(config.type === 'snow') config.color = '#ffffff';
                else if(config.type === 'star') config.color = '#fff6cc';
                else if(config.type === 'rain') config.color = '#cccccc';
                else if(config.type === 'custom' || config.type === 'image') config.color = '#ffffff'; 
                
                jQuery('#ambient_color').val(config.color);
                saveConfig(); 
                resetParticles(); 
            });

            jQuery('#ambient_custom_text').on('input', function() {
                config.customText = jQuery(this).val();
                saveConfig(); 
            });

            let imgTimeout;
            jQuery('#ambient_custom_image').on('input', function() {
                const url = jQuery(this).val();
                config.customImage = url;
                saveConfig();
                clearTimeout(imgTimeout);
                imgTimeout = setTimeout(() => { userImgObj.src = url; }, 500);
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
