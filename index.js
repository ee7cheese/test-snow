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
            count: 50,
            color: '#ffffff'
        };

        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}

        // --- 核心：DOM 生成器 ---
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

            // 清空旧的，重新生成 (这是最稳妥的更新方式)
            container.innerHTML = '';
            
            // 文档片段，性能优化
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < config.count; i++) {
                // 外层：控制下落
                const wrapper = document.createElement('div');
                wrapper.className = 'ambient-wrapper';
                
                // 内层：控制形状和摇摆
                const inner = document.createElement('div');
                inner.className = `ambient-inner shape-${config.type}`;
                
                // 设置通用样式
                inner.style.color = config.color;
                
                // --- 随机物理参数 ---
                const left = Math.random() * 100; // 0-100vw
                const sizeBase = 5;
                const size = sizeBase * config.size * (Math.random() * 0.5 + 0.5);
                
                // 速度：CSS动画时间 = 基础时间 / 速度倍率
                // 给个随机扰动，别让大家一起掉下来
                const fallDuration = (10 / config.speed) * (Math.random() * 0.4 + 0.8);
                const fallDelay = Math.random() * 10 * -1; // 负延迟，开局即满屏
                
                // 摇摆：随机选一种摇摆动画，且摇摆时间与下落时间不同步，制造混沌感
                const swayType = Math.floor(Math.random() * 3) + 1; 
                const swayDuration = Math.random() * 3 + 2; // 2-5秒摇一次
                
                // 应用样式
                wrapper.style.left = `${left}vw`;
                wrapper.style.width = `${size}px`;
                wrapper.style.height = `${size}px`;
                wrapper.style.animationDuration = `${fallDuration}s`;
                wrapper.style.animationDelay = `${fallDelay}s`;
                
                inner.style.animationName = `ambient-sway-${swayType}`;
                inner.style.animationDuration = `${swayDuration}s`;
                // 内层透明度随机，增加层次感
                inner.style.opacity = Math.random() * 0.5 + 0.5;

                wrapper.appendChild(inner);
                fragment.appendChild(wrapper);
            }
            
            container.appendChild(fragment);
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
                        <div class="ambient-desc">合成线程渲染 | 永不卡顿</div>
                        
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

            // 防抖更新函数
            const update = () => {
                saveConfig();
                renderParticles();
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
            
            // 滑块拖动时只更新数据，松手才重绘 (性能优化)
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('input', function() {
                config.size = parseFloat(jQuery('#ambient_size').val());
                config.speed = parseFloat(jQuery('#ambient_speed').val());
                config.count = parseInt(jQuery('#ambient_count').val());
                saveConfig();
            });
            
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('change', function() {
                 update();
            });
        }

        function saveConfig() { localStorage.setItem('st_ambient_config', JSON.stringify(config)); }

        // --- 启动 ---
        renderParticles();
        setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) injectSettingsMenu();
        }, 1000);
    }
})();
