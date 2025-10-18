// --- CÁC BIẾN TOÀN CỤC VÀ TRẠNG THÁI ---
const terminal = document.getElementById('terminal');
const history = document.getElementById('history');
const promptElement = document.getElementById('prompt');
const commandInput = document.getElementById('command-input');

// Mật khẩu (đã mã hóa)
const mainPassHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // Mật khẩu là: 999997
const helpPassHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // Mật khẩu là: 123

// Trạng thái của terminal
let state = 'login';
let currentUser = 'admin';
let previousUser = null;
let commandHistory = [];
let historyIndex = -1;
let aliases = { 'll': 'ls -l -a' };
let env = { 'USER': 'admin', 'HOME': '~' };

// Trạng thái đào coin và CSDL
let isMining = false;
let miningInterval = null;
let db = null;
let currentBalance = 0.0;
const BLOCK_REWARD = 0.01;
const BLOCK_FIND_CHANCE = 0.02;
let shareCount = 0;

// Các theme có sẵn
const availableThemes = { 'matrix': 'Classic green.', 'hacker': 'Aggressive crimson.', 'cyberpunk': 'Neon on purple.', 'solarized-light': 'For daytime.', 'dracula': 'Popular dark theme.' };

// Dữ liệu giả lập cho lệnh wget
const remoteFiles = {
    'https://example.com/data.json': '{"message": "Hello from the web!"}',
    'https://nguyenthuanit.com/banner.txt': 'Welcome to my portfolio!'
};

// --- HỆ THỐNG TỆP (FILE SYSTEM) MẶC ĐỊNH ---
const fileSystem = {
    'documents': { type: 'dir', content: { 'project_alpha.txt': { type: 'file', content: 'Đây là nội dung của dự án Alpha.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-15' }, 'notes.log': { type: 'file', content: 'Ghi chú quan trọng: Cập nhật hệ thống vào cuối tuần.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-16' } }, owner: 'admin', group: 'admin', permissions: '755', modified: '2025-10-15' },
    'images': { type: 'dir', content: { 'avatar.png': { type: 'file', content: 'Đây là file ảnh giả lập.', owner: 'guest', group: 'users', permissions: '644', modified: '2025-09-20' } }, owner: 'admin', group: 'admin', permissions: '755', modified: '2025-09-20' },
    'README.md': { type: 'file', content: 'Chào mừng bạn đến với terminal giả lập.\nGõ `help` để xem các lệnh.', owner: 'root', group: 'root', permissions: '644', modified: '2025-09-01' },
    '.profile': { type: 'file', content: 'alias ll="ls -l -a"', owner: 'root', group: 'root', permissions: '644', modified: '2025-09-01' },
    'file1.txt': { type: 'file', content: 'Đây là nội dung mẫu cho file 1.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-18' },
    'file2.txt': { type: 'file', content: 'Đây là nội dung mẫu cho file 2.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-18' }
};
// Tạo một nút gốc ảo để hệ thống tệp có cấu trúc nhất quán
const rootNode = { type: 'dir', content: fileSystem, owner: 'root', group: 'root', permissions: '755' };
let currentPath = []; // Mảng lưu đường dẫn hiện tại, vd: ['documents']

// Danh sách tiến trình giả lập
let processes = [
    { pid: 101, user: 'root', cpu: '5.2', mem: '15.3', command: '/sbin/init' },
    { pid: 254, user: 'admin', cpu: '2.1', mem: '10.1', command: '/usr/bin/sshd' },
    { pid: 288, user: 'admin', cpu: '0.8', mem: '8.5', command: '-bash' },
    { pid: 312, user: 'www', cpu: '1.5', mem: '5.0', command: '/usr/sbin/nginx' }
];

// --- CÁC HÀM HỖ TRỢ (HELPER FUNCTIONS) ---
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
    const promptSymbol = (currentUser === 'root' || currentUser === 'admin') ? '#' : '$';
    promptElement.textContent = `${currentUser}@NguyenthuanIT:${homeSymbol}${promptSymbol}`;
}

// --- CÁC HÀM LIÊN QUAN ĐẾN FILE SYSTEM ---
function getCurrentDirectory() {
    return currentPath.reduce((node, part) => (node && node.content && node.content[part]) || node, rootNode);
}

function findNodeByPath(path) {
    if (!path) return null;
    let parts = path.split('/').filter(p => p);
    let startNode = path.startsWith('/') ? rootNode : getCurrentDirectory();
    return parts.reduce((node, part) => (node && node.content && node.content[part]) ? node.content[part] : null, startNode);
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

// --- XỬ LÝ SỰ KIỆN NHẬP LỆNH ---
commandInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const command = commandInput.value.trim();
        commandInput.value = '';
        if (state === 'login' || state === 'help_login') {
            print(`${promptElement.textContent} ********`);
            if (state === 'login') handleLogin(command);
            else handleHelpLogin(command);
        } else if (command) {
            if (commandHistory[0] !== command) commandHistory.unshift(command);
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
    const currentDirNode = getCurrentDirectory();
    const currentDirContent = currentDirNode.content || currentDirNode;

    if (parts.length === 1) { // Hoàn thành lệnh
        const matchingCommands = Object.keys(commands).filter(cmd => cmd.startsWith(currentPart));
        if (matchingCommands.length === 1) {
            commandInput.value = matchingCommands[0] + ' ';
        } else if (matchingCommands.length > 1) {
            print(`${promptElement.textContent} ${text}`);
            print(matchingCommands.join('  '));
            updatePrompt();
        }
    } else { // Hoàn thành tên file/thư mục
        const matchingFiles = Object.keys(currentDirContent).filter(file => file.startsWith(currentPart));
        if (matchingFiles.length === 1) {
            parts[parts.length - 1] = matchingFiles[0];
            commandInput.value = parts.join(' ') + (currentDirContent[matchingFiles[0]].type === 'dir' ? '/' : ' ');
        } else if (matchingFiles.length > 1) {
            print(`${promptElement.textContent} ${text}`);
            print(matchingFiles.join('  '));
            updatePrompt();
        }
    }
}

// --- XỬ LÝ ĐĂNG NHẬP VÀ HELP ---
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

    // NÂNG CẤP: Xử lý lịch sử lệnh !! và !n
    if (fullCommand.startsWith('!')) {
        let historyCmd = '';
        if (fullCommand === '!!') {
            if (commandHistory.length > 0) historyCmd = commandHistory[0];
        } else {
            const index = parseInt(fullCommand.substring(1));
            // Lịch sử được lưu ngược, nên cần tính toán lại index
            if (!isNaN(index) && index > 0 && index <= commandHistory.length) {
                historyCmd = commandHistory.slice(0).reverse()[index - 1];
            }
        }
        if (historyCmd) {
            print(`${promptElement.textContent} ${historyCmd}`);
            fullCommand = historyCmd;
        } else {
            print(`-bash: ${fullCommand}: event not found`);
            updatePrompt();
            return;
        }
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

        const argsRegex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
        let parts = segment.match(argsRegex) || [];
        parts = parts.map(arg => arg.replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
        let [cmd, ...args] = parts;
        args = args.map(arg => arg.startsWith('$') && env[arg.substring(1)] ? env[arg.substring(1)] : arg);
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
    const currentDirNode = getCurrentDirectory();
    const currentDirContent = currentDirNode.content || currentDirNode;

    if (currentDirContent[fileName] && currentDirContent[fileName].type === 'dir') {
        print(`-bash: ${fileName}: Is a directory`);
        return;
    }
    const node = currentDirContent[fileName];
    if (node && !checkPermissions(node, currentUser, 'write')) {
        print(`-bash: ${fileName}: Permission denied`);
        return;
    }

    if (node && append) {
        node.content += (node.content ? '\n' : '') + content;
    } else {
        if (!node) {
            currentDirContent[fileName] = { type: 'file', content: '', owner: currentUser, group: 'admin', permissions: '644' };
        }
        currentDirContent[fileName].content = content;
    }
    currentDirContent[fileName].modified = new Date().toISOString().slice(0, 10);
    saveFileSystemToDB();
}

// NÂNG CẤP: Hàm cho trình soạn thảo Nano
function enterEditorMode(fileName, content) {
    const editorOverlay = document.getElementById('editor-overlay');
    const editorTextarea = document.getElementById('editor-textarea');
    const editorStatusbar = document.getElementById('editor-statusbar');
    const inputLine = document.getElementById('input-line');

    state = 'editor';
    inputLine.style.display = 'none';
    editorOverlay.style.display = 'flex';
    editorTextarea.value = content;
    editorTextarea.focus();
    editorStatusbar.textContent = `File: ${fileName} | Press Ctrl+S to Save, Ctrl+X to Exit`;

    const handleEditorKeys = (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            const newContent = editorTextarea.value;
            handleRedirection(fileName, newContent, false);
            editorStatusbar.textContent = `Saved ${fileName}!`;
        }
        if (e.ctrlKey && e.key === 'x') {
            e.preventDefault();
            editorOverlay.style.display = 'none';
            inputLine.style.display = 'flex';
            state = 'command';
            commandInput.focus();
            editorTextarea.removeEventListener('keydown', handleEditorKeys);
            updatePrompt();
        }
    };
    editorTextarea.addEventListener('keydown', handleEditorKeys);
}


// --- CÁC HÀM LƯU TRỮ DỮ LIỆU VỚI INDEXEDDB ---
function initDB(callback) {
    const request = indexedDB.open('TerminalDataDB', 2);
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('wallet')) db.createObjectStore('wallet', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('fs')) db.createObjectStore('fs', { keyPath: 'id' });
    };
    request.onsuccess = (event) => {
        db = event.target.result;
        if (callback) callback();
    };
    request.onerror = (event) => console.error('Database error:', event.target.errorCode);
}

function getBalanceFromDB(callback) {
    if (!db) return;
    const request = db.transaction(['wallet'], 'readonly').objectStore('wallet').get('main_balance');
    request.onsuccess = () => {
        currentBalance = request.result ? request.result.value : 0.0;
        if (callback) callback();
    };
}

function saveBalanceToDB(balance) {
    if (!db) return;
    db.transaction(['wallet'], 'readwrite').objectStore('wallet').put({ id: 'main_balance', value: balance });
}

function saveFileSystemToDB() {
    if (!db) return;
    db.transaction(['fs'], 'readwrite').objectStore('fs').put({ id: 'root', data: fileSystem });
}

function loadFileSystemFromDB(callback) {
    if (!db) return;
    const request = db.transaction(['fs'], 'readonly').objectStore('fs').get('root');
    request.onsuccess = () => {
        if (request.result && request.result.data) {
            Object.assign(fileSystem, request.result.data);
            console.log("File system loaded from IndexedDB.");
        } else {
            console.log("No file system in DB, saving default one.");
            saveFileSystemToDB();
        }
        if (callback) callback();
    };
    request.onerror = (event) => {
        console.error("Failed to load file system:", event.target.errorCode);
        if (callback) callback();
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

// --- BỘ ĐIỀU KHIỂN LỆNH VÀ KHỞI ĐỘNG ---
let commands = {};

function start() {
    commandInput.value = '';
    commandInput.type = 'password';
    initDB(() => {
        getBalanceFromDB(() => {
            loadFileSystemFromDB(() => {
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
    });
}

function showHelp() {
    print(`
<pre>
--- Navigation & File System ---
  ls [-l, -a]      : List files and directories.
  cd [dir]         : Change directory.
  cat [file]...    : Display content of one or more files.
  tree [dir]       : Show directory structure as a tree.
  mkdir [dir]      : Create a new directory.
  touch [file]..   : Create new empty files.
  rm [-r] [target] : Remove a file or directory.
  cp [src] [dest]  : Copy a file or directory.
  mv [src] [dest]  : Move or rename a file or directory.
  nano [file]      : Edit a text file.
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
  !! / !n          : Rerun previous commands.
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