// ===============================================
// Professional Enterprise Server Simulator (V3.0)
// ===============================================

// =================== 1. Config & DB Management ===================
const DB_NAME = 'ServerSimDB';
const DB_VERSION = 4;
let db = null;
let ENCRYPT = false;
let ENC_KEY = null; 
let AUTO_SCALE = false;
const ORIGINAL_SERVERS = new Set();
let IS_DARK_THEME = true;
let LAST_SCALE_TS = 0;
let SELECTED_SERVER_ID = null;
let LOG_FILTER_LEVEL = 'ALL';
let SIMULATION_INTERVAL = null; 

// Lấy giá trị cấu hình động từ UI
const CPU_THRESHOLD_UP = () => parseInt(document.getElementById('autoScaleThresholdUp').value, 10) || 85;
const CPU_THRESHOLD_DOWN = () => parseInt(document.getElementById('autoScaleThresholdDown').value, 10) || 25;
const COOLDOWN_PERIOD_SECONDS = () => parseInt(document.getElementById('autoScaleCooldown').value, 10) || 30;

// Hàm tiện ích cho IndexedDB
async function setConfig(key, value) {
    try {
        await tx('config', 'readwrite').put({ key, value });
    } catch (e) {
        console.error(`Failed to set config ${key}:`, e);
    }
}

async function getConfig(key, defaultValue) {
    return new Promise((res) => {
        const req = tx('config').get(key);
        req.onsuccess = (e) => res(e.target.result ? e.target.result.value : defaultValue);
        req.onerror = () => res(defaultValue);
    });
}

async function loadConfig() {
    // Load trạng thái cấu hình từ DB (chủ yếu là trạng thái UI)
    ENCRYPT = await getConfig('ENCRYPT', false);
    IS_DARK_THEME = await getConfig('IS_DARK_THEME', true);
    AUTO_SCALE = await getConfig('AUTO_SCALE', false);

    // FIX/IMPROVEMENT: Load và import encryption key (JWK format)
    const jwkKey = await getConfig('ENC_KEY_JWK', null);
    if (ENCRYPT && jwkKey) {
        try {
            ENC_KEY = await crypto.subtle.importKey(
                "jwk",
                jwkKey,
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
        } catch (e) {
            saveLogEntry('CRITICAL', `Failed to import encryption key. Encryption disabled. Error: ${e.message}`);
            ENCRYPT = false; // Disable if key fails to load
            await setConfig('ENCRYPT', false);
            await setConfig('ENC_KEY_JWK', null);
        }
    }

    document.getElementById('toggleEncrypt').textContent = ENCRYPT ? 'Disable Encryption' : 'Enable Encryption';
    document.getElementById('themeToggle').textContent = IS_DARK_THEME ? 'Light Theme' : 'Dark Theme';
    document.getElementById('autoScaleToggle').textContent = `Auto-Scale: ${AUTO_SCALE ? 'ON' : 'OFF'}`;
}

async function openDB() {
    return new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, DB_VERSION);
        r.onupgradeneeded = (e) => {
            const idb = e.target.result;
            if (!idb.objectStoreNames.contains('logs')) idb.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
            if (!idb.objectStoreNames.contains('servers')) idb.createObjectStore('servers', { keyPath: 'id' });
            if (!idb.objectStoreNames.contains('metrics')) idb.createObjectStore('metrics', { keyPath: 'ts' });
            if (!idb.objectStoreNames.contains('config')) idb.createObjectStore('config', { keyPath: 'key' });
        };
        r.onsuccess = (e) => { db = e.target.result; res(db); };
        r.onerror = (e) => rej(e.target.error);
    })
}

function tx(storeName, mode = 'readonly') {
    if (!db) throw new Error('DB not opened');
    return db.transaction([storeName], mode).objectStore(storeName)
}

// Hàm mã hóa/giải mã
async function encryptData(data) {
    if (!ENCRYPT || !ENC_KEY) return JSON.stringify(data);
    const textEncoder = new TextEncoder();
    const dataBuffer = textEncoder.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        ENC_KEY,
        dataBuffer
    );
    return JSON.stringify({ e: btoa(String.fromCharCode(...new Uint8Array(encrypted))), iv: btoa(String.fromCharCode(...iv)) });
}

async function decryptData(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string' || encryptedData.charAt(0) !== '{') return encryptedData; 
    if (!ENC_KEY) return `[ENCRYPTED] Requires key for decryption.`;

    try {
        const parsed = JSON.parse(encryptedData);
        if (!parsed.e || !parsed.iv) return encryptedData;
        const cipherText = new Uint8Array(atob(parsed.e).split('').map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(parsed.iv).split('').map(c => c.charCodeAt(0)));
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            ENC_KEY,
            cipherText
        );
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        // showToast(`Decryption Error: ${error.message}. Logs might be unreadable.`, 'CRITICAL');
        return `[DECRYPTION FAILED] Corrupt or wrong key.`;
    }
}

// Cải tiến: Key Rotation (Re-Encryption)
async function reEncryptAll(newKey) {
    showToast("Starting key rotation and re-encryption...", 'INFO');
    ENC_KEY = newKey; 
    
    let logTx = tx('logs', 'readwrite');
    let logCursorRequest = logTx.openCursor();
    let logCount = 0;
    logCursorRequest.onsuccess = async (e) => {
        const cursor = e.target.result;
        if (cursor) {
            try {
                let decryptedText;
                try {
                    decryptedText = await decryptData(cursor.value.encryptedData);
                } catch {
                    decryptedText = cursor.value.encryptedData; 
                }

                let logData;
                try {
                    logData = JSON.parse(decryptedText);
                } catch {
                    logData = { ts: cursor.value.ts, level: 'CRITICAL', message: `Corrupt log data at ID ${cursor.value.id}` };
                }

                const newEncryptedData = await encryptData(logData);
                const updatedLog = { ...cursor.value, encryptedData: newEncryptedData };
                cursor.update(updatedLog);
                logCount++;
            } catch (err) {
                saveLogEntry('CRITICAL', `Failed to re-encrypt log ID ${cursor.value.id}: ${err.message}`);
            }
            cursor.continue();
        } else {
            saveLogEntry('INFO', `Key Rotation: Re-encrypted ${logCount} log entries.`);
            // FIX: Export key to JWK and store
            const jwk = await crypto.subtle.exportKey("jwk", newKey);
            await setConfig('ENC_KEY_JWK', jwk); 
        }
    };
}

// IMPROVEMENT: Implement full IndexedDB backup
async function backupDB() {
    showToast("Starting database backup...", 'INFO');
    try {
        const servers = await tx('servers').getAll();
        const config = await tx('config').getAll();
        
        // Export recent 100 logs (avoid huge file size)
        const logs = await getLogs('ALL', 100); 
        
        const backupData = {
            version: DB_VERSION,
            timestamp: Date.now(),
            servers: servers,
            config: config,
            recent_logs: logs
        };

        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `server_sim_backup_${new Date().toISOString().replace(/:/g, '-')}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Database backup successful! Exported to JSON.", 'SUCCESS');

    } catch (e) {
        saveLogEntry('CRITICAL', `Database backup failed: ${e.message}`);
        showToast(`Database backup failed: ${e.message}`, 'CRITICAL');
    }
}


// =================== 2. Server/State Management ===================
async function getServerState(id) {
    const serverTx = tx('servers');
    const server = await new Promise((res) => {
        const req = serverTx.get(id);
        req.onsuccess = (e) => res(e.target.result);
        req.onerror = () => res(null);
    });
    return server;
}

async function getAllServers() {
    return new Promise((res) => {
        const req = tx('servers').getAll();
        req.onsuccess = (e) => res(e.target.result);
        req.onerror = () => res([]);
    });
}

async function updateServer(id, data) {
    const store = tx('servers', 'readwrite');
    const server = await getServerState(id);
    if (!server) return;
    
    // Logic Provisioning Delay (MỚI)
    if (data.status && data.status === 'ok' && server.status === 'booting') {
        saveLogEntry('INFO', `Server ${server.name} (${id}) is now fully operational (OK).`, id);
    }

    const updated = { ...server, ...data };
    store.put(updated);
    renderServers();
}

function generateNewIP() {
    const segment = () => Math.floor(Math.random() * 255);
    return `192.168.1.${segment()}`;
}

async function addServer() {
    const servers = await getAllServers();
    const id = `server-${Date.now()}`;
    const newServer = {
        id,
        name: `Server ${String.fromCharCode(65 + servers.length)}`,
        ip: generateNewIP(),
        status: 'booting', // Trạng thái khởi động (MỚI)
        cpu: 0,
        ram: 0,
        ts: Date.now()
    };
    ORIGINAL_SERVERS.add(id);
    await tx('servers', 'readwrite').add(newServer);
    saveLogEntry('INFO', `New Server ${newServer.name} added. Status: booting.`, id);
    
    // Mô phỏng Provisioning Delay (5 giây để boot)
    setTimeout(() => {
        updateServer(id, { status: 'ok' });
    }, 5000); 
}

// =================== 3. Metrics & Auto-Scaling ===================

async function saveLogEntry(level, message, scopeId = 'SYSTEM') {
    const ts = Date.now();
    const logEntry = { ts, level, message, scopeId };
    
    if (level === 'CRITICAL' || level === 'WARN') {
        updateAlertCenter(logEntry);
    }
    
    try {
        const encrypted = await encryptData(logEntry);
        await tx('logs', 'readwrite').add({ id: Date.now() + Math.random(), ts, level, encryptedData: encrypted });
        updateLogDisplay();
    } catch (e) {
        console.error("Error saving log:", e);
        showToast("Error saving log: Check console.", 'CRITICAL');
    }
}

async function saveMetrics(metrics) {
    const ts = Date.now();
    try {
        const encrypted = await encryptData(metrics);
        await tx('metrics', 'readwrite').add({ ts, encryptedData: encrypted });
        updateCharts(metrics);
        
        const servers = await getAllServers();
        updateHealthOverview(servers);
        if (SELECTED_SERVER_ID) updateServerDetails(SELECTED_SERVER_ID);
        
        if (ts % 10000 < 500) pruneLogs(); 
        
        await checkAutoScale(metrics);
    } catch (e) {
        console.error("Error saving metrics:", e);
    }
}

function simulateMetrics() {
    getAllServers().then(servers => {
        let totalCpu = 0;
        let totalRam = 0;
        let activeCount = 0;

        servers.forEach(server => {
            // Bao gồm 'critical' trong tính toán metrics
            if (server.status !== 'down') { 
                const newCpu = Math.min(100, Math.max(0, server.cpu + (Math.random() * 8 - 4)));
                const newRam = Math.min(100, Math.max(0, server.ram + (Math.random() * 6 - 3)));
                
                updateServer(server.id, { cpu: newCpu, ram: newRam });

                if (server.status === 'ok' || server.status === 'warn' || server.status === 'critical') {
                    totalCpu += newCpu;
                    totalRam += newRam;
                    activeCount++;
                }


                // Cập nhật trạng thái dựa trên ngưỡng
                if (newCpu > 95 || newRam > 98) {
                    if (server.status !== 'critical') saveLogEntry('CRITICAL', `High load detected: CPU ${newCpu.toFixed(1)}%, RAM ${newRam.toFixed(1)}% on ${server.name}`, server.id);
                    updateServer(server.id, { status: 'critical' });
                } else if (newCpu > 80 || newRam > 85) {
                    if (server.status !== 'warn' && server.status !== 'critical') saveLogEntry('WARN', `High resource usage: CPU ${newCpu.toFixed(1)}%, RAM ${newRam.toFixed(1)}% on ${server.name}`, server.id);
                    if (server.status !== 'critical') updateServer(server.id, { status: 'warn' });
                } else if (server.status !== 'booting') {
                    if (server.status !== 'ok') updateServer(server.id, { status: 'ok' });
                }
            } 
        });

        if (activeCount > 0) {
            saveMetrics({
                avgCpu: totalCpu / activeCount,
                avgRam: totalRam / activeCount,
                ts: Date.now()
            });
        }
        renderServers();
    });
}

async function startSimulation() {
    if (SIMULATION_INTERVAL) return;
    SIMULATION_INTERVAL = setInterval(simulateMetrics, 2000);
    document.getElementById('wsToggle').dataset.running = '1';
    document.getElementById('wsToggle').innerHTML = '<i class="fas fa-stop"></i> Stop Simulation';
    document.getElementById('wsToggle').classList.replace('primary', 'danger');
    saveLogEntry('INFO', 'Simulation started.');
}

function stopSimulation() {
    if (SIMULATION_INTERVAL) clearInterval(SIMULATION_INTERVAL);
    SIMULATION_INTERVAL = null;
    document.getElementById('wsToggle').dataset.running = '0';
    document.getElementById('wsToggle').innerHTML = '<i class="fas fa-play"></i> Start Simulation';
    document.getElementById('wsToggle').classList.replace('danger', 'primary');
    saveLogEntry('INFO', 'Simulation stopped.');
}

async function checkAutoScale(metrics) {
    if (!AUTO_SCALE) return;
    
    const now = Date.now();
    const cooldown = COOLDOWN_PERIOD_SECONDS() * 1000;
    
    if (now - LAST_SCALE_TS < cooldown) {
        return; 
    }

    const avgCpu = metrics.avgCpu;
    const servers = await getAllServers();
    const okServers = servers.filter(s => s.status === 'ok').length;

    // Scale UP
    if (avgCpu >= CPU_THRESHOLD_UP() && okServers > 0) {
        if (okServers < ORIGINAL_SERVERS.size + 5) { 
            await addServer();
            LAST_SCALE_TS = now;
            saveLogEntry('WARN', `AUTO-SCALE UP: Avg CPU (${avgCpu.toFixed(1)}%) exceeded ${CPU_THRESHOLD_UP()}%. Adding new server.`, 'AUTOSCALE');
        } else {
            saveLogEntry('CRITICAL', `AUTO-SCALE Limit Reached. Max servers deployed.`, 'AUTOSCALE');
        }
    } 
    // Scale DOWN
    else if (avgCpu <= CPU_THRESHOLD_DOWN() && servers.length > ORIGINAL_SERVERS.size) {
        const serverToRemove = servers.find(s => !ORIGINAL_SERVERS.has(s.id) && s.status === 'ok');
        if (serverToRemove) {
            await tx('servers', 'readwrite').delete(serverToRemove.id);
            LAST_SCALE_TS = now;
            saveLogEntry('INFO', `AUTO-SCALE DOWN: Avg CPU (${avgCpu.toFixed(1)}%) below ${CPU_THRESHOLD_DOWN()}%. Removing server ${serverToRemove.name}.`, 'AUTOSCALE');
        }
    }
}

async function pruneLogs(maxCount = 200) {
    const store = tx('logs', 'readwrite');
    const countRequest = store.count();

    countRequest.onsuccess = (e) => {
        const currentCount = e.target.result;
        
        if (currentCount > maxCount) {
            const deleteCount = currentCount - maxCount;
            let deleted = 0;
            const deleteRequest = store.openCursor();
            deleteRequest.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && deleted < deleteCount) {
                    cursor.delete();
                    deleted++;
                    cursor.continue();
                } 
            };
        }
    };
}


// =================== 4. UI Rendering & Interactivity ===================

let cpuChart = null;
let ramChart = null;

function initChart(canvasId, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const isCpuChart = canvasId === 'cpuChart';

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: 'rgba(0, 0, 0, 0)',
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: { color: IS_DARK_THEME ? '#e6eef8' : '#333' }
                },
                x: {
                    ticks: { color: IS_DARK_THEME ? '#e6eef8' : '#333', maxRotation: 0, minRotation: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                annotation: { // Đảm bảo plugin được tải và kích hoạt
                    annotations: [
                        {
                            type: 'line',
                            mode: 'horizontal',
                            scaleID: 'y',
                            value: isCpuChart ? CPU_THRESHOLD_UP() : 90,
                            borderColor: 'var(--danger)',
                            borderWidth: 1,
                            borderDash: [5, 5],
                            label: {
                                content: 'Threshold',
                                enabled: true,
                                position: 'end'
                            }
                        }
                    ]
                }
            }
        }
    });
}

function updateCharts(metrics) {
    if (!cpuChart) cpuChart = initChart('cpuChart', 'CPU', 'var(--accent)');
    if (!ramChart) ramChart = initChart('ramChart', 'RAM', 'var(--success)');

    const chartDataLength = 20;

    // Cập nhật biểu đồ CPU
    cpuChart.data.labels.push(new Date().toLocaleTimeString());
    cpuChart.data.datasets[0].data.push(metrics.avgCpu);
    if (cpuChart.data.labels.length > chartDataLength) {
        cpuChart.data.labels.shift();
        cpuChart.data.datasets[0].data.shift();
    }
    // Cập nhật ngưỡng CPU động
    if(cpuChart.options.plugins.annotation && cpuChart.options.plugins.annotation.annotations[0]) {
        cpuChart.options.plugins.annotation.annotations[0].value = CPU_THRESHOLD_UP();
    }


    // Cập nhật biểu đồ RAM
    ramChart.data.labels.push(new Date().toLocaleTimeString());
    ramChart.data.datasets[0].data.push(metrics.avgRam);
    if (ramChart.data.labels.length > chartDataLength) {
        ramChart.data.labels.shift();
        ramChart.data.datasets[0].data.shift();
    }
    
    cpuChart.update();
    ramChart.update();
}


async function renderServers() {
    const servers = await getAllServers();
    const listEl = document.getElementById('serverList');
    listEl.innerHTML = '';
    
    servers.sort((a, b) => a.name.localeCompare(b.name)); 

    servers.forEach(server => {
        const statusClass = `status-${server.status}`;
        const isSelected = server.id === SELECTED_SERVER_ID ? 'selected' : '';
        
        // FIX/IMPROVEMENT: Icon logic
        let statusIcon;
        if (server.status === 'ok') {
            statusIcon = 'fa-check-circle';
        } else if (server.status === 'down') {
            statusIcon = 'fa-times-circle';
        } else if (server.status === 'booting') {
            statusIcon = 'fa-circle-notch fa-spin';
        } else if (server.status === 'critical') { // NEW: Critical Icon
            statusIcon = 'fa-frown-open'; 
        } else {
            statusIcon = 'fa-exclamation-triangle'; // For 'warn'
        }


        listEl.innerHTML += `
            <div class="server-item ${statusClass} ${isSelected}" data-id="${server.id}">
                <div class="server-item-info">
                    <strong>${server.name}</strong> 
                    <div class="small">${server.ip}</div>
                </div>
                <div class="text-right">
                    <i class="fas ${statusIcon} ${statusClass}"></i>
                    <div class="small ${statusClass}">${server.status.toUpperCase()}</div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('serverCount').textContent = servers.length;
}

// IMPROVEMENT: New function to count metrics
async function countMetrics() {
    return new Promise((res) => {
        const store = tx('metrics');
        const countRequest = store.count();
        countRequest.onsuccess = (e) => {
            const count = e.target.result;
            document.getElementById('totalMetrics').textContent = count;
            res(count);
        };
        countRequest.onerror = () => {
            document.getElementById('totalMetrics').textContent = 'N/A';
            res(0);
        }
    });
}


function updateHealthOverview(servers = []) {
    if (servers.length === 0) return;
    
    // FIX: Tách rõ ràng WARN (bao gồm booting) và CRITICAL/DANGER
    const ok = servers.filter(s => s.status === 'ok').length;
    const warn = servers.filter(s => s.status === 'warn' || s.status === 'booting').length;
    const danger = servers.filter(s => s.status === 'critical' || s.status === 'down').length;

    document.getElementById('statusOkCount').textContent = ok;
    document.getElementById('statusWarnCount').textContent = warn;
    document.getElementById('statusDangerCount').textContent = danger;
    
    // IMPROVEMENT: Cập nhật số lượng metrics
    countMetrics();
}

async function updateServerDetails(serverId) {
    const panel = document.getElementById('serverDetailsPanel');
    if (!serverId) {
        panel.classList.add('hidden');
        return;
    }
    
    const server = await getServerState(serverId);
    if (!server) {
        panel.classList.add('hidden');
        return;
    }
    
    panel.classList.remove('hidden');
    document.getElementById('detailsServerName').textContent = server.name;
    document.getElementById('detailsServerIP').textContent = server.ip;
    document.getElementById('detailsServerCPU').textContent = server.cpu.toFixed(1);
    document.getElementById('detailsServerRAM').textContent = server.ram.toFixed(1);
    
    const statusText = server.status.toUpperCase();
    document.getElementById('detailsServerStatus').innerHTML = `<span class="status-${server.status}">${statusText}</span>`;
    
    // Gán hành động
    document.getElementById('pingServerBtn').onclick = () => simulatePing(serverId);
    document.getElementById('copyIPBtn').onclick = () => { navigator.clipboard.writeText(server.ip); showToast('IP Copied!'); };
    document.getElementById('toggleStatusBtn').onclick = () => {
        const newStatus = server.status === 'down' ? 'ok' : 'down';
        updateServer(serverId, { status: newStatus });
        saveLogEntry('WARN', `Admin toggled status for ${server.name} to ${newStatus.toUpperCase()}`, serverId);
    };
    
    document.querySelectorAll('.server-item').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.server-item[data-id="${serverId}"]`)?.classList.add('selected');
}

// MỚI: Alert Center
function updateAlertCenter(logEntry) {
    const alertCenter = document.getElementById('alertCenter');
    const entryDiv = document.createElement('div');
    entryDiv.className = `alert-item alert-${logEntry.level}`;
    
    const time = new Date(logEntry.ts).toLocaleTimeString();
    entryDiv.innerHTML = `
        <strong>${logEntry.level}</strong>: ${logEntry.message}
        <span class="timestamp">${time} | Scope: ${logEntry.scopeId}</span>
    `;
    
    if (alertCenter.firstChild && alertCenter.firstChild.classList.contains('muted')) {
        alertCenter.innerHTML = '';
    }
    alertCenter.prepend(entryDiv);
    
    while (alertCenter.children.length > 10) {
        alertCenter.removeChild(alertCenter.lastChild);
    }
}

// Cải tiến: Log Filter
async function updateLogDisplay() {
    const logArea = document.getElementById('logArea');
    logArea.innerHTML = '';
    
    const logs = await getLogs(LOG_FILTER_LEVEL);
    
    logs.forEach(log => {
        const time = new Date(log.ts).toLocaleTimeString();
        logArea.innerHTML += `
            <div class="log-entry">
                <span class="log-level-${log.level}">[${log.level}]</span> 
                <span class="muted">${time}</span>: ${log.message}
            </div>
        `;
    });
}

// Cải tiến: Get Logs có Filter
async function getLogs(levelFilter = 'ALL', limit = 50) {
    let logs = [];
    const store = tx('logs');
    const req = store.openCursor(null, 'prev'); 

    return new Promise((res) => {
        req.onsuccess = async (e) => {
            const cursor = e.target.result;
            if (cursor && logs.length < limit) {
                try {
                    const decryptedText = await decryptData(cursor.value.encryptedData);
                    let log;
                    try {
                        log = JSON.parse(decryptedText);
                    } catch (err) {
                        // Log corrupted data if it's not a valid JSON after decryption attempt
                        log = { ts: cursor.value.ts, level: 'CRITICAL', message: decryptedText };
                    }
                    
                    if (levelFilter === 'ALL' || log.level === levelFilter) {
                        logs.push(log);
                    }
                    cursor.continue();
                } catch (error) {
                    logs.push({ ts: cursor.value.ts, level: 'CRITICAL', message: `ERROR: Failed to process log entry ${cursor.value.id}` });
                    cursor.continue();
                }
            } else {
                res(logs);
            }
        };
        req.onerror = () => res(logs);
    });
}


function showToast(message, level = 'INFO') {
    const toastArea = document.getElementById('toastArea');
    const toast = document.createElement('div');
    toast.className = `toast toast-${level}`;
    toast.textContent = message;
    toastArea.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// =================== 5. Event Handlers & Utility ===================

function toggleTheme() {
    IS_DARK_THEME = !IS_DARK_THEME;
    document.body.className = IS_DARK_THEME ? 'dark-theme' : 'light-theme';
    document.getElementById('themeToggle').textContent = IS_DARK_THEME ? 'Light Theme' : 'Dark Theme';
    setConfig('IS_DARK_THEME', IS_DARK_THEME);
    if (cpuChart) cpuChart.destroy();
    if (ramChart) ramChart.destroy();
    cpuChart = null;
    ramChart = null;
    simulateMetrics(); // Vẽ lại charts với theme mới
}

async function toggleEncrypt() {
    if (ENCRYPT && !confirm("Are you sure you want to disable encryption? All new logs will be stored in plain text.")) {
        return;
    }
    
    if (!ENCRYPT) {
        const password = prompt("Enter a secret key to enable encryption (e.g., a simple password):");
        if (!password) {
            showToast("Encryption setup cancelled.", 'INFO');
            return;
        }

        try {
            // Sử dụng PBKDF2 để tạo khóa an toàn hơn từ mật khẩu
            const keyMaterial = await crypto.subtle.importKey(
                "raw",
                new TextEncoder().encode(password),
                { name: "PBKDF2" },
                false,
                ["deriveBits", "deriveKey"]
            );
            ENC_KEY = await crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt: new TextEncoder().encode("simulator-salt"), 
                    iterations: 100000,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );

            // FIX: Export key to JWK before storing
            const jwk = await crypto.subtle.exportKey("jwk", ENC_KEY);
            
            ENCRYPT = true;
            await setConfig('ENCRYPT', true);
            await setConfig('ENC_KEY_JWK', jwk); // STORE JWK
            showToast("Encryption enabled successfully!", 'SUCCESS');
        } catch (e) {
            showToast(`Encryption setup failed: ${e.message}`, 'CRITICAL');
            return;
        }
    } else {
        ENCRYPT = false;
        ENC_KEY = null;
        await setConfig('ENCRYPT', false);
        await setConfig('ENC_KEY_JWK', null); // REMOVE JWK
        showToast("Encryption disabled. Old logs remain encrypted.", 'INFO');
    }
    document.getElementById('toggleEncrypt').textContent = ENCRYPT ? 'Disable Encryption' : 'Enable Encryption';
    updateLogDisplay();
}

function toggleAutoScale() {
    AUTO_SCALE = !AUTO_SCALE;
    document.getElementById('autoScaleToggle').textContent = `Auto-Scale: ${AUTO_SCALE ? 'ON' : 'OFF'}`;
    setConfig('AUTO_SCALE', AUTO_SCALE);
    saveLogEntry('INFO', `Auto-Scale feature ${AUTO_SCALE ? 'enabled' : 'disabled'}.`, 'AUTOSCALE');
}

function simulatePing(serverId) {
    const latency = Math.floor(Math.random() * 50) + 10;
    saveLogEntry('INFO', `Ping successful to ${serverId}. Latency: ${latency}ms.`, serverId);
    showToast(`Ping ${serverId}: ${latency}ms`, 'INFO');
}

function simulateSpike() {
    getAllServers().then(servers => {
        servers.forEach(server => {
            if (server.status === 'ok') {
                updateServer(server.id, { cpu: 98 + Math.random() * 2, ram: 90 + Math.random() * 5 });
            }
        });
        saveLogEntry('WARN', `Admin triggered a system-wide load spike!`, 'SYSTEM');
    });
}


// =================== 6. Initialization ===================

async function initApp() {
    await openDB();
    await loadConfig();
    
    const initialServers = await getAllServers();
    if (initialServers.length === 0) {
        await addServer();
        await addServer();
        await addServer();
    } else {
        initialServers.forEach(s => ORIGINAL_SERVERS.add(s.id));
    }
    
    document.body.className = IS_DARK_THEME ? 'dark-theme' : 'light-theme';
    
    renderServers();
    updateLogDisplay();
    updateHealthOverview(initialServers);
    await countMetrics(); // NEW: Hiển thị số lượng metrics ban đầu
    
    // Gán Event Listeners
    document.getElementById('addServerBtn').addEventListener('click', addServer);
    document.getElementById('autoScaleToggle').addEventListener('click', toggleAutoScale);
    document.getElementById('simulateSpike').addEventListener('click', simulateSpike);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('toggleEncrypt').addEventListener('click', toggleEncrypt);
    document.getElementById('wsToggle').addEventListener('click', () => {
        document.getElementById('wsToggle').dataset.running === '0' ? startSimulation() : stopSimulation();
    });
    
    // IMPROVEMENT: Attach Backup listener
    document.getElementById('backupBtn').addEventListener('click', backupDB);
    
    // Rotate Key
    document.getElementById('rotateKeyBtn').addEventListener('click', async () => {
        if (!ENCRYPT) {
            showToast("Encryption must be enabled to rotate keys.", 'WARN');
            return;
        }
        const newKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        await reEncryptAll(newKey);
        showToast('Encryption Key Rotated Successfully!');
    });
    
    // Log Filter
    document.getElementById('logFilters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            LOG_FILTER_LEVEL = e.target.getAttribute('data-level');
            updateLogDisplay();
        }
    });

    // Server List Click
    document.getElementById('serverList').addEventListener('click', (e) => {
        const item = e.target.closest('.server-item');
        if (item) {
            SELECTED_SERVER_ID = item.getAttribute('data-id');
            updateServerDetails(SELECTED_SERVER_ID);
        }
    });

    // Export Logs
    document.getElementById('exportLogsBtn').addEventListener('click', async () => {
        const logs = await getLogs('ALL', 1000); 
        let csv = 'Time,Level,Scope,Message\n';
        logs.forEach(log => {
            const time = new Date(log.ts).toISOString();
            const escapedMessage = log.message.replace(/"/g, '""');
            csv += `"${time}","${log.level}","${log.scopeId}","${escapedMessage}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'server_logs.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Logs exported to CSV.", 'INFO');
    });

    // Restore DB logic (placeholder)
    document.getElementById('restoreFile').addEventListener('change', (e) => {
        showToast("Database restore functionality is highly complex and not fully implemented in this simulator version.", 'CRITICAL');
        e.target.value = '';
    });
}

initApp();