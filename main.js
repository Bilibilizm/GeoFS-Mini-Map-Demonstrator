// ==UserScript==
// @name         GeoFS mini map
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  nothing
// @author      bilibili蜂蜜水的冬日航线123
// @match       http://*/geofs.php*
// @match       https://*/geofs.php*
// @grant        none


// ==/UserScript==
(function() {
    'use strict';

    function injectScript(fn) {
        const script = document.createElement('script');
        script.textContent = `(${fn.toString()})();`;
        document.documentElement.appendChild(script);
        script.remove();
    }

    function main() {
        // 绕过
        (function () {
            'use strict';
            var asddda = 0;

            function updateExperiment() {
                if (typeof L === 'undefined') {
                    console.log('Leaflet库未加载，无法初始化地图');
                } else if (typeof L != 'undefined' && asddda >= 5) {
                    console.log('初始化地图成功');
                } else if (typeof L != 'undefined' && asddda < 5) {
                    asddda += 1;

                    // 配置参数集中管理
                    const CONFIG = {
                        animateView: true,      // 改为控制是否启用动画
                        trackingMode: 'strict', // 强制严格跟踪模式
                        updateInterval: 100,    // 提高更新频率
                        mapContainer: {
                            id: 'geoFsLiveMap',
                            style: {
                                height: '200px',
                                width: '20%',
                                position: 'fixed',
                                top: '0%',       // 默认在左上角
                                left: '0%',
                                transform: 'translate(0%, 0%)',
                                zIndex: 9999,
                                borderRadius: '10px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                backgroundColor: '#f8f9fa'
                            }
                        },
                        smoothPan: true,     // 启用平滑移动
                        mapProviders: {
                            osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap'
                            }),
                            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                                attribution: '© Esri'
                            })
                        }
                    };

                    // 等待地理数据就绪
                    async function checkDataReady() {
                        const MAX_WAIT_TIME = 5000; // 最大等待时间5秒
                        const startTime = Date.now();

                        return new Promise((resolve, reject) => {
                            const check = () => {
                                const aircraftData = window.geofs?.aircraft?.instance;
                                if (aircraftData?.llaLocation && aircraftData.animationValue?.heading360 !== undefined) {
                                    resolve();
                                } else if (Date.now() - startTime > MAX_WAIT_TIME) {
                                    reject(new Error('等待飞行数据超时'));
                                } else {
                                    setTimeout(check, 100);
                                }
                            };
                            check();
                        });
                    }

                    // 创建地图容器
                    function createMapContainer() {
                        const existing = document.getElementById(CONFIG.mapContainer.id);
                        if (existing) existing.remove();

                        const container = document.createElement('div');
                        container.id = CONFIG.mapContainer.id;
                        Object.assign(container.style, CONFIG.mapContainer.style);
                        document.body.appendChild(container);

                        // 添加可拖动功能
                        let isDragging = false;
                        let offsetX, offsetY;

                        container.addEventListener('mousedown', (e) => {
                            if (e.target.classList.contains('leaflet-control-layers')) return; // 防止拖动图层控制
                            isDragging = true;
                            offsetX = e.clientX - container.getBoundingClientRect().left;
                            offsetY = e.clientY - container.getBoundingClientRect().top;
                        });

                        document.addEventListener('mousemove', (e) => {
                            if (isDragging) {
                                container.style.left = `${e.clientX - offsetX}px`;
                                container.style.top = `${e.clientY - offsetY}px`;
                            }
                        });

                        document.addEventListener('mouseup', () => {
                            isDragging = false;
                        });

                        return container;
                    }

                    // 自定义飞机图标
                    function createAircraftIcon() {
                        return L.divIcon({
                            className: 'aircraft-marker',
                            html: `
                            <div class="aircraft-wrapper">
                                <div class="direction-arrow"></div>
                                <div class="position-circle"></div>
                            </div>
                        `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    }

                    // 创建自定义图层切换按钮
                    function createCustomLayerSwitch(map) {
                        const button = document.createElement('button');
                        button.textContent = 'Map display';
                        button.style.position = 'absolute';
                        button.style.top = '10px';
                        button.style.right = '10px';
                        button.style.zIndex = '10001';
                        button.style.padding = '5px 10px';
                        button.style.fontSize = '14px';
                        button.style.backgroundColor = '#3498db';
                        button.style.color = 'white';
                        button.style.border = 'none';
                        button.style.borderRadius = '5px';
                        button.style.cursor = 'pointer';
                        button.title = 'Switch between Map display and Satellite display';

                        button.addEventListener('click', () => {
                            if (button.textContent === 'Map display') {
                                map.removeLayer(CONFIG.mapProviders.satellite);
                                map.addLayer(CONFIG.mapProviders.osm);
                                button.textContent = 'Satellite display';
                            } else {
                                map.removeLayer(CONFIG.mapProviders.osm);
                                map.addLayer(CONFIG.mapProviders.satellite);
                                button.textContent = 'Map display';
                            }
                        });

                        map.getContainer().appendChild(button);
                    }

                    // 主初始化函数
                    async function initFlightMap() {
                        try {
                            // 数据准备
                            await checkDataReady();
                            const aircraft = geofs.aircraft.instance;

                            // 创建地图容器
                            const container = createMapContainer();

                            // 初始化地图
                            const map = L.map(container.id, {
                                layers: [CONFIG.mapProviders.osm],
                                fadeAnimation: false,
                                preferCanvas: true
                            }).setView([aircraft.llaLocation[0], aircraft.llaLocation[1]], 14);

                            // 创建自定义图层切换按钮
                            createCustomLayerSwitch(map);

                            // 创建飞机标记
                            const aircraftIcon = createAircraftIcon();
                            const marker = L.marker(
                                [aircraft.llaLocation[0], aircraft.llaLocation[1]],
                                {
                                    icon: aircraftIcon,
                                    rotationOrigin: 'center center',
                                    rotationAngle: aircraft.animationValue.heading360
                                }
                            ).addTo(map);

                            // 实时更新逻辑
                            let lastUpdate = 0;
                            const updatePosition = () => {
                                const now = Date.now();
                                if (now - lastUpdate < CONFIG.updateInterval) return;

                                try {
                                    const newLat = aircraft.llaLocation[0];
                                    const newLng = aircraft.llaLocation[1];
                                    const newHeading = aircraft.animationValue.heading360;

                                    // 强制更新地图中心
                                    map.setView([newLat, newLng], map.getZoom(), {
                                        animate: CONFIG.animateView, // 由配置控制动画
                                        duration: 0.3,               // 更短动画时间
                                        easeLinearity: 0.1
                                    });

                                    // 更新标记位置
                                    marker.setLatLng([newLat, newLng])
                                        .setRotationAngle(newHeading);

                                    lastUpdate = now;
                                } catch (e) {
                                    console.warn('位置更新失败:', e);
                                }
                            };

                            // 使用 RAF 优化性能
                            const animateUpdate = () => {
                                requestAnimationFrame(animateUpdate);
                                updatePosition();
                            };
                            animateUpdate();

                            // 窗口大小调整处理
                            const resizeHandler = () => map.invalidateSize({ debounceMoveend: true });
                            window.addEventListener('resize', resizeHandler);

                        } catch (error) {
                            console.error('飞行地图初始化失败:', error);
                            const container = document.getElementById(CONFIG.mapContainer.id);
                            if (container) {
                                container.innerHTML = `
                                <div style="
                                    padding: 15px;
                                    color: #dc3545;
                                    background: #fff;
                                    border-radius: 8px;
                                    text-align: center;
                                ">
                                    ✈️ 地图加载失败: ${error.message}
                                </div>
                            `;
                            }
                        }
                    }

                    // 注入样式
                    const style = document.createElement('style');
                    style.textContent = `
                        .aircraft-marker {
                            transition: transform 0.5s ease-out;
                        }
                        .direction-arrow {
                            width: 0;
                            height: 0;
                            border-left: 12px solid transparent;
                            border-right: 12px solid transparent;
                            border-bottom: 24px solid #e74c3c;
                            position: absolute;
                            top: 2px;
                            left: 50%;
                            transform: translateX(-50%);
                            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                        }
                        .position-circle {
                            width: 10px;
                            height: 10px;
                            background: #2c3e50;
                            border-radius: 50%;
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            border: 2px solid white;
                        }
                    `;
                    document.head.appendChild(style);

                    // 使用 Alt+M 打开/关闭地图
                    document.addEventListener('keydown', (e) => {
                        if (e.altKey && e.code === 'KeyM') {
                            const container = document.getElementById(CONFIG.mapContainer.id);
                            if (container.style.display === 'none') {
                                container.style.display = 'block';
                            } else {
                                container.style.display = 'none';
                            }
                        }
                    });

                    // 启动初始化
                    if (document.readyState === 'complete') {
                        initFlightMap();
                    } else {
                        window.addEventListener('load', () => {
                            initFlightMap();
                        });
                    }
                }
            }
            setInterval(updateExperiment, 2000);
        })();
        console.log("GeoFS Mini Map addon have been added");
    }

    injectScript(main);
})();
