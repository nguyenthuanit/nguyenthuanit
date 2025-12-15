// ===============================================
// Professional Enterprise Server Simulator (V3.1)
// ===============================================

// =================== 1. Config & DB Management ===================
const DB_NAME = 'ServerSimDB';
const DB_VERSION = 5; // Tăng version để IndexedDB tạo store mới cho policy/script
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
let TERMINAL_HISTORY = [];

// *** CẢI TIẾN: Thêm hằng số cấu hình hệ thống ***
const MAX_SCALABLE_SERVERS = 10;
const BASE_IP_OCTET = 100;
// ************************************************

// Lấy giá trị cấu hình động từ UI
const CPU_THRESHOLD_UP = () => parseInt(document.getElementById('autoScaleThresholdUp').value, 10) || 85;
const CPU_THRESHOLD_DOWN = () => parseInt(document.getElementById('autoScaleThresholdDown').value, 10) || 25;
const COOLDOWN_PERIOD_SECONDS = () => parseInt(document.getElementById('autoScaleCooldown').value, 10) || 30;
const GLOBAL_LAG_MS = () => parseInt(document.getElementById('networkLag').value, 10) || 0; 

// Hàm tiện ích cho IndexedDB
async function setConfig(key, value) {
    try {
        await tx('config', 'readwrite').put({ key, value });
    } catch (e) {
        console.error(`Failed to set config ${key}:`, e);
    }
}

async function getConfig(key, defaultValue) {
    return new Promise((resolve) => {
        const req = tx('config').get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
        req.onerror = () => {
            console.error(`Failed to get config ${key}:`, req.error);
            resolve(defaultValue);
        };
    });
}

function tx(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
}

async function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('servers')) {
                db.createObjectStore('servers', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('logs')) {
                const logsStore = db.createObjectStore('logs', { keyPath: 'ts' });
                logsStore.createIndex('level', 'level', { unique: false });
                logsStore.createIndex('scopeId', 'scopeId', { unique: false });
            }
            if (!db.objectStoreNames.contains('config')) {
                db.createObjectStore('config', { keyPath: 'key' });
            }
        };

        req.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        req.onerror = (e) => {
            console.error("Database error:", e.target.error);
            reject(e.target.error);
        };
    });
}

// =================== 2. Simulation Logic ===================

const DEFAULT_HEALTH_SCRIPT = `
# Pseudo-Code: Health Check Script
# This script runs every 10 seconds.
# Return 'ok', 'warn', or 'critical' based on server metrics (cpu, ram, latency).

if cpu > 90 or ram > 95 or latency > 200:
    return 'critical'
if cpu > 70 or ram > 80 or latency > 50:
    return 'warn'
return 'ok'
`;

const DEFAULT_NETWORK_POLICY = [
    { source: '0.0.0.0/0', port: 80, action: 'ALLOW' },
    { source: '0.0.0.0/0', port: 443, action: 'ALLOW' },
    { source: '10.0.0.0/8', port: 22, action: 'ALLOW' },
    { source: '0.0.0.0/0', port: 23, action: 'DENY' }
];

function generateServerData(id, name, ip, status = 'ok') {
    return {
        id: id,
        name: name,
        ip: ip,
        status: status, // ok, warn, critical, down, booting, maintenance (MỚI)
        cpu: 0,
        ram: 0,
        disk: 0,
        latency: 0,
        uptime: 0,
        securityScore: 100,
        lastUpdate: Date.now(),
        maintenanceMode: false, // TÍNH NĂNG MỚI
        networkPolicy: DEFAULT_NETWORK_POLICY, // TÍNH NĂNG MỚI
        healthScript: DEFAULT_HEALTH_SCRIPT // TÍNH NĂNG MỚI
    };
}

// TÍNH NĂNG MỚI: Mô phỏng chạy Health Check Script
function runHealthCheck(server) {
    if (server.maintenanceMode) return 'maintenance';
    
    // Đánh giá dựa trên script (pseudo-code evaluation)
    const { cpu, ram, latency } = server;
    let resultStatus = 'ok';
    
    // Vì không thể chạy JS code trong môi trường web, ta dùng logic mô phỏng dựa trên script
    if (cpu > 90 || ram > 95 || latency > 200) {
        resultStatus = 'critical';
    } else if (cpu > 70 || ram > 80 || latency > 50) {
        resultStatus = 'warn';
    }
    
    return resultStatus;
}


function generateMetrics(server) {
    // 1. Nếu đang Maintenance, chỉ cập nhật uptime và giữ nguyên status
    if (server.maintenanceMode) {
        server.uptime += 1;
        server.lastUpdate = Date.now();
        return server; 
    }

    // 2. Sinh số liệu ngẫu nhiên
    const baseCPU = server.status === 'ok' ? 30 + Math.random() * 20 : 70 + Math.random() * 25;
    const baseRAM = server.status === 'ok' ? 40 + Math.random() * 15 : 60 + Math.random() * 30;
    
    server.cpu = Math.min(100, baseCPU + (Math.random() * 5));
    server.ram = Math.min(100, baseRAM + (Math.random() * 5));
    server.disk = 50 + Math.random() * 40; 
    
    const baseLatency = server.status === 'ok' ? 5 + Math.random() * 15 : 50 + Math.random() * 150;
    server.latency = baseLatency + GLOBAL_LAG_MS(); 
    
    server.uptime += 1;
    server.lastUpdate = Date.now();
    
    // 3. Đánh giá trạng thái bằng Health Check Script (MỚI)
    const newStatus = runHealthCheck(server);

    // Xử lý chuyển trạng thái
    if (server.status !== 'down' && server.status !== 'booting') {
         if (newStatus !== 'ok' && newStatus !== server.status) {
            saveLogEntry(newStatus.toUpperCase(), `${server.name} status changed to ${newStatus.toUpperCase()} by Health Check Script (CPU: ${server.cpu.toFixed(1)}%).`, server.id);
            server.status = newStatus;
        } else if (newStatus === 'ok' && server.status !== 'ok') {
            saveLogEntry('SUCCESS', `${server.name} recovered and is OK.`, server.id);
            server.status = 'ok';
        }
    }
    
    // Xử lý Down/Booting (vẫn giữ logic cũ)
    if (server.status === 'critical' && Math.random() < 0.005) {
        server.status = 'down';
        saveLogEntry('CRITICAL', `${server.name} is unresponsive and marked as DOWN.`, server.id);
    } else if (server.status === 'down' && Math.random() < 0.002) {
        server.status = 'booting';
        saveLogEntry('INFO', `${server.name} is attempting to reboot/recover.`, server.id);
    } else if (server.status === 'booting' && Math.random() < 0.2) {
        server.status = 'ok';
        saveLogEntry('SUCCESS', `${server.name} successfully recovered and is OK.`, server.id);
    }

    // 4. Giảm security score ngẫu nhiên nếu có vấn đề
    if (server.status === 'critical' && Math.random() < 0.1) {
        server.securityScore = Math.max(0, server.securityScore - 5);
        saveLogEntry('WARN', `Security risk detected on ${server.name}. Score reduced to ${server.securityScore}.`, server.id);
    }
    
    return server;
}

async function updateAllServers() {
    const servers = await getAllServers();
    const txServers = tx('servers', 'readwrite');
    let needsUpdate = false;
    
    for (const server of servers) {
        // Cập nhật server, kể cả khi down
        const updatedServer = generateMetrics(server);
        txServers.put(updatedServer);
        needsUpdate = true;
    }

    if (needsUpdate) {
        await new Promise(resolve => txServers.transaction.oncomplete = resolve);
        await checkAutoScale(servers);
        renderApp(servers);
    } else {
        renderApp(servers);
    }
}

async function checkAutoScale(servers) {
    if (!AUTO_SCALE) return;

    const currentTime = Date.now();
    const cooldownPeriod = COOLDOWN_PERIOD_SECONDS() * 1000;
    if (currentTime - LAST_SCALE_TS < cooldownPeriod) {
        return; 
    }

    // Chỉ tính các server đang hoạt động VÀ KHÔNG TRONG CHẾ ĐỘ MAINTENANCE
    const liveServers = servers.filter(s => 
        (s.status === 'ok' || s.status === 'warn' || s.status === 'critical') && !s.maintenanceMode
    );

    const avgCpu = liveServers.length > 0 
        ? liveServers.reduce((sum, s) => sum + s.cpu, 0) / liveServers.length 
        : 0;

    const thresholdUp = CPU_THRESHOLD_UP();
    const thresholdDown = CPU_THRESHOLD_DOWN();

    // Scale UP
    if (avgCpu >= thresholdUp && liveServers.length === servers.length) {
        if (servers.length < MAX_SCALABLE_SERVERS) { 
            await addServer(`Scale-UP-${servers.length + 1}`, true);
            LAST_SCALE_TS = currentTime;
            saveLogEntry('SYSTEM', `Auto-Scale UP triggered. New server added due to average CPU ${avgCpu.toFixed(1)}% > ${thresholdUp}%.`);
            showToast("Auto-Scale UP: New server added.", 'INFO');
        } else {
            saveLogEntry('WARN', `Auto-Scale UP blocked. Maximum server limit reached (${MAX_SCALABLE_SERVERS} servers).`, 'SYSTEM');
        }
    }
    // Scale DOWN
    else if (avgCpu <= thresholdDown && servers.length > ORIGINAL_SERVERS.size) {
        // Chỉ xóa các server không phải là server gốc VÀ không trong maintenance
        const removableServers = servers.filter(s => !ORIGINAL_SERVERS.has(s.id) && !s.maintenanceMode);
        if (removableServers.length > 0) {
            const serverToRemove = removableServers[removableServers.length - 1];
            await deleteServer(serverToRemove.id);
            LAST_SCALE_TS = currentTime;
            saveLogEntry('SYSTEM', `Auto-Scale DOWN triggered. Server ${serverToRemove.name} removed due to average CPU ${avgCpu.toFixed(1)}% < ${thresholdDown}%.`);
            showToast(`Auto-Scale DOWN: Server ${serverToRemove.name} removed.`, 'INFO');
        }
    }
}

// =================== 3. Server Management ===================

async function getAllServers() {
    return new Promise((resolve) => {
        const servers = [];
        const req = tx('servers').openCursor();
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                servers.push(cursor.value);
                cursor.continue();
            } else {
                resolve(servers);
            }
        };
    });
}

async function getSelectedServer() {
    if (!SELECTED_SERVER_ID) return null;
    return new Promise((resolve) => {
        const req = tx('servers').get(SELECTED_SERVER_ID);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

async function updateServer(server) {
    if (!server) return;
    await tx('servers', 'readwrite').put(server);
    renderApp();
}

async function addServer(name = 'New Server', isAutoScale = false) {
    const servers = await getAllServers();
    const newId = `s${Date.now()}`;
    const newIp = `192.168.1.${BASE_IP_OCTET + servers.length}`;
    const newServer = generateServerData(newId, name, newIp, isAutoScale ? 'booting' : 'ok');

    await tx('servers', 'readwrite').add(newServer);
    SELECTED_SERVER_ID = newId;
    saveLogEntry('INFO', `Server ${newServer.name} added to the system.`, newServer.id);
    renderApp();
    return newServer;
}

async function deleteServer(serverId) {
    if (!serverId) return;
    const serverToDelete = await new Promise(resolve => {
        const req = tx('servers').get(serverId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });

    if (serverToDelete) {
        await tx('servers', 'readwrite').delete(serverId);
        if (SELECTED_SERVER_ID === serverId) {
            SELECTED_SERVER_ID = null;
        }
        saveLogEntry('CRITICAL', `Server ${serverToDelete.name} (${serverId}) deleted/decommissioned.`, serverId);
        renderApp();
        return true;
    }
    return false;
}

// Restart Service
async function restartServerService(serverId) {
    const server = await getSelectedServer();
    if (!server || server.id !== serverId) return;

    server.status = 'booting';
    server.cpu = 0;
    server.ram = 0;
    
    await updateServer(server);
    saveLogEntry('WARN', `Service on ${server.name} is being restarted...`, server.id);
    showToast(`Restarting service on ${server.name}.`, 'WARN');
}

// TÍNH NĂNG MỚI: Toggle Maintenance Mode
async function toggleMaintenanceMode(serverId) {
    const server = await getSelectedServer();
    if (!server || server.id !== serverId) return;

    server.maintenanceMode = !server.maintenanceMode;
    
    if (server.maintenanceMode) {
        // Chuyển status sang 'maintenance' khi bật mode
        server.status = 'maintenance'; 
        server.cpu = 0; server.ram = 0; // Giả lập zero load
        saveLogEntry('SYSTEM', `${server.name} placed in Maintenance Mode. Traffic diverted.`, server.id);
        showToast(`${server.name}: Maintenance Mode ENABLED.`, 'WARN');
    } else {
        // Khi tắt, chuyển status sang 'booting' để hệ thống tự hồi phục
        server.status = 'booting';
        saveLogEntry('SYSTEM', `${server.name} removed from Maintenance Mode. Initiating system boot.`, server.id);
        showToast(`${server.name}: Maintenance Mode DISABLED.`, 'SUCCESS');
    }
    
    await updateServer(server);
}


// =================== 4. Logging & Terminal ===================

async function saveLogEntry(level, message, scopeId = 'SYSTEM') {
    const logEntry = {
        ts: Date.now(),
        level: level, // INFO, WARN, CRITICAL, SYSTEM, SUCCESS
        message: message,
        scopeId: scopeId
    };
    try {
        await tx('logs', 'readwrite').add(logEntry);
        updateLogDisplay();
    } catch (e) {
        // console.error("Failed to save log:", e);
    }
}

async function getLogs(level = 'ALL', limit = 50) {
    return new Promise((resolve) => {
        const logs = [];
        const store = tx('logs').openCursor(null, 'prev'); 

        store.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor && logs.length < limit) {
                const log = cursor.value;
                if (level === 'ALL' || log.level === level) {
                    logs.push(log);
                }
                cursor.continue();
            } else {
                logs.sort((a, b) => a.ts - b.ts);
                resolve(logs);
            }
        };
        store.onerror = () => resolve([]);
    });
}

async function updateLogDisplay() {
    const logArea = document.getElementById('logArea');
    const logs = await getLogs(LOG_FILTER_LEVEL, 50); 
    let html = '';
    logs.forEach(log => {
        const level = log.level || 'CRITICAL';
        const timeStr = new Date(log.ts).toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        html += `
            <div class="log-entry">
                <span class="log-timestamp">[${timeStr}]</span>
                <span class="log-level log-level-${level}">${level.padEnd(8)}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `;
    });
    logArea.innerHTML = html;
    logArea.scrollTop = logArea.scrollHeight; 
}

// Terminal Logic
function initTerminal(serverName) {
    const outputEl = document.getElementById('terminalOutput');
    const inputEl = document.getElementById('terminalInput');
    document.getElementById('terminalTitle').textContent = `Live Terminal: ${serverName}`;
    outputEl.innerHTML = '';
    TERMINAL_HISTORY = [];

    const welcome = `
Welcome to ${serverName} Terminal. Type 'help' for commands.
Connected via encrypted channel: ${ENCRYPT ? 'TLS/SSH' : 'Insecure'}
------------------------------------------------------
$ `;
    outputEl.textContent = welcome.trim();
    inputEl.value = '';
    inputEl.focus();

    inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') {
            handleTerminalCommand(serverName, inputEl.value);
            inputEl.value = '';
            e.preventDefault();
        }
    };
}

async function handleTerminalCommand(serverName, command) {
    const outputEl = document.getElementById('terminalOutput');
    const inputEl = document.getElementById('terminalInput');
    TERMINAL_HISTORY.push(command);

    if (command === 'clear') {
        outputEl.textContent = '';
        outputEl.textContent += '$ ';
        return;
    }

    const server = await getSelectedServer();
    let result = '';

    switch (command.toLowerCase().trim()) {
        case 'help':
            result = `
Available Commands:
status - Show current server status and load.
ping - Run a quick latency check.
reboot - Restart the server service (same as GUI button).
policy - View current network policy.
exit - Close the terminal.
clear - Clear the terminal output.
`;
            break;
        case 'status':
            if (server) {
                result = `
 [${serverName}]
 Status: ${server.status.toUpperCase()} ${server.maintenanceMode ? '(MAINTENANCE)' : ''}
 CPU: ${server.cpu.toFixed(1)}%
 RAM: ${server.ram.toFixed(1)}%
 Latency: ${server.latency.toFixed(2)}ms
 Uptime: ~${Math.floor(server.uptime / 3600)} hours
 `;
            } else {
                result = 'Error: No server selected.';
            }
            break;
        case 'ping':
            result = `Pinging default gateway... ${server.latency.toFixed(0)}ms (simulated)`;
            break;
        case 'reboot':
            restartServerService(SELECTED_SERVER_ID);
            result = 'Initiating server restart sequence... Disconnected.';
            setTimeout(() => {
                hideModal('terminalModal');
                showToast(`Server ${serverName} is rebooting.`, 'WARN');
            }, 1000);
            break;
        case 'policy':
            if (server && server.networkPolicy) {
                result = "Active Firewall Policies:\n";
                server.networkPolicy.forEach(p => {
                    result += ` - ${p.action.padEnd(5)} | Port: ${p.port.toString().padEnd(5)} | Source: ${p.source}\n`;
                });
            } else {
                result = 'Error: No policy found.';
            }
            break;
        case 'clear':
            outputEl.textContent = '';
            break;
        case 'exit':
            hideModal('terminalModal');
            result = 'Connection closed.';
            break;
        default:
            result = `Error: command not found: ${command}`;
    }
    
    // In command và kết quả
    outputEl.textContent += command + '\n';
    outputEl.textContent += result.trim() + '\n';
    outputEl.textContent += '$ ';
    outputEl.scrollTop = outputEl.scrollHeight;
}


// =================== 5. UI Rendering & Updates ===================

let cpuChart = null;
let ramChart = null;
let latencyChart = null;

function initChart(canvasId, label, color, min = 0, max = 100) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const thresholdValue = CPU_THRESHOLD_UP(); // Chỉ dùng cho CPU Chart
    const thresholdLabel = `Auto-Scale UP Threshold (${thresholdValue}%)`;
    const thresholdColor = 'var(--danger)';

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: {
                    min: min,
                    max: max,
                    title: { display: false },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                annotation: (canvasId === 'cpuChart') ? {
                    annotations: [{
                        type: 'line',
                        scaleID: 'y',
                        value: thresholdValue,
                        borderColor: thresholdColor,
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: {
                            content: thresholdLabel,
                            enabled: true,
                            position: 'end',
                            backgroundColor: thresholdColor
                        }
                    }]
                } : undefined
            }
        }
    });
}

function updateCharts(metrics) {
    if (!cpuChart) cpuChart = initChart('cpuChart', 'CPU', 'var(--accent)');
    if (!ramChart) ramChart = initChart('ramChart', 'RAM', 'var(--success)');
    if (!latencyChart) latencyChart = initChart('latencyChart', 'Latency', 'var(--network)', 0, 500);

    const chartDataLength = 20;
    const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour12: false });

    // Cập nhật CPU
    cpuChart.data.labels.push(timeLabel);
    cpuChart.data.datasets[0].data.push(metrics.cpu);
    if (cpuChart.data.labels.length > chartDataLength) {
        cpuChart.data.labels.shift();
        cpuChart.data.datasets[0].data.shift();
    }
    // Cập nhật ngưỡng động (chỉ cho CPU chart)
    if(cpuChart.options.plugins.annotation && cpuChart.options.plugins.annotation.annotations[0]) {
        cpuChart.options.plugins.annotation.annotations[0].value = CPU_THRESHOLD_UP();
        cpuChart.options.plugins.annotation.annotations[0].label.content = `Auto-Scale UP Threshold (${CPU_THRESHOLD_UP()}%)`;
    }

    // Cập nhật RAM
    ramChart.data.labels.push(timeLabel);
    ramChart.data.datasets[0].data.push(metrics.ram);
    if (ramChart.data.labels.length > chartDataLength) {
        ramChart.data.labels.shift();
        ramChart.data.datasets[0].data.shift();
    }

    // Cập nhật LATENCY
    latencyChart.data.labels.push(timeLabel);
    latencyChart.data.datasets[0].data.push(metrics.latency);
    if (latencyChart.data.labels.length > chartDataLength) {
        latencyChart.data.labels.shift();
        latencyChart.data.datasets[0].data.shift();
    }

    cpuChart.update();
    ramChart.update();
    latencyChart.update();
}

function renderServers(servers = []) {
    const serverListEl = document.getElementById('serverList');
    let html = '';

    // Sắp xếp: Critical/Down > Warn/Booting/Maintenance > OK
    servers.sort((a, b) => {
        const order = { 'critical': 0, 'down': 1, 'warn': 2, 'booting': 3, 'maintenance': 4, 'ok': 5 };
        return order[a.status] - order[b.status];
    });

    servers.forEach(server => {
        const statusClass = `status-${server.status}`;
        const isSelected = server.id === SELECTED_SERVER_ID ? 'selected' : '';
        const cpuFillStyle = `width: ${server.cpu.toFixed(1)}%; background: ${server.cpu > 80 ? 'var(--danger)' : server.cpu > 50 ? 'var(--warn)' : 'var(--success)'};`;
        const ramFillStyle = `width: ${server.ram.toFixed(1)}%; background: ${server.ram > 85 ? 'var(--danger)' : server.ram > 60 ? 'var(--warn)' : 'var(--success)'};`;
        const latencyColor = server.latency > 100 ? 'var(--danger)' : server.latency > 30 ? 'var(--warn)' : 'var(--success)';

        html += `
            <div class="server-item ${isSelected}" data-server-id="${server.id}">
                <div class="server-item-info">
                    <strong class="${statusClass}">${server.name}</strong>
                    <div class="small">${server.ip}</div>
                    <div class="server-item-metrics">
                        <span style="color: ${latencyColor};">${server.latency.toFixed(0)}ms</span>
                        <span>|</span>
                        <span>CPU: ${server.cpu.toFixed(0)}%</span>
                        <div class="server-item-metric-bar">
                            <div class="server-item-metric-bar-fill" style="${cpuFillStyle}"></div>
                        </div>
                    </div>
                </div>
                <div>
                    <i class="fas ${server.status === 'down' ? 'fa-circle-xmark' : server.status === 'critical' ? 'fa-triangle-exclamation' : server.status === 'warn' ? 'fa-bell' : server.status === 'maintenance' ? 'fa-wrench' : 'fa-circle-check'}" style="color: ${server.status === 'ok' ? 'var(--success)' : server.status === 'warn' || server.status === 'booting' ? 'var(--warn)' : server.status === 'maintenance' ? 'var(--maintenance)' : 'var(--danger)'};"></i>
                </div>
            </div>
        `;
    });

    serverListEl.innerHTML = html;
    document.getElementById('serverCount').textContent = servers.length;

    // Gắn sự kiện click
    serverListEl.querySelectorAll('.server-item').forEach(item => {
        item.onclick = () => {
            SELECTED_SERVER_ID = item.getAttribute('data-server-id');
            renderApp(servers); // Re-render để cập nhật trạng thái selected
        };
    });
}

function renderHealthOverview(servers = []) {
    const counts = servers.reduce((acc, s) => {
        acc.total++;
        if (s.status === 'ok') acc.ok++;
        else if (s.status === 'critical' || s.status === 'down') acc.danger++;
        else if (s.status === 'warn' || s.status === 'booting' || s.status === 'maintenance') acc.warn++;
        return acc;
    }, { ok: 0, warn: 0, danger: 0, total: 0 });

    document.getElementById('okCount').textContent = counts.ok;
    document.getElementById('warnCount').textContent = counts.warn;
    document.getElementById('dangerCount').textContent = counts.danger;
    document.getElementById('totalCount').textContent = counts.total;
}

async function renderServerDetails(server) {
    const detailGrid = document.getElementById('serverDetailGrid');
    const deleteBtn = document.getElementById('deleteServerBtn');
    const restartBtn = document.getElementById('restartServiceBtn');
    const terminalBtn = document.getElementById('liveTerminalBtn');
    const toggleMaintenanceBtn = document.getElementById('toggleMaintenanceBtn');
    const editPolicyBtn = document.getElementById('editPolicyBtn');
    const editScriptBtn = document.getElementById('editScriptBtn');

    if (!server) {
        detailGrid.innerHTML = '<p class="muted" style="text-align: center;">Select a server to view details.</p>';
        deleteBtn.disabled = true;
        restartBtn.disabled = true;
        terminalBtn.disabled = true;
        toggleMaintenanceBtn.disabled = true;
        editPolicyBtn.disabled = true;
        editScriptBtn.disabled = true;
        return;
    }

    // Kích hoạt các nút điều khiển
    deleteBtn.disabled = false;
    deleteBtn.onclick = () => { if (confirm(`Are you sure you want to delete ${server.name}?`)) { deleteServer(server.id); } };

    restartBtn.disabled = false;
    restartBtn.onclick = () => restartServerService(server.id);

    terminalBtn.disabled = false;
    terminalBtn.onclick = () => {
        showModal('terminalModal');
        initTerminal(server.name);
    };

    // Nút Maintenance Mode
    toggleMaintenanceBtn.disabled = false;
    toggleMaintenanceBtn.textContent = server.maintenanceMode ? 'Maintenance: ON' : 'Maintenance: OFF';
    toggleMaintenanceBtn.classList.toggle('danger', server.maintenanceMode);
    toggleMaintenanceBtn.classList.toggle('network', !server.maintenanceMode);
    toggleMaintenanceBtn.onclick = () => toggleMaintenanceMode(server.id);

    // Nút Advanced
    editPolicyBtn.disabled = false;
    editPolicyBtn.onclick = () => showPolicyModal(server);
    
    editScriptBtn.disabled = false;
    editScriptBtn.onclick = () => showScriptModal(server);

    const uptimeDays = Math.floor(server.uptime / 86400);
    const uptimeHours = Math.floor((server.uptime % 86400) / 3600);
    const uptimeMins = Math.floor((server.uptime % 3600) / 60);

    const html = `
        <div class="detail-group">
            <div class="small">Name / ID</div>
            <div class="detail-value">${server.name} / ${server.id}</div>
        </div>
        <div class="detail-group">
            <div class="small">IP Address</div>
            <div class="detail-value">${server.ip}</div>
        </div>
        <div class="detail-group">
            <div class="small">Current Status</div>
            <div class="detail-value"><span class="status-${server.status}">${server.status.toUpperCase()}</span></div>
        </div>
        <div class="detail-group">
            <div class="small">Uptime</div>
            <div class="detail-value">${uptimeDays}d ${uptimeHours}h ${uptimeMins}m</div>
        </div>
        <div class="detail-group">
            <div class="small">Disk Usage</div>
            <div class="detail-value">${server.disk.toFixed(1)}%</div>
        </div>
        <div class="detail-group">
            <div class="small">Security Score</div>
            <div class="detail-value">${server.securityScore}%</div>
        </div>
        <div class="detail-group">
            <div class="small">Maintenance Mode</div>
            <div class="detail-value status-${server.maintenanceMode ? 'maintenance' : 'ok'}">${server.maintenanceMode ? 'ON' : 'OFF'}</div>
        </div>
        <div class="detail-group">
            <div class="small">Encrypted Traffic</div>
            <div class="detail-value status-${ENCRYPT ? 'success' : 'critical'}">${ENCRYPT ? 'YES' : 'NO'}</div>
        </div>
    `;
    detailGrid.innerHTML = html;

    // Cập nhật biểu đồ nếu server thay đổi
    if (cpuChart && cpuChart.data.datasets[0].label !== server.name) {
        cpuChart.data.datasets[0].label = server.name;
        cpuChart.data.labels = [];
        cpuChart.data.datasets[0].data = [];
        cpuChart.update();
        ramChart.data.labels = [];
        ramChart.data.datasets[0].data = [];
        ramChart.update();
        latencyChart.data.labels = [];
        latencyChart.data.datasets[0].data = [];
        latencyChart.update();
    }
}


async function renderApp(servers = null) {
    if (!db) return; 

    // Nếu không có servers, tự load
    if (!servers) {
        servers = await getAllServers();
    }

    renderServers(servers);
    renderHealthOverview(servers);
    
    const selectedServer = await getSelectedServer();
    renderServerDetails(selectedServer);
    
    if (selectedServer) {
        updateCharts(selectedServer);
    } else {
        // Reset/Empty Charts nếu không có server được chọn
        if (cpuChart) {
            cpuChart.data.labels = [];
            cpuChart.data.datasets[0].data = [];
            cpuChart.update();
            ramChart.data.labels = [];
            ramChart.data.datasets[0].data = [];
            ramChart.update();
            latencyChart.data.labels = [];
            latencyChart.data.datasets[0].data = [];
            latencyChart.update();
        }
    }
}

// =================== 6. Modal / Policy / Script Logic ===================

function showPolicyModal(server) {
    showModal('policyModal');
    document.getElementById('policyTitle').textContent = `Firewall Policy: ${server.name}`;
    renderPolicyTable(server.networkPolicy);

    const addPolicyBtn = document.getElementById('addPolicyBtn');
    addPolicyBtn.onclick = () => {
        const ip = document.getElementById('newPolicyIP').value.trim();
        const port = document.getElementById('newPolicyPort').value.trim();
        const action = document.getElementById('newPolicyAction').value;

        if (!ip || !port) {
            showToast('Please enter both IP/CIDR and Port.', 'WARN');
            return;
        }
        
        const newPolicy = { source: ip, port: parseInt(port, 10), action: action };
        server.networkPolicy.push(newPolicy);
        
        updateServer(server).then(() => {
            renderPolicyTable(server.networkPolicy);
            saveLogEntry('INFO', `Added Network Policy Rule on ${server.name}: ${action} ${ip}:${port}`, server.id);
            document.getElementById('newPolicyIP').value = '';
            document.getElementById('newPolicyPort').value = '';
            showToast('New policy rule added.', 'SUCCESS');
        });
    };
}

function renderPolicyTable(policies) {
    const tbody = document.getElementById('policyTableBody');
    tbody.innerHTML = '';
    policies.forEach((policy, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${policy.source}</td>
            <td>${policy.port}</td>
            <td><span class="status-${policy.action.toLowerCase()}">${policy.action}</span></td>
            <td><button class="btn danger ghost small" data-index="${index}"><i class="fas fa-trash"></i></button></td>
        `;
        row.querySelector('button').addEventListener('click', () => {
            deletePolicyRule(index);
        });
    });
}

async function deletePolicyRule(index) {
    const server = await getSelectedServer();
    if (!server) return;

    const deletedPolicy = server.networkPolicy.splice(index, 1);
    await updateServer(server);
    renderPolicyTable(server.networkPolicy);

    saveLogEntry('WARN', `Removed Network Policy Rule on ${server.name}: ${deletedPolicy[0].action} ${deletedPolicy[0].source}:${deletedPolicy[0].port}`, server.id);
    showToast('Policy rule removed.', 'WARN');
}

function showScriptModal(server) {
    showModal('scriptModal');
    document.getElementById('scriptTitle').textContent = `Health Check Script: ${server.name}`;
    const scriptArea = document.getElementById('healthScriptArea');
    scriptArea.value = server.healthScript;

    document.getElementById('saveScriptBtn').onclick = () => {
        server.healthScript = scriptArea.value;
        updateServer(server).then(() => {
            hideModal('scriptModal');
            saveLogEntry('SYSTEM', `Health Check Script updated on ${server.name}.`, server.id);
            showToast('Health Check Script saved.', 'SUCCESS');
        });
    };

    document.getElementById('resetScriptBtn').onclick = () => {
        if (confirm("Are you sure you want to reset the script to default?")) {
            scriptArea.value = DEFAULT_HEALTH_SCRIPT;
        }
    };
}


// =================== 7. Control Panel Actions ===================

async function simulateSpike() {
    const servers = await getAllServers();
    const txServers = tx('servers', 'readwrite');
    let needsUpdate = false;
    
    servers.forEach(server => {
        if (server.status !== 'down' && server.status !== 'maintenance') {
            server.cpu = Math.min(100, server.cpu + 30 + Math.random() * 20); // Tăng đột ngột CPU
            server.ram = Math.min(100, server.ram + 10 + Math.random() * 10);
            server.latency = Math.max(server.latency, 200 + Math.random() * 100);
            txServers.put(server);
            needsUpdate = true;
        }
    });

    if (needsUpdate) {
        await new Promise(resolve => txServers.transaction.oncomplete = resolve);
        saveLogEntry('CRITICAL', 'Simulated CPU and Latency spike across all active servers!', 'SYSTEM');
        showToast('Simulating Performance Spike!', 'CRITICAL');
        renderApp(servers);
    }
}

async function runSpeedTest() {
    showModal('speedTestModal');
    const statusEl = document.getElementById('speedTestStatus');
    const barEl = document.getElementById('speedBar');
    
    statusEl.textContent = 'Running latency check...';
    barEl.style.width = '10%';
    await new Promise(r => setTimeout(r, 500)); 

    const basePing = 10 + Math.floor(Math.random() * 30) + GLOBAL_LAG_MS();
    statusEl.textContent = `Latency: ${basePing}ms. Running download test...`;
    
    let currentDL = 100 + Math.random() * 500;
    for (let i = 0; i < 5; i++) {
        currentDL = currentDL * 0.95 + Math.random() * 5;
        statusEl.textContent = `Latency: ${basePing}ms. DL: ${currentDL.toFixed(2)} Mbps.`;
        barEl.style.width = `${10 + (i * 20)}%`;
        await new Promise(r => setTimeout(r, 100));
    }

    statusEl.textContent = `Latency: ${basePing}ms. Running upload test...`;
    let currentUL = 50 + Math.random() * 200;
    for (let i = 0; i < 5; i++) {
        currentUL = currentUL * 0.95 + Math.random() * 3;
        statusEl.textContent = `Latency: ${basePing}ms. UL: ${currentUL.toFixed(2)} Mbps.`;
        barEl.style.width = `${60 + (i * 10)}%`;
        await new Promise(r => setTimeout(r, 100));
    }

    const finalDL = currentDL * 0.9;
    const finalUL = currentUL * 0.9;
    statusEl.textContent = `TEST COMPLETE! DL: ${Math.max(0, finalDL).toFixed(2)} Mbps / UL: ${Math.max(0, finalUL).toFixed(2)} Mbps / Ping: ${basePing}ms.`;
    barEl.style.width = '100%';
    
    saveLogEntry('INFO', `Internal Speed Test complete: DL ${Math.max(0, finalDL).toFixed(2)} Mbps / UL ${Math.max(0, finalUL).toFixed(2)} Mbps / Ping ${basePing}ms.`, 'NETWORK');
    setTimeout(() => hideModal('speedTestModal'), 5000);
}

// Backup DB: Export servers and logs to a JSON file
async function backupDB() {
    const servers = await getAllServers();
    const logs = await getLogs('ALL', 9999);
    
    const data = {
        servers: servers,
        logs: logs
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `server_sim_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    saveLogEntry('SYSTEM', 'Database backup downloaded successfully.', 'SYSTEM');
    showToast('Database Backup Complete!', 'SUCCESS');
}

// Export Logs to CSV
async function exportLogsToCSV() {
    const logs = await getLogs('ALL', 9999);
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
    URL.revokeObjectURL(link.href);
    
    showToast('Logs Exported to CSV.', 'INFO');
}

async function rotateKey() {
    if (ENCRYPT) {
        ENC_KEY = Math.random().toString(36).substring(2, 15);
        await setConfig('ENC_KEY', ENC_KEY);
        saveLogEntry('SYSTEM', 'Encryption Key rotated successfully.');
        showToast('Encryption Key Rotated.', 'SUCCESS');
    } else {
        saveLogEntry('WARN', 'Key rotation failed: Encryption is currently disabled.', 'SYSTEM');
        showToast('Encryption is disabled!', 'WARN');
    }
}

async function toggleEncryption() {
    ENCRYPT = !ENCRYPT;
    await setConfig('ENCRYPT', ENCRYPT);
    const btn = document.getElementById('toggleEncryptBtn');

    if (ENCRYPT) {
        if (!ENC_KEY) {
            ENC_KEY = Math.random().toString(36).substring(2, 15);
            await setConfig('ENC_KEY', ENC_KEY);
        }
        btn.innerHTML = `<i class="fas fa-lock"></i> Encryption: ENABLED`;
        btn.classList.replace('ghost', 'success');
        saveLogEntry('SYSTEM', 'Global Encryption ENABLED. New traffic is now secure.');
        showToast('Encryption Enabled!', 'SUCCESS');
    } else {
        btn.innerHTML = `<i class="fas fa-lock-open"></i> Encryption: DISABLED`;
        btn.classList.replace('success', 'ghost');
        saveLogEntry('CRITICAL', 'Global Encryption DISABLED. All traffic is now INSECURE!');
        showToast('Encryption Disabled! Security risk!', 'CRITICAL');
    }
    renderApp();
}

function toggleAutoScale() {
    AUTO_SCALE = !AUTO_SCALE;
    const btn = document.getElementById('autoScaleToggle');
    btn.innerHTML = AUTO_SCALE ? `<i class="fas fa-tachometer-alt"></i> Auto-Scale: ON` : `<i class="fas fa-tachometer-alt"></i> Auto-Scale: OFF`;
    btn.classList.toggle('primary', AUTO_SCALE);
    btn.classList.toggle('ghost', !AUTO_SCALE);
    setConfig('AUTO_SCALE', AUTO_SCALE);
    saveLogEntry('SYSTEM', `Auto-Scale feature ${AUTO_SCALE ? 'ENABLED' : 'DISABLED'}.`);
    showToast(`Auto-Scale ${AUTO_SCALE ? 'Enabled' : 'Disabled'}!`, 'INFO');
}

function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function toggleTheme() {
    IS_DARK_THEME = !IS_DARK_THEME;
    document.body.classList.toggle('light-theme', !IS_DARK_THEME);
    setConfig('THEME', IS_DARK_THEME);
    showToast(`Theme changed to ${IS_DARK_THEME ? 'Dark' : 'Light'}.`, 'INFO');
}

function showToast(message, type = 'INFO') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// =================== 8. Initialization ===================

async function loadConfigs() {
    IS_DARK_THEME = await getConfig('THEME', true);
    ENCRYPT = await getConfig('ENCRYPT', false);
    ENC_KEY = await getConfig('ENC_KEY', null);
    AUTO_SCALE = await getConfig('AUTO_SCALE', false);

    // Apply theme
    document.body.classList.toggle('light-theme', !IS_DARK_THEME);

    // Update buttons based on config
    const autoScaleBtn = document.getElementById('autoScaleToggle');
    autoScaleBtn.innerHTML = AUTO_SCALE ? `<i class="fas fa-tachometer-alt"></i> Auto-Scale: ON` : `<i class="fas fa-tachometer-alt"></i> Auto-Scale: OFF`;
    autoScaleBtn.classList.toggle('primary', AUTO_SCALE);
    autoScaleBtn.classList.toggle('ghost', !AUTO_SCALE);

    const encryptBtn = document.getElementById('toggleEncryptBtn');
    encryptBtn.innerHTML = ENCRYPT ? `<i class="fas fa-lock"></i> Encryption: ENABLED` : `<i class="fas fa-lock-open"></i> Encryption: DISABLED`;
    encryptBtn.classList.toggle('success', ENCRYPT);
    encryptBtn.classList.toggle('ghost', !ENCRYPT);
}

async function initSimulation() {
    SIMULATION_INTERVAL = setInterval(async () => {
        await updateAllServers();
    }, 2000); // Cập nhật mỗi 2 giây
    
    document.getElementById('wsToggle').innerHTML = '<i class="fas fa-pause"></i> Pause Server';
    document.getElementById('wsToggle').classList.replace('primary', 'danger');
    document.getElementById('wsToggle').setAttribute('data-running', '1');
    showToast('Server Started.', 'SUCCESS');
}

function stopSimulation() {
    clearInterval(SIMULATION_INTERVAL);
    SIMULATION_INTERVAL = null;
    document.getElementById('wsToggle').innerHTML = '<i class="fas fa-play"></i> Start Server';
    document.getElementById('wsToggle').classList.replace('danger', 'primary');
    document.getElementById('wsToggle').setAttribute('data-running', '0');
    showToast('Server Paused.', 'WARN');
}

async function initApp() {
    try {
        await openDB();
        await loadConfigs();
        
        // Tạo server khởi tạo nếu chưa có
        const servers = await getAllServers();
        if (servers.length === 0) {
            await addServer('Primary-Web-01');
            await addServer('Data-Store-02');
        }
        
        // Ghi lại danh sách server gốc
        const initialServers = await getAllServers();
        initialServers.forEach(s => ORIGINAL_SERVERS.add(s.id));

        // Load ban đầu
        await renderApp(initialServers);
        updateLogDisplay();

        // Gắn sự kiện Global
        document.getElementById('wsToggle').onclick = () => {
            if (SIMULATION_INTERVAL) {
                stopSimulation();
            } else {
                initSimulation();
            }
        };

        document.getElementById('addServerBtn').onclick = () => addServer('New-Manual-Server');
        document.getElementById('themeToggle').onclick = toggleTheme;
        document.getElementById('autoScaleToggle').onclick = toggleAutoScale;
        document.getElementById('toggleEncryptBtn').onclick = toggleEncryption;
        document.getElementById('rotateKeyBtn').onclick = rotateKey;
        document.getElementById('simulateSpike').onclick = simulateSpike;
        document.getElementById('runSpeedTestBtn').onclick = runSpeedTest;
        document.getElementById('exportLogsBtn').onclick = exportLogsToCSV;
        document.getElementById('logLevelFilter').onchange = (e) => {
            LOG_FILTER_LEVEL = e.target.value;
            updateLogDisplay();
        };
        document.getElementById('backupBtn').onclick = backupDB;


        // Restore DB logic - TÍNH NĂNG NÂNG CAO
        const restoreInput = document.createElement('input');
        restoreInput.type = 'file';
        restoreInput.accept = 'application/json';
        restoreInput.style.display = 'none';
        document.body.appendChild(restoreInput);

        document.getElementById('backupBtn').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm("Restore Database? This will erase all current data.")) {
                restoreInput.click();
            }
        });

        restoreInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (!data.servers || !data.logs) throw new Error("Invalid format");
                    
                    await restoreDB(data);
                    showToast("Database restored successfully! Reloading...", 'SUCCESS');
                    e.target.value = null; // Clear file input
                } catch (error) {
                    showToast("Failed to restore database: Invalid file or format.", 'CRITICAL');
                    console.error("Restore failed:", error);
                }
            };
            reader.readAsText(file);
        }

        async function restoreDB(data) {
            return new Promise(async (resolve, reject) => {
                const req = indexedDB.deleteDatabase(DB_NAME);
                req.onsuccess = async () => {
                    await openDB(); 
                    
                    const serverTx = tx('servers', 'readwrite');
                    data.servers.forEach(server => serverTx.add(server));
                    
                    const logTx = tx('logs', 'readwrite');
                    data.logs.forEach(log => {
                        try {
                            logTx.add(log);
                        } catch (e) {
                            // Ignore ts collision
                        }
                    }); 
                    
                    serverTx.transaction.oncomplete = () => {
                        logTx.transaction.oncomplete = () => {
                            window.location.reload(); 
                            resolve();
                        };
                    };
                    serverTx.transaction.onerror = logTx.transaction.onerror = reject;
                };
                req.onerror = reject;
            });
        }


    } catch (e) {
        console.error("Application Initialization Failed:", e);
        document.getElementById('serverList').innerHTML = '<p class="status-critical">ERROR: Cannot connect to IndexedDB.</p>';
        document.getElementById('wsToggle').disabled = true;
    }
}

window.onload = initApp;