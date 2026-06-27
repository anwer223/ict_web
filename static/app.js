// Wait for Three.js to load
function initThreeJS() {
    if (typeof THREE === 'undefined') {
        console.log('Three.js not loaded yet, retrying...');
        setTimeout(initThreeJS, 500);
        return;
    }

    console.log('Three.js loaded successfully!');

    // ============================================
    // DOM REFS
    // ============================================
    const posYEl = document.getElementById('posY');
    const statusTextEl = document.getElementById('statusText');
    const scanProgressEl = document.getElementById('scanProgress');
    const voltageFill = document.getElementById('voltageFill');
    const vEls = [document.getElementById('v1'), document.getElementById('v2'), document.getElementById('v3'), document.getElementById('v4'), document.getElementById('v5')];
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    const fpsCounter = document.getElementById('fps-counter');
    const container = document.getElementById('scene-container');
    const canvas = document.getElementById('three-canvas');

    // ============================================
    // THREE.JS SETUP
    // ============================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a18);
    scene.fog = new THREE.FogExp2(0x0a0a18, 0.004);

    const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(18, 12, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.zoomSpeed = 1.2;
    controls.target.set(2, 0.5, 0);
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 8;
    controls.maxDistance = 35;

    // ============================================
    // LIGHTING
    // ============================================
    const ambient = new THREE.AmbientLight(0x334466, 0.5);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    mainLight.position.set(10, 15, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-8, 5, -10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, 0.2);
    rimLight.position.set(-5, 3, 10);
    scene.add(rimLight);

    // ============================================
    // GROUND
    // ============================================
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.9 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.8;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(35, 30, 0x1a2a3a, 0x0a1a2a);
    grid.position.y = -0.79;
    scene.add(grid);

    // ============================================
    // TANK (Left side)
    // ============================================
    const tankW = 14, tankD = 12;
    const tankGroup = new THREE.Group();
    tankGroup.position.set(-5, 0, 0);
    scene.add(tankGroup);

    // Bottom
    const bottom = new THREE.Mesh(
        new THREE.BoxGeometry(tankW, 0.08, tankD),
        new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.4, roughness: 0.3 })
    );
    bottom.position.y = -0.4;
    bottom.receiveShadow = true;
    bottom.castShadow = true;
    tankGroup.add(bottom);

    // Water
    const water = new THREE.Mesh(
        new THREE.BoxGeometry(tankW - 0.6, 0.12, tankD - 0.6),
        new THREE.MeshPhysicalMaterial({
            color: 0x1a4a7a,
            transparent: true,
            opacity: 0.4,
            roughness: 0.1,
            metalness: 0
        })
    );
    water.position.y = -0.28;
    tankGroup.add(water);

    // Glass walls
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x88bbdd,
        transparent: true,
        opacity: 0.1,
        roughness: 0.05,
        metalness: 0,
        side: THREE.DoubleSide
    });
    const wallPositions = [
        { x: 0, z: tankD/2 + 0.04, sx: tankW, sz: 0.08 },
        { x: 0, z: -tankD/2 - 0.04, sx: tankW, sz: 0.08 },
        { x: tankW/2 + 0.04, z: 0, sx: 0.08, sz: tankD },
        { x: -tankW/2 - 0.04, z: 0, sx: 0.08, sz: tankD }
    ];
    wallPositions.forEach(p => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(p.sx, 0.5, p.sz), glassMat);
        wall.position.set(p.x, -0.15, p.z);
        tankGroup.add(wall);
    });

    // Electrodes
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0xcc8844,
        metalness: 0.85,
        roughness: 0.2
    });
    const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, tankD - 1), plateMat);
    leftPlate.position.set(-tankW/2 + 0.3, -0.25, 0);
    leftPlate.castShadow = true;
    leftPlate.receiveShadow = true;
    tankGroup.add(leftPlate);

    const rightPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, tankD - 1), plateMat);
    rightPlate.position.set(tankW/2 - 0.3, -0.25, 0);
    rightPlate.castShadow = true;
    rightPlate.receiveShadow = true;
    tankGroup.add(rightPlate);

    function makeLabel(text, pos, color) {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            color: ${color};
            font-size: 12px;
            font-weight: bold;
            font-family: monospace;
            background: rgba(0,0,0,0.6);
            padding: 2px 10px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
        `;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(pos);
        return label;
    }
    tankGroup.add(makeLabel('+12V', new THREE.Vector3(-tankW/2 + 0.3, 0.05, 0), '#ff8844'));
    tankGroup.add(makeLabel('0V', new THREE.Vector3(tankW/2 - 0.3, 0.05, 0), '#44ff88'));

    // ============================================
    // RAILS & CARRIAGE
    // ============================================
    const railMat = new THREE.MeshStandardMaterial({ color: 0x556688, metalness: 0.7, roughness: 0.3 });
    const railPositions = [{ x: -tankW/2 - 0.8, z: 0 }, { x: tankW/2 + 0.8, z: 0 }];
    railPositions.forEach(r => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, tankD + 3), railMat);
        rail.position.set(r.x, 0.45, r.z);
        rail.castShadow = true;
        rail.receiveShadow = true;
        tankGroup.add(rail);
    });

    const carriageGroup = new THREE.Group();
    carriageGroup.position.set(0, 0.55, 0);
    tankGroup.add(carriageGroup);

    const carriageMat = new THREE.MeshStandardMaterial({ color: 0x4488bb, metalness: 0.5, roughness: 0.3 });
    const carriagePlate = new THREE.Mesh(new THREE.BoxGeometry(tankW + 1.4, 0.12, 1.2), carriageMat);
    carriagePlate.castShadow = true;
    carriagePlate.receiveShadow = true;
    carriageGroup.add(carriagePlate);

    // ============================================
    // 5 PROBES ON CARRIAGE
    // ============================================
    const probeX = [-4.5, -2.25, 0, 2.25, 4.5];
    const probeColors = [0xff4444, 0xff8844, 0xffcc44, 0x44ff44, 0x44aaff];
    const probeGroup = new THREE.Group();
    probeGroup.position.set(0, 0.32, 0);
    carriageGroup.add(probeGroup);

    const probes = [];
    probeX.forEach((x, i) => {
        const group = new THREE.Group();
        group.position.set(x, 0, 0);

        const rod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
            new THREE.MeshStandardMaterial({ color: probeColors[i], metalness: 0.7 })
        );
        rod.position.y = -0.5;
        group.add(rod);

        const tip = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xff8844, metalness: 0.8 })
        );
        tip.position.y = -0.95;
        group.add(tip);

        const glow = new THREE.PointLight(probeColors[i], 0, 0.5);
        glow.position.y = -0.85;
        group.add(glow);

        probeGroup.add(group);
        probes.push({ group, glow });
    });

    // ============================================
    // BREADBOARD WITH ESP32 & COMPONENTS (Right side)
    // ============================================
    const electronicsGroup = new THREE.Group();
    electronicsGroup.position.set(7, 0.2, 0);
    scene.add(electronicsGroup);

    // Breadboard base
    const breadboardMat = new THREE.MeshStandardMaterial({
        color: 0x222233,
        roughness: 0.9,
        metalness: 0.1
    });
    const breadboard = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 4), breadboardMat);
    breadboard.position.y = 0;
    breadboard.receiveShadow = true;
    breadboard.castShadow = true;
    electronicsGroup.add(breadboard);

    // Breadboard grid lines (visual)
    const gridLineMat = new THREE.LineBasicMaterial({ color: 0x333344 });
    for (let x = -2.8; x <= 2.8; x += 0.3) {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0.1, -1.9),
            new THREE.Vector3(x, 0.1, 1.9)
        ]);
        const line = new THREE.Line(geo, gridLineMat);
        electronicsGroup.add(line);
    }
    for (let z = -1.8; z <= 1.8; z += 0.3) {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-2.9, 0.1, z),
            new THREE.Vector3(2.9, 0.1, z)
        ]);
        const line = new THREE.Line(geo, gridLineMat);
        electronicsGroup.add(line);
    }

    // ============================================
    // ESP32 MODULE
    // ============================================
    const esp32Mat = new THREE.MeshStandardMaterial({
        color: 0x1a3a1a,
        metalness: 0.3,
        roughness: 0.6
    });
    const esp32 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 1.2), esp32Mat);
    esp32.position.set(-1.8, 0.15, 0.5);
    esp32.castShadow = true;
    electronicsGroup.add(esp32);

    // ESP32 metal shield
    const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x888899,
        metalness: 0.8,
        roughness: 0.2
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.7), shieldMat);
    shield.position.set(-1.8, 0.22, 0.5);
    electronicsGroup.add(shield);

    // ESP32 pins (header)
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, metalness: 0.6 });
    for (let i = -0.4; i <= 0.4; i += 0.1) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6), pinMat);
        pin.position.set(-2.2 + i * 0.8, 0.18, 0.5);
        electronicsGroup.add(pin);
    }

    // ============================================
    // A4988 DRIVERS (2x)
    // ============================================
    const driverMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a3a,
        metalness: 0.4,
        roughness: 0.5
    });
    const driverPositions = [
        { x: -1.8, z: -1.2 },
        { x: -0.8, z: -1.2 }
    ];
    driverPositions.forEach(pos => {
        const driver = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.8), driverMat);
        driver.position.set(pos.x, 0.15, pos.z);
        driver.castShadow = true;
        electronicsGroup.add(driver);

        // Heatsink
        const heatsink = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.03, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })
        );
        heatsink.position.set(pos.x, 0.2, pos.z);
        electronicsGroup.add(heatsink);

        // Pins
        for (let i = -0.25; i <= 0.25; i += 0.1) {
            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 4), pinMat);
            pin.position.set(pos.x + i * 0.4, 0.13, pos.z + 0.35);
            electronicsGroup.add(pin);
        }
    });

    // ============================================
    // ADS1115 ADC MODULE
    // ============================================
    const adsMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a3a,
        metalness: 0.3,
        roughness: 0.5
    });
    const ads = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.7), adsMat);
    ads.position.set(0.2, 0.15, 0.5);
    electronicsGroup.add(ads);

    // ADS1115 pins
    for (let i = -0.2; i <= 0.2; i += 0.08) {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04, 4), pinMat);
        pin.position.set(0.2 + i * 0.5, 0.13, 0.85);
        electronicsGroup.add(pin);
    }

    // ============================================
    // MG995 SERVO
    // ============================================
    const servoMat = new THREE.MeshStandardMaterial({
        color: 0xaa8866,
        metalness: 0.3,
        roughness: 0.6
    });
    const servo = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.8), servoMat);
    servo.position.set(1.8, 0.15, 0.5);
    servo.castShadow = true;
    electronicsGroup.add(servo);

    // Servo horn
    const hornMat = new THREE.MeshStandardMaterial({
        color: 0xddaa88,
        metalness: 0.3,
        roughness: 0.5
    });
    const horn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.4), hornMat);
    horn.position.set(2.0, 0.15, 0.5);
    electronicsGroup.add(horn);

    // ============================================
    // RELAY MODULE (4-channel)
    // ============================================
    const relayMat = new THREE.MeshStandardMaterial({
        color: 0x2a1a1a,
        metalness: 0.3,
        roughness: 0.6
    });
    const relay = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.8), relayMat);
    relay.position.set(-0.3, 0.15, -0.5);
    relay.castShadow = true;
    electronicsGroup.add(relay);

    // Relay indicators (LEDs)
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.3 });
    for (let i = -0.3; i <= 0.3; i += 0.2) {
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ledMat);
        led.position.set(-0.3 + i * 0.6, 0.22, -0.5);
        electronicsGroup.add(led);
    }

    // ============================================
    // WIRING (visual connections)
    // ============================================
    const wireMat = new THREE.LineBasicMaterial({ color: 0xff8844 });

    function createWire(start, end, color = 0xff8844) {
        const points = [
            new THREE.Vector3(start.x, start.y + 0.05, start.z),
            new THREE.Vector3((start.x + end.x) / 2, start.y + 0.1, (start.z + end.z) / 2),
            new THREE.Vector3(end.x, end.y + 0.05, end.z)
        ];
        const curve = new THREE.CatmullRomCurve3(points);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color }));
        return line;
    }

    // Wire: ESP32 → A4988 (Left)
    const wire1 = createWire(
        { x: -2.0, y: 0.2, z: 0.5 },
        { x: -1.8, y: 0.2, z: -1.2 },
        0xff8844
    );
    electronicsGroup.add(wire1);

    // Wire: ESP32 → A4988 (Right)
    const wire2 = createWire(
        { x: -1.6, y: 0.2, z: 0.5 },
        { x: -0.8, y: 0.2, z: -1.2 },
        0x44ff88
    );
    electronicsGroup.add(wire2);

    // Wire: ESP32 → ADS1115 (I2C)
    const wire3 = createWire(
        { x: -1.4, y: 0.2, z: 0.5 },
        { x: 0.2, y: 0.2, z: 0.5 },
        0x4488ff
    );
    electronicsGroup.add(wire3);

    // Wire: ESP32 → Relay
    const wire4 = createWire(
        { x: -1.8, y: 0.2, z: 0.3 },
        { x: -0.3, y: 0.2, z: -0.5 },
        0xff44ff
    );
    electronicsGroup.add(wire4);

    // Wire: ESP32 → Servo (PWM)
    const wire5 = createWire(
        { x: -1.4, y: 0.2, z: 0.7 },
        { x: 1.8, y: 0.2, z: 0.5 },
        0xffaa44
    );
    electronicsGroup.add(wire5);

    // Wire: ADS1115 → Probes (analog inputs)
    for (let i = 0; i < 5; i++) {
        const color = [0xff4444, 0xff8844, 0xffcc44, 0x44ff44, 0x44aaff][i];
        const wire = createWire(
            { x: 0.2 + i * 0.08, y: 0.2, z: 0.7 },
            { x: -5 + probeX[i] * 1.2, y: 0.1, z: 0.5 },
            color
        );
        // Add to scene directly (going to tank)
        scene.add(wire);
    }

    // ============================================
    // LABELS FOR ELECTRONICS
    // ============================================
    electronicsGroup.add(makeLabel('ESP32', new THREE.Vector3(-1.8, 0.4, 0.5), '#88ff88'));
    electronicsGroup.add(makeLabel('A4988 x2', new THREE.Vector3(-1.3, 0.4, -1.2), '#ff8844'));
    electronicsGroup.add(makeLabel('ADS1115', new THREE.Vector3(0.2, 0.4, 0.5), '#4488ff'));
    electronicsGroup.add(makeLabel('MG995 Servo', new THREE.Vector3(1.8, 0.4, 0.5), '#ffaa44'));
    electronicsGroup.add(makeLabel('Relay 4CH', new THREE.Vector3(-0.3, 0.4, -0.5), '#ff4444'));

    // ============================================
    // STATE & SOCKET
    // ============================================
    let currentY = 0;
    let isScanning = false;

    const socket = io();
    socket.on('connect', () => console.log('SocketIO connected'));

    socket.on('position_update', (data) => {
        currentY = data.y;
        carriageGroup.position.z = currentY;
        posYEl.textContent = Math.round(currentY * 10) + ' mm';
    });

    socket.on('sensor_data', (data) => {
        const voltages = data.voltages;
        voltages.forEach((v, i) => {
            if (i < vEls.length) vEls[i].textContent = v.toFixed(1) + 'V';
        });
        const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
        voltageFill.style.width = (avg / 12) * 100 + '%';
        probes.forEach(p => {
            p.glow.intensity = 0.8;
            setTimeout(() => { p.glow.intensity = 0; }, 500);
        });
    });

    socket.on('scan_progress', (data) => {
        scanProgressEl.textContent = data.current + '/' + data.total;
    });

    socket.on('scan_complete', () => {
        isScanning = false;
        statusTextEl.textContent = 'Complete';
        scanProgressEl.textContent = 'Done';
    });

    // ============================================
    // CHAT
    // ============================================
    async function sendChat() {
        const q = chatInput.value.trim();
        if (!q) return;
        chatMessages.innerHTML += '<div class="user">' + q + '</div>';
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const resp = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q })
            });
            const data = await resp.json();
            if (data.answer) {
                chatMessages.innerHTML += '<div class="bot">' + data.answer + '</div>';
            } else {
                chatMessages.innerHTML += '<div class="bot">🤖 I didn\'t understand.</div>';
            }
        } catch (e) {
            chatMessages.innerHTML += '<div class="bot">🤖 Error connecting.</div>';
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ============================================
    // UI EVENTS
    // ============================================
    document.getElementById('btnHome').addEventListener('click', () => {
        socket.emit('move_to', { y: 0 });
        statusTextEl.textContent = 'Homed';
    });

    document.getElementById('btnScan').addEventListener('click', () => {
        if (isScanning) return;
        isScanning = true;
        statusTextEl.textContent = 'Scanning...';
        scanProgressEl.textContent = '0/7';
        socket.emit('start_scan', {});
    });

    document.getElementById('btnMeasure').addEventListener('click', () => {
        statusTextEl.textContent = 'Measuring...';
        const y = parseFloat(posYEl.textContent) / 10;
        const voltages = [-4.5, -2.25, 0, 2.25, 4.5].map(x => {
            const t = (y + 5) / 10;
            const base = 12 * (1 - t);
            const xNorm = (x + 6) / 12;
            return +(base * (0.75 + 0.25 * xNorm)).toFixed(2);
        });
        voltages.forEach((v, i) => vEls[i].textContent = v + 'V');
        const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
        voltageFill.style.width = (avg / 12) * 100 + '%';
        statusTextEl.textContent = 'Ready';
        probes.forEach(p => {
            p.glow.intensity = 0.8;
            setTimeout(() => { p.glow.intensity = 0; }, 500);
        });
    });

    document.getElementById('btnReset').addEventListener('click', () => {
        isScanning = false;
        statusTextEl.textContent = 'Ready';
        scanProgressEl.textContent = '0/7';
        voltageFill.style.width = '0%';
        vEls.forEach(el => el.textContent = '--');
        socket.emit('move_to', { y: 0 });
    });

    chatSend.addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });

    // ============================================
    // RESIZE & ANIMATION
    // ============================================
    function resize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        labelRenderer.setSize(w, h);
    }
    window.addEventListener('resize', resize);
    setTimeout(resize, 100);

    let frameCount = 0;
    let fpsTime = 0;

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);

        frameCount++;
        const now = performance.now();
        if (now - fpsTime > 1000) {
            fpsCounter.textContent = frameCount + ' FPS';
            frameCount = 0;
            fpsTime = now;
        }
    }
    animate();

    console.log('AESE Real Hardware Simulation loaded!');
}

// ============================================
// START
// ============================================
initThreeJS();
