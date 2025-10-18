// GỠ BỎ trình bao bọc 'DOMContentLoaded'

const terminal = document.getElementById('terminal');
const history = document.getElementById('history');
const promptElement = document.getElementById('prompt');
const commandInput = document.getElementById('command-input');

// Mật khẩu
const mainPassHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // 999997
const helpPassHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // 123

// Trạng thái
let state = 'login';
let currentUser = 'admin';
let previousUser = null;
let commandHistory = [];
let historyIndex = -1;
let aliases = { 'll': 'ls -l -a' };
let env = { 'USER': 'admin', 'HOME': '~' };

// Trạng thái đào coin
let isMining = false;
let miningInterval = null;
let db = null;
let currentBalance = 0.0;
const BLOCK_REWARD = 0.01;
const BLOCK_FIND_CHANCE = 0.02;
let shareCount = 0;

// Theme
const availableThemes = { 'matrix': 'Classic green.', 'hacker': 'Aggressive crimson.', 'cyberpunk': 'Neon on purple.', 'solarized-light': 'For daytime.', 'dracula': 'Popular dark theme.' };

// Dữ liệu giả lập cho wget
const remoteFiles = {
    'https://example.com/data.json': '{"message": "Hello from the web!"}',
    'https://nguyenthuanit.com/banner.txt': 'Welcome to my portfolio!'
};

// --- Cấu trúc File System và Process chuyên nghiệp ---
const fileSystem = {
    'documents': { type: 'dir', content: { 'project_alpha.txt': { type: 'file', content: 'Đây là nội dung của dự án Alpha.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-15' }, 'notes.log': { type: 'file', content: 'Ghi chú quan trọng: Cập nhật hệ thống vào cuối tuần.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-16' } }, owner: 'admin', group: 'admin', permissions: '755', modified: '2025-10-15' },
    'images': { type: 'dir', content: { 'avatar.png': { type: 'file', content: 'Đây là file ảnh giả lập.', owner: 'guest', group: 'users', permissions: '644', modified: '2025-09-20' } }, owner: 'admin', group: 'admin', permissions: '755', modified: '2025-09-20' },
    'README.md': { type: 'file', content: 'Chào mừng bạn đến với terminal giả lập.\nGõ `help` để xem các lệnh.', owner: 'root', group: 'root', permissions: '644', modified: '2025-09-01' },
    '.profile': { type: 'file', content: 'alias ll="ls -l -a"', owner: 'root', group: 'root', permissions: '644', modified: '2025-09-01' }
};
let currentPath = [];

let processes = [
    { pid: 101, user: 'root', cpu: '5.2', mem: '15.3', command: '/sbin/init' },
    { pid: 254, user: 'admin', cpu: '2.1', mem: '10.1', command: '/usr/bin/sshd' },
    { pid: 288, user: 'admin', cpu: '0.8', mem: '8.5', command: '-bash' },
    { pid: 312, user: 'www', cpu: '1.5', mem: '5.0', command: '/usr/sbin/nginx' }
];

// --- CÁC HÀM HELPER ---
function print(text, isHTML = false) {
    const p = document.createElement('p');
    if (isHTML) p.innerHTML = text;
    else p.textContent = text;
    history.appendChild(p);
    terminal.scrollTop = terminal.scrollHeight;
}

function type(text, callback) {
    const p = document.createElement('p');
    history.appendChild(p);
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            p.textContent += text[i];
            i++;
            terminal.scrollTop = terminal.scrollHeight;
        } else {
            clearInterval(interval);
            if (callback) callback();
        }
    }, 30);
}

function updatePrompt() {
    const pathString = currentPath.length > 0 ? `/${currentPath.join('/')}` : '';
    const homeSymbol = (pathString === '') ? '~' : `~${pathString}`;
    const promptSymbol = currentUser === 'root' || currentUser === 'admin' ? '#' : '$';
    promptElement.textContent = `${currentUser}@NguyenthuanIT:${homeSymbol}${promptSymbol}`;
}

function getCurrentDirectory(pathArray = currentPath) {
    return pathArray.reduce((dir, part) => dir[part].content, fileSystem);
}

function findNode(path) {
    const parts = path.split('/').filter(p => p && p !== '.');
    let currentDir = getCurrentDirectory();
    let parent = { content: fileSystem };
    let finalPart = null;

    for (const part of parts) {
        if (currentDir && currentDir[part]) {
            parent = { content: currentDir };
            finalPart = part;
            currentDir = currentDir[part].content;
        } else {
            return null;
        }
    }
    const nodeName = path.split('/').pop();
    const node = findNodeByPath(path);
    if (!node) return null;
    
    return { node: node, parent: parent.content, name: nodeName };
}

function findNodeByPath(path) {
    let parts = path.split('/').filter(p => p);
    if (path.startsWith('/')) { // Absolute path
        return parts.reduce((node, part) => (node && node.content && node.content[part]) ? node.content[part] : null, { content: fileSystem });
    } else { // Relative path
        let current = getCurrentDirectory();
        return parts.reduce((node, part) => (node && node[part]) ? node[part] : null, current);
    }
}

function checkPermissions(node, user, action) {
    if (!node || !node.permissions || !node.owner) return false;
    if (user === 'root' || user === 'admin') return true;
    
    const owner = node.owner;
    const perms = node.permissions;
    let requiredPerm;

    switch (action) {
        case 'read': requiredPerm = 4; break;
        case 'write': requiredPerm = 2; break;
        case 'execute': requiredPerm = 1; break;
        default: return false;
    }
    const permDigit = (user === owner) ? perms[0] : perms[2];
    
    return (parseInt(permDigit, 10) & requiredPerm) !== 0;
}

// --- XỬ LÝ SỰ KIỆN BÀN PHÍM VÀ LỊCH SỬ LỆNH ---
commandInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const command = commandInput.value.trim();
        commandInput.value = '';
        
        if (state === 'login') {
            print(`${promptElement.textContent} ********`);
            handleLogin(command);
        } else if (state === 'help_login') {
             print(`${promptElement.textContent} ********`);
             handleHelpLogin(command);
        } else if (command) {
            if (commandHistory[0] !== command) {
               commandHistory.unshift(command);
            }
            historyIndex = -1;
            print(`${promptElement.textContent} ${command}`);
            executeCommand(command);
        } else {
             print(`${promptElement.textContent}`);
             updatePrompt();
        }
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            commandInput.value = commandHistory[historyIndex];
        }
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = -1;
            commandInput.value = '';
        }
    } else if (event.key === 'Tab') {
        event.preventDefault();
        handleTabCompletion();
    }
});

function handleTabCompletion() {
    const text = commandInput.value;
    const parts = text.split(' ');
    const currentPart = parts[parts.length - 1];
    
    if (parts.length === 1) {
        const matchingCommands = Object.keys(commands).filter(cmd => cmd.startsWith(currentPart));
        if (matchingCommands.length === 1) {
            commandInput.value = matchingCommands[0] + ' ';
        } else if (matchingCommands.length > 1) {
            print(`${promptElement.textContent} ${text}`);
            print(matchingCommands.join('  '));
            updatePrompt();
        }
    } else {
        const currentDir = getCurrentDirectory();
        const matchingFiles = Object.keys(currentDir).filter(file => file.startsWith(currentPart));
        if (matchingFiles.length === 1) {
            parts[parts.length - 1] = matchingFiles[0];
            commandInput.value = parts.join(' ') + ' ';
        } else if (matchingFiles.length > 1) {
            print(`${promptElement.textContent} ${text}`);
            print(matchingFiles.join('  '));
            updatePrompt();
        }
    }
}

// --- XỬ LÝ ĐĂNG NHẬP ---
function handleLogin(password) {
    const enteredHash = CryptoJS.SHA256(password).toString();
    setTimeout(() => {
        if (enteredHash === mainPassHash) {
            print('Authentication successful. Welcome, admin!');
            state = 'command';
            commandInput.type = 'text';
            executeCommand('neofetch');
        } else {
            print('Access denied.');
            updatePrompt();
        }
    }, 300);
}

function handleHelpLogin(password) {
    const enteredHash = CryptoJS.SHA256(password).toString();
    setTimeout(() => {
        if (enteredHash === helpPassHash) {
            print('Access granted. Displaying help menu...');
            showHelp();
        } else {
            print('Access to help menu denied.');
        }
        state = 'command';
        commandInput.type = 'text';
        updatePrompt();
    }, 300);
}

// --- BỘ PHÂN TÍCH VÀ THỰC THI LỆNH ---
async function executeCommand(fullCommand) {
    if (isMining && fullCommand !== 'mine stop') {
        print("Miner is running. Type 'mine stop' to exit.");
        updatePrompt();
        return;
    }

    const pipeSegments = fullCommand.split('|').map(s => s.trim());
    let stdin = '';

    for (let i = 0; i < pipeSegments.length; i++) {
        let segment = pipeSegments[i];
        let stdout = '';
        let redirect = null;
        let append = false;

        if (segment.includes('>>')) {
            [segment, redirect] = segment.split('>>').map(s => s.trim());
            append = true;
        } else if (segment.includes('>')) {
            [segment, redirect] = segment.split('>').map(s => s.trim());
        }

        let [cmd, ...args] = segment.split(/\s+/).filter(Boolean);
        
        args = args.map(arg => {
            if (arg.startsWith('$') && env[arg.substring(1)]) {
                return env[arg.substring(1)];
            }
            return arg;
        });
        
        if (aliases[cmd]) {
            const aliasCmd = aliases[cmd].split(' ');
            cmd = aliasCmd[0];
            args = [...aliasCmd.slice(1), ...args];
        }

        if (commands[cmd]) {
            const result = await commands[cmd](args, stdin);
            stdout = result === undefined ? '' : String(result);
        } else {
            print(`-bash: ${cmd}: command not found.`);
            updatePrompt();
            return;
        }
        
        if (i < pipeSegments.length - 1) {
            stdin = stdout;
        } else {
            if (redirect) {
                handleRedirection(redirect, stdout, append);
            } else if (stdout) {
                print(stdout, true);
            }
        }
    }
    updatePrompt();
}

function handleRedirection(fileName, content, append) {
    const currentDir = getCurrentDirectory();
    if (currentDir[fileName] && currentDir[fileName].type === 'dir') {
        print(`-bash: ${fileName}: Is a directory`);
        return;
    }
    
    const node = currentDir[fileName];
    if (node && !checkPermissions(node, currentUser, 'write')) {
        print(`-bash: ${fileName}: Permission denied`);
        return;
    }

    if (node && append) {
        node.content += (node.content ? '\n' : '') + content;
    } else {
        if (!node) {
             currentDir[fileName] = { type: 'file', content: '', owner: currentUser, group: 'admin', permissions: '644' };
        }
        currentDir[fileName].content = content;
    }
    currentDir[fileName].modified = new Date().toISOString().slice(0, 10);
    saveFileSystemToDB(); // <-- LƯU THAY ĐỔI
}

// --- HÀM CHO TÍNH NĂNG LƯU TRỮ (COIN VÀ FILE SYSTEM) ---
function initDB(callback) {
    const request = indexedDB.open('TerminalCoinDB', 2); // Tăng phiên bản lên 2
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('wallet')) {
            db.createObjectStore('wallet', { keyPath: 'id' });
        }
        // Thêm kho lưu trữ cho hệ thống tệp
        if (!db.objectStoreNames.contains('fs')) {
            db.createObjectStore('fs', { keyPath: 'id' });
        }
    };
    request.onsuccess = (event) => {
        db = event.target.result;
        if (callback) callback();
    };
    request.onerror = (event) => console.error('Database error:', event.target.errorCode);
}

function getBalanceFromDB() {
    if (!db) return;
    const transaction = db.transaction(['wallet'], 'readonly');
    const store = transaction.objectStore('wallet');
    const request = store.get('main_balance');
    request.onsuccess = () => {
        currentBalance = request.result ? request.result.value : 0.0;
    };
}

function saveBalanceToDB(balance) {
    if (!db) return;
    const transaction = db.transaction(['wallet'], 'readwrite');
    const store = transaction.objectStore('wallet');
    store.put({ id: 'main_balance', value: balance });
}

// Hàm mới: Lưu hệ thống tệp vào DB
function saveFileSystemToDB() {
    if (!db) return;
    const transaction = db.transaction(['fs'], 'readwrite');
    const store = transaction.objectStore('fs');
    store.put({ id: 'root', data: fileSystem });
    console.log("File system saved to IndexedDB.");
}

// Hàm mới: Tải hệ thống tệp từ DB
function loadFileSystemFromDB(callback) {
    if (!db) return;
    const transaction = db.transaction(['fs'], 'readonly');
    const store = transaction.objectStore('fs');
    const request = store.get('root');

    request.onsuccess = () => {
        if (request.result && request.result.data) {
            // Nếu có dữ liệu trong DB, ghi đè lên đối tượng mặc định
            Object.assign(fileSystem, request.result.data);
            console.log("File system loaded from IndexedDB.");
        } else {
            // Nếu không, lưu hệ thống tệp mặc định vào DB cho lần sau
            console.log("No file system in DB, saving default one.");
            saveFileSystemToDB();
        }
        if (callback) callback();
    };
    request.onerror = (event) => {
        console.error("Failed to load file system:", event.target.errorCode);
        if (callback) callback(); // Vẫn tiếp tục dù có lỗi
    };
}

function simulateMining() {
    if (Math.random() < BLOCK_FIND_CHANCE) {
        currentBalance += BLOCK_REWARD;
        saveBalanceToDB(currentBalance);
        const blockHeight = Math.floor(Math.random() * 10000 + 700000);
        print(`-- BLOCK FOUND -- Height: ${blockHeight} | Reward: ${BLOCK_REWARD.toFixed(8)} BTC!`);
        print(`Total Balance: ${currentBalance.toFixed(8)} BTC`);
        shareCount = 0;
        return;
    }
    shareCount++;
    const minedAmount = Math.random() * 0.00005 + 0.00001;
    currentBalance += minedAmount;
    saveBalanceToDB(currentBalance);
    const hashrate = (Math.random() * 150 + 450).toFixed(2);
    const difficulty = (Math.random() * 50 + 100).toFixed(4);
    const ping = Math.floor(Math.random() * 50 + 20);
    print(`[OK] ${shareCount} | ACCEPTED | ${hashrate} MH/s | diff: ${difficulty} | ping: ${ping}ms`);
}

// --- BỘ ĐIỀU KHIỂN LỆNH CHÍNH ---
let commands = {};

// --- KHỞI ĐỘNG TERMINAL ---
function start() {
    commandInput.value = '';
    commandInput.type = 'password';
    
    initDB(() => {
        getBalanceFromDB(); // Tải số dư
        loadFileSystemFromDB(() => { // Tải hệ thống tệp
            // Tiếp tục quá trình khởi động sau khi đã tải xong mọi thứ
            type('booting system...', () => {
                type('Connecting to 103.199.16.113 (Bandung)...', () => {
                    type('Connection established.', () => {
                        print('Username: admin');
                        promptElement.textContent = 'password:';
                        commandInput.focus();
                    });
                });
            });
        });
    });
}

function showHelp(){
    print(`
<pre>
--- Navigation & File System ---
  ls [-l, -a]      : List files and directories.
  cd [dir]         : Change directory.
  cat [file]...    : Display content of one or more files.
  tree [dir]       : Show directory structure as a tree.
  mkdir [dir]      : Create a new directory.
  touch [file]     : Create a new empty file.
  rm [-r] [target] : Remove a file or directory.
  grep [pat] [file]: Search for a pattern in a file.
  chmod [mode] [f] : Change file permissions (e.g., 755).
  chown [user] [f] : Change file owner.

--- System & Utility ---
  neofetch         : Display system information.
  ps / top         : List running processes.
  kill [PID]       : Terminate a process.
  whoami/su/exit   : Manage simulated users.
  alias [def]      : Create a command shortcut.
  export [def]     : Set an environment variable.
  printenv         : Print environment variables.
  history          : Show command history.
  wget [url]       : Download a file (simulated).
  clear            : Clear the terminal history.
  logout           : Log out from the session.
</pre>
    `, true);
}

function showNeofetch() {
     return `<pre>
     .--.      ${currentUser}@NguyenthuanIT
    |o_o |     ---------------
    |:_/ |     OS: Linux Live x86_64
   //   \\ \\    Host: Virtual Machine v2.1
  (|     | )   Kernel: 5.15.0-custom
 /'\\_   _/\`\\   Uptime: 2 hours, 15 mins
 \\___)=(___/   CPU: Xeon E5-2699v4 3.6Ghz
               Memory: 4096MB / 131072MB</pre>`;
}

terminal.addEventListener('click', () => commandInput.focus());

// Bắt đầu chạy terminal
start();