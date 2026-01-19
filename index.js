(function() {
    setTimeout(() => {
        try {
            initAmbientPlugin();
        } catch (e) {
            console.error("Ambient Plugin Error:", e);
        }
    }, 500);

    function initAmbientPlugin() {
        const CONTAINER_ID = 'st-ambient-container';
        const MENU_ID = 'ambient-effects-menu';
        
        let config = {
            enabled: false,
            type: 'snow',
            speed: 2,
            size: 3,
            count: 50,
            color: '#ffffff'
        };

        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}

        // --- 核心：创建/更新粒子 ---
        function renderParticles() {
            let container = document.getElementById(CONTAINER_ID);
            if (!container) {
                container = document.createElement('div');
                container.id = CONTAINER_ID;
                document.body.appendChild(container);
            }

            if (!config.enabled) {
                container.innerHTML = '';
                return;
            }

            const currentParticles = container.getElementsByClassName('ambient-particle');
            const targetCount = config.count;

            while (currentParticles.length > targetCount) {
                container.removeChild(currentParticles[0]);
            }

            while (currentParticles.length < targetCount) {
                const p = document.createElement('div');
                p.className = 'ambient-particle';
                resetParticleStyle(p); // 初始化样式
                container.appendChild(p);
            }
            
            // 更新通用样式
            Array.from(currentParticles).forEach(p => {
                p.classList.remove('shape-snow', 'shape-star', 'shape-leaf', 'shape-flower');
                p.classList.add(`shape-${config.type}`);
                p.style.color = config.color;
            });
        }

        // --- 重置单个粒子的随机属性 ---
        function resetParticleStyle(p) {
            const left = Math.random() * 100; // 0-100vw
            
            // 速度算法
            const baseDuration = 10; 
            const duration = (baseDuration / config.speed) * (Math.random() * 0.5 + 0.5);
            
            // 负延迟，让动画一开始就布满屏幕
            const delay = Math.random() * 5 * -1; 
            
            // 大小算法
            const sizeBase = 5;
            const size = sizeBase * config.size * (Math.random() * 0.5 + 0.5);

            // 【核心修改】随机选择 3 种飘落轨迹之一
            // 这样雪花就不会直直落下了，而是有的左摇，有的右飘
            const animType = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            const animName = `fall-sway-${animType}`;

            p.style.left = `${left}vw`;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            
            // 应用随机轨迹
            p.style.animationName = animName;
            p.style.animationDuration = `${duration}s`;
            p.style.animationDelay = `${delay}s`;
        }

        // --- 菜单注入 ---
        function injectSettingsMenu() {
            const container = jQuery('#extensions_settings'); 
            if (container.length === 0 || jQuery(`#${MENU_ID}`).length) return;

            const html = `
                <div id="${MENU_ID}" class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>氛围特效❄️</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                    </div>
                    <div class="inline-drawer-content ambient-settings-box">
                        <div class="ambient-desc">GPU加速渲染 | 自然飘落</div>
                        
                        <div class="ambient-control-row">
                            <label>启用特效</label>
                            <input type="checkbox" id="ambient_enabled" ${config.enabled ? 'checked' : ''}>
                        </div>
                        <div class="ambient-control-row">
                            <label>特效类型</label>
                            <select id="ambient_type">
                                <option value="snow">❄️ 吹雪</option>
                                <option value="star">✨ 落星</option>
                                <option value="leaf">🍃 飘叶</option>
                                <option value="flower">💐 飞花</option>
                            </select>
                        </div>
                        <div class="ambient-control-row">
                            <label>颜色</label>
                            <input type="color" id="ambient_color" value="${config.color}">
                        </div>
                        <div class="ambient-control-row">
                            <label>粒子大小</label>
                            <input type="range" id="ambient_size" min="0.5" max="5" step="0.1" value="${config.size}">
                        </div>
                        <div class="ambient-control-row">
                            <label>飘落速度</label>
                            <input type="range" id="ambient_speed" min="0.5" max="5" step="0.1" value="${config.speed}">
                        </div>
                        <div class="ambient-control-row">
                            <label>粒子密度</label>
                            <input type="range" id="ambient_count" min="10" max="200" step="10" value="${config.count}">
                        </div>
                    </div>
                </div>
            `;

            container.append(html);

            jQuery(`#${MENU_ID} .inline-drawer-toggle`).on('click', function() {
                jQuery(this).closest('.inline-drawer').toggleClass('expanded');
            });

            const updateAndSave = () => {
                saveConfig();
                renderParticles();
            };

            jQuery('#ambient_enabled').on('change', function() { config.enabled = jQuery(this).is(':checked'); updateAndSave(); });
            
            jQuery('#ambient_type').on('change', function() { 
                config.type = jQuery(this).val();
                if(config.type === 'leaf') config.color = '#88cc88';
                else if(config.type === 'flower') config.color = '#ffb7b2';
                else if(config.type === 'snow') config.color = '#ffffff';
                else if(config.type === 'star') config.color = '#fff6cc';
                jQuery('#ambient_color').val(config.color);
                
                // 切换类型时，强制刷新 DOM 以重置轨迹和形状
                document.getElementById(CONTAINER_ID).innerHTML = '';
                updateAndSave(); 
            });

            jQuery('#ambient_color').on('input', function() { config.color = jQuery(this).val(); updateAndSave(); });
            
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('input', function() {
                config.size = parseFloat(jQuery('#ambient_size').val());
                config.speed = parseFloat(jQuery('#ambient_speed').val());
                config.count = parseInt(jQuery('#ambient_count').val());
                saveConfig();
            });
            
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('change', function() {
                 document.getElementById(CONTAINER_ID).innerHTML = ''; 
                 renderParticles();
            });
        }

        function saveConfig() { localStorage.setItem('st_ambient_config', JSON.stringify(config)); }

        // --- 启动 ---
        renderParticles();
        setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) {
                injectSettingsMenu();
            }
        }, 1000);
    }
})();
