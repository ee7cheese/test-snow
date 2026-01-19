(function() {
    // 延迟启动，安全第一
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
        
        // 默认配置
        let config = {
            enabled: false,
            type: 'snow',
            speed: 2,
            size: 3,
            count: 50, // CSS模式下建议数量稍微少一点，效果更好
            color: '#ffffff'
        };

        try {
            const saved = localStorage.getItem('st_ambient_config');
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch (err) {}

        // --- 核心：创建/更新粒子 ---
        function renderParticles() {
            // 1. 找到或创建容器
            let container = document.getElementById(CONTAINER_ID);
            if (!container) {
                container = document.createElement('div');
                container.id = CONTAINER_ID;
                document.body.appendChild(container);
            }

            // 2. 如果关闭，清空容器并退出
            if (!config.enabled) {
                container.innerHTML = '';
                return;
            }

            // 3. 计算需要的粒子数量
            const currentParticles = container.getElementsByClassName('ambient-particle');
            const targetCount = config.count;

            // 数量多了就删
            while (currentParticles.length > targetCount) {
                container.removeChild(currentParticles[0]);
            }

            // 数量少了就加
            while (currentParticles.length < targetCount) {
                const p = document.createElement('div');
                // 赋予基础类名
                p.className = 'ambient-particle';
                resetParticleStyle(p);
                container.appendChild(p);
            }
            
            // 4. 更新所有粒子的通用样式（颜色、类型）
            // 这样修改颜色时不需要刷新就能生效
            Array.from(currentParticles).forEach(p => {
                // 清除旧的形状类名
                p.classList.remove('shape-snow', 'shape-star', 'shape-leaf', 'shape-flower');
                // 添加新的形状类名
                p.classList.add(`shape-${config.type}`);
                p.style.color = config.color;
            });
        }

        // 重置单个粒子的随机属性 (位置、速度、大小)
        function resetParticleStyle(p) {
            const left = Math.random() * 100; // 0-100vw
            
            // 速度算法：基础 10秒，除以速度倍率。速度越大，时间越短
            const baseDuration = 10; 
            const duration = (baseDuration / config.speed) * (Math.random() * 0.5 + 0.5);
            
            const delay = Math.random() * 5 * -1; // 负延迟，让动画一开始就布满屏幕
            
            // 大小算法
            const sizeBase = 5; // 基础像素
            const size = sizeBase * config.size * (Math.random() * 0.5 + 0.5);

            p.style.left = `${left}vw`;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.animationName = 'ambient-fall';
            p.style.animationDuration = `${duration}s`;
            p.style.animationDelay = `${delay}s`;
        }

        // --- 菜单注入 (保持不变) ---
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
                        <div class="ambient-desc">GPU加速渲染 | 零卡顿</div>
                        
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

            // 绑定事件：修改配置后立即刷新 DOM
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
                
                // 切换类型时，为了重置形状，我们清空容器强制重绘
                document.getElementById(CONTAINER_ID).innerHTML = '';
                updateAndSave(); 
            });

            jQuery('#ambient_color').on('input', function() { config.color = jQuery(this).val(); updateAndSave(); });
            
            // 拖动滑块时，只更新配置，松开时再重绘(防抖)？或者直接重绘
            // 这里为了响应速度，我们在 input 事件里只更新非DOM属性，change里重绘
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('input', function() {
                config.size = parseFloat(jQuery('#ambient_size').val());
                config.speed = parseFloat(jQuery('#ambient_speed').val());
                config.count = parseInt(jQuery('#ambient_count').val());
                saveConfig();
            });
            
            // 当滑块松开时，才触发大规模重排，防止卡顿
            jQuery('#ambient_size, #ambient_speed, #ambient_count').on('change', function() {
                 document.getElementById(CONTAINER_ID).innerHTML = ''; // 暴力重置以应用新速度/大小
                 renderParticles();
            });
        }

        function saveConfig() { localStorage.setItem('st_ambient_config', JSON.stringify(config)); }

        // --- 启动 ---
        // 初始渲染
        renderParticles();
        
        // 注入菜单
        setInterval(() => {
            if (jQuery('#extensions_settings').length > 0) {
                injectSettingsMenu();
            }
        }, 1000);
    }
})();
