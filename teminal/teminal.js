// --- CÁC BIẾN TOÀN CỤC VÀ TRẠNG THÁI ---
const terminal = document.getElementById('terminal');
const history = document.getElementById('history');
const promptElement = document.getElementById('prompt');
const commandInput = document.getElementById('command-input');

// Mật khẩu (đã mã hóa)
const mainPassHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // Mật khẩu là: 999997
const helpPassHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // Mật khẩu là: 123

// Trạng thái của terminal
let state = 'command';
let currentUser = 'admin';
let previousUser = null;
let commandHistory = [];
let historyIndex = -1;
let aliases = { 'll': 'ls -l -a' };
let env = { 
    'USER': 'admin', 
    'HOME': '~',
    'PS1': '\\u@\\h:\\w\\$ ', // Cải tiến: Thêm PS1
    'PATH': '/usr/bin' // Cải tiến: Thêm PATH
};

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

// Dữ liệu giả lập cho lệnh wget/curl
const remoteFiles = {
    'https://example.com/data.json': '{"message": "Hello from the web!"}',
    'https://nguyenthuanit.com/banner.txt': 'Welcome to my portfolio!',
    'https://api.github.com/users/google': '{"login": "google", "id": 1342004, "type": "Organization"}'
};

// --- HỆ THỐNG TỆP (FILE SYSTEM) MẶC ĐỊNH ---
const fileSystem = {
    'documents': { type: 'dir', content: { 'project_alpha.txt': { type: 'file', content: 'Đây là nội dung của dự án Alpha.\nDòng 2.\nDòng 3.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-15' }, 'notes.log': { type: 'file', content: 'Ghi chú quan trọng: Cập nhật hệ thống vào cuối tuần.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-16' } }, owner: 'admin', group: 'admin', permissions: '755', modified: '2025-10-15' },
    'images': { type: 'dir', content: { 'avatar.png': { type: 'file', content: 'Đây là file ảnh giả lập.', owner: 'guest', group: 'users', permissions: '644', modified: '2025-09-20' } }, owner: 'admin', group: 'admin', permissions: '755', modified: '2025-09-20' },
    'README.md': { type: 'file', content: 'Chào mừng bạn đến với terminal giả lập.\nGõ `help` để xem các lệnh.', owner: 'root', group: 'root', permissions: '644', modified: '2025-09-01' },
    '.profile': { type: 'file', content: 'alias ll="ls -l -a"\nexport PS1="\\u@\\h:\\w\\$ "', owner: 'root', group: 'root', permissions: '644', modified: '2025-09-01' },
    'file1.txt': { type: 'file', content: 'Đây là nội dung mẫu cho file 1.\ndòng này chứa từ khóa "grep".\ndòng này thì không.\ncuối cùng là grep.', owner: 'admin', group: 'admin', permissions: '644', modified: '2025-10-18' },
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

// CẢI TIẾN: Thêm dữ liệu cho lệnh 'man'
const manPages = {
    'ls': 'NAME\n  ls - list directory contents\n\nSYNOPSIS\n  ls [OPTION]... [FILE]...\n\nDESCRIPTION\n  List information about the FILEs (the current directory by default).\n\n  -a, --all\n      do not ignore entries starting with .\n  -l\n      use a long listing format',
    'cd': 'NAME\n  cd - change the shell working directory\n\nSYNOPSIS\n  cd [DIRECTORY]\n\nDESCRIPTION\n  Change the current directory to DIRECTORY. The default DIRECTORY is the value of the HOME shell variable.\n  Use "cd .." to go up one directory.',
    'cat': 'NAME\n  cat - concatenate files and print on the standard output\n\nSYNOPSIS\n  cat [FILE]...\n\nDESCRIPTION\n  Concatenate FILE(s) to standard output.',
    'grep': 'NAME\n  grep - print lines matching a pattern\n\nSYNOPSIS\n  grep [OPTIONS] PATTERN [FILE]...\n\nDESCRIPTION\n  grep searches for PATTERN in each FILE.\n\n  -i, --ignore-case\n      ignore case distinctions\n  -n, --line-number\n      prefix each line of output with the 1-based line number\n  -r, --recursive\n      read all files under each directory, recursively',
    'mkdir': 'NAME\n  mkdir - make directories\n\nSYNOPSIS\n  mkdir [DIRECTORY]...\n\nDESCRIPTION\n  Create the DIRECTORY(ies), if they do not already exist.',
    'rm': 'NAME\n  rm - remove files or directories\n\nSYNOPSIS\n  rm [OPTION]... [FILE]...\n\nDESCRIPTION\n  rm removes each specified file.\n\n  -r, -R, --recursive\n      remove directories and their contents recursively',
    'touch': 'NAME\n  touch - change file timestamps\n\nSYNOPSIS\n  touch [FILE]...\n\nDESCRIPTION\n  Update the access and modification times of each FILE to the current time. A FILE argument that does not exist is created empty.',
    'mv': 'NAME\n  mv - move (rename) files\n\nSYNOPSIS\n  mv [SOURCE] [DEST]\n\nDESCRIPTION\n  Rename SOURCE to DEST, or move SOURCE(s) to DIRECTORY.',
    'cp': 'NAME\n  cp - copy files and directories\n\nSYNOPSIS\n  cp [OPTION]... [SOURCE] [DEST]\n\nDESCRIPTION\n  Copy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY.\n\n  -r, -R, --recursive\n      copy directories recursively',
    'pwd': 'NAME\n  pwd - print name of current/working directory\n\nDESCRIPTION\n  Print the full filename of the current working directory.',
    'find': 'NAME\n  find - search for files in a directory hierarchy\n\nSYNOPSIS\n  find [PATH] [EXPRESSION]\n\nDESCRIPTION\n  (Simulated) Searches the directory tree rooted at PATH.\n\n  -name [PATTERN]\n      (Simulated) Find files matching PATTERN.',
    'wc': 'NAME\n  wc - print newline, word, and byte counts for each file\n\nSYNOPSIS\n  wc [OPTION]... [FILE]...\n\nDESCRIPTION\n  -l, --lines\n      print the newline counts\n  -w, --words\n      print the word counts\n  -c, --bytes\n      print the byte counts',
    'head': 'NAME\n  head - output the first part of files\n\nSYNOPSIS\n  head [OPTION]... [FILE]...\n\nDESCRIPTION\n  Print the first 10 lines of each FILE to standard output.\n\n  -n, --lines=[-]K\n      print the first K lines instead of the first 10',
    'tail': 'NAME\n  tail - output the last part of files\n\nSYNOPSIS\n  tail [OPTION]... [FILE]...\n\nDESCRIPTION\n  Print the last 10 lines of each FILE to standard output.\n\n  -n, --lines=[-]K\n      print the last K lines instead of the last 10',
    'man': 'NAME\n  man - an interface to the on-line reference manuals\n\nSYNOPSIS\n  man [COMMAND]\n\nDESCRIPTION\n  man is the system\'s manual pager. (This is a simulation.)',
    'ping': 'NAME\n  ping - send ICMP ECHO_REQUEST to network hosts\n\nSYNOPSIS\n  ping [HOST]\n\nDESCRIPTION\n  (Simulated) Pings the specified host 4 times.',
    'curl': 'NAME\n  curl - transfer a URL\n\nSYNOPSIS\n  curl [URL]\n\nDESCRIPTION\n  (Simulated) Fetches content from the URL and displays it on stdout.',
    'wget': 'NAME\n  wget - The non-interactive network downloader.\n\nSYNOPSIS\n  wget [URL]\n\nDESCRIPTION\n  (Simulated) Downloads content from the URL and saves it to a local file.'
};


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

// CẢI TIẾN: Cập nhật prompt dựa trên biến môi trường PS1
function updatePrompt() {
    let pathString = '/' + currentPath.join('/');
    if (pathString === '/') pathString = ''; // Gốc là /
    const homeSymbol = (pathString === '') ? '~' : `~${pathString}`;
    
    // Phân tích PS1
    const host = 'NguyenthuanIT';
    const promptSymbol = (currentUser === 'root' || currentUser === 'admin') ? '#' : '$';
    
    let promptText = env['PS1'] || '\\u@\\h:\\w\\$ ';
    promptText = promptText.replace(/\\u/g, currentUser);
    promptText = promptText.replace(/\\h/g, host);
    promptText = promptText.replace(/\\w/g, homeSymbol);
    promptText = promptText.replace(/\\\$/g, promptSymbol);

    promptElement.textContent = promptText;
}

// --- CÁC HÀM LIÊN QUAN ĐẾN FILE SYSTEM ---
function getCurrentDirectory() {
    return currentPath.reduce((node, part) => (node && node.content && node.content[part]) || node, rootNode);
}

// CẢI TIẾN: Hàm tìm node, hỗ trợ cả đường dẫn tuyệt đối và tương đối
function findNodeByPath(path) {
    if (!path) return null;
    
    let startNode;
    let parts;

    if (path.startsWith('/')) {
        startNode = rootNode;
        parts = path.substring(1).split('/').filter(p => p);
    } else if (path.startsWith('~')) {
         startNode = rootNode;
         parts = path.substring(1).split('/').filter(p => p);
    } else {
        startNode = getCurrentDirectory();
        parts = path.split('/').filter(p => p);
    }

    if (path === '.' || path === '') return startNode;
    if (path === '..') {
        if (currentPath.length === 0) return rootNode;
        const parentPath = currentPath.slice(0, -1).join('/');
        return findNodeByPath('/' + parentPath);
    }
    
    return parts.reduce((node, part) => {
        if (!node) return null;
        if (part === '.') return node;
        // Logic '..' phức tạp hơn, tạm thời chỉ hỗ trợ ở đầu
        return (node.content && node.content[part]) ? node.content[part] : null;
    }, startNode);
}

// CẢI TIẾN: Hàm kiểm tra quyền chi tiết (user, group, other)
function checkPermissions(node, user, action) {
    if (!node || !node.permissions || !node.owner) return false;
    
    // admin (giả lập root) có mọi quyền
    if (user === 'root' || user === 'admin') return true; 

    const perms = node.permissions; // e.g., '751'
    let requiredPerm;

    switch (action) {
        case 'read': requiredPerm = 4; break;
        case 'write': requiredPerm = 2; break;
        case 'execute': requiredPerm = 1; break;
        default: return false;
    }

    const ownerPerm = parseInt(perms[0], 10);
    const groupPerm = parseInt(perms[1], 10);
    const otherPerm = parseInt(perms[2], 10);

    // Kiểm tra owner
    if (user === node.owner) {
        return (ownerPerm & requiredPerm) !== 0;
    }
    // Kiểm tra group (Giả lập: user name cũng là group name của họ)
    if (user === node.group) {
        return (groupPerm & requiredPerm) !== 0;
    }
    // Kiểm tra other
    return (otherPerm & requiredPerm) !== 0;
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

// CẢI TIẾN: Tab completion hỗ trợ đường dẫn (path)
function handleTabCompletion() {
    const text = commandInput.value;
    const parts = text.split(' ');
    
    if (parts.length === 1) { // Hoàn thành lệnh
        const currentPart = parts[0];
        const matchingCommands = Object.keys(commands).filter(cmd => cmd.startsWith(currentPart));
        if (matchingCommands.length === 1) {
            commandInput.value = matchingCommands[0] + ' ';
        } else if (matchingCommands.length > 1) {
            print(`${promptElement.textContent} ${text}`);
            print(matchingCommands.join('  '));
            updatePrompt();
        }
    } else { // Hoàn thành tên file/thư mục/đường dẫn
        const lastSpace = text.lastIndexOf(' ') + 1;
        const currentArg = text.substring(lastSpace);
        
        let pathPrefix = '';
        let namePrefix = currentArg;
        const lastSlash = currentArg.lastIndexOf('/');
        
        let startNode;

        if (lastSlash > -1) {
            pathPrefix = currentArg.substring(0, lastSlash + 1); // e.g., "documents/"
            namePrefix = currentArg.substring(lastSlash + 1); // e.g., "pro"
            startNode = findNodeByPath(pathPrefix);
        } else {
            startNode = getCurrentDirectory();
        }
        
        if (!startNode || startNode.type !== 'dir') return;
        
        const dirContent = startNode.content || startNode;
        const matchingFiles = Object.keys(dirContent).filter(file => file.startsWith(namePrefix));
        
        if (matchingFiles.length === 1) {
            const completion = pathPrefix + matchingFiles[0];
            commandInput.value = text.substring(0, lastSpace) + completion + (dirContent[matchingFiles[0]].type === 'dir' ? '/' : ' ');
        } else if (matchingFiles.length > 1) {
            print(`${promptElement.textContent} ${text}`);
            print(matchingFiles.map(f => dirContent[f].type === 'dir' ? f + '/' : f).join('  '));
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

    // Xử lý lịch sử lệnh !! và !n
    if (fullCommand.startsWith('!')) {
        let historyCmd = '';
        if (fullCommand === '!!') {
            if (commandHistory.length > 0) historyCmd = commandHistory[0];
        } else {
            const index = parseInt(fullCommand.substring(1));
            // Lịch sử được lưu ngược (unshift), nên cần tính toán lại
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
            try {
                const result = await commands[cmd](args, stdin);
                stdout = result === undefined ? '' : String(result);
            } catch (error) {
                print(`-bash: ${cmd}: ${error.message || 'An error occurred'}`);
                updatePrompt();
                return;
            }
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

// Hàm cho trình soạn thảo Nano (Giữ nguyên)
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
    commandInput.type = 'text';
    initDB(() => {
        getBalanceFromDB(() => {
            loadFileSystemFromDB(() => {
                type('booting system...', () => {
                    type('Connecting to 103.199.16.113 (Bandung)...', () => {
                        type('Connection established.', () => {
                            updatePrompt();
                            commandInput.focus();
                        });
                    });
                });
            });
        });
    });
}

// CẢI TIẾN: Cập nhật menu help với các lệnh mới
function showHelp() {
    print(`
<pre>
--- File System & Navigation ---
  ls [-l, -a]      : List files and directories.
  cd [dir]         : Change directory.
  pwd              : Print working directory.
  cat [file]...    : Display content of one or more files.
  nano [file]      : Edit a text file.
  touch [file]..   : Create or update files.
  mkdir [dir]      : Create a new directory.
  rm [-r] [target] : Remove a file or directory.
  cp [-r] [src] [dst]: Copy a file or directory.
  mv [src] [dst]   : Move or rename a file or directory.
  tree [dir]       : Show directory structure as a tree.
  stat [file]      : Display file status.
  chmod [mode] [f] : Change file permissions (e.g., 755).
  chown [user] [f] : Change file owner.

--- Text & Search ---
  grep [-i,-n,-r] [pat] [f]: Search for a pattern in a file.
  find [path] -name [pat] : Find files by name.
  wc [-l,-w,-c] [file]    : Count lines, words, and characters.
  head [-n K] [file]      : Show first K lines of a file.
  tail [-n K] [file]      : Show last K lines of a file.

--- System & Utility ---
  neofetch         : Display system information.
  uname [-a]       : Print system information.
  ps / top         : List running processes.
  kill [PID]       : Terminate a process.
  whoami/su/exit   : Manage simulated users.
  alias [def]      : Create a command shortcut.
  export [def]     : Set an environment variable.
  printenv         : Print environment variables.
  history [-c]     : Show command history (or clear with -c).
  !! / !n          : Rerun previous commands.
  man [cmd]        : Show help manual for a command.
  date             : Show the current date and time.
  df               : Show disk usage (simulated).
  which [cmd]      : Show path of a command.
  clear            : Clear the terminal history.
  logout           : Log out from the session.

--- Network (Simulated) ---
  wget [url]       : Download a file.
  curl [url]       : Fetch and display content from a URL.
  ping [host]      : Ping a host.

--- Misc ---
  theme [set|list] : Change or list available themes.
  mine [start|stop]: Start or stop the Bitcoin miner.
  balance          : Check your BTC balance.
</pre>
    `, true);
}

// CẢI TIẾN: Logo Neofetch đẹp hơn
function showNeofetch() {
    const uptime = "2h 15m"; // Giả lập
    return `<pre>
<span style="color: var(--prompt-color);">            .-/+oossssoo+/-.               </span>${currentUser}@NguyenthuanIT
<span style="color: var(--prompt-color);">        ´:+ssssssssssssssssss+:\`           </span>---------------
<span style="color: var(--prompt-color);">      -+ssssssssssssssssssyyssss+-         </span>OS: Linux Live x86_64
<span style="color: var(--prompt-color);">    .ossssssssssssssssss<span style="color: var(--main-bg);">dMMMNy</span>ssssso.        </span>Host: Virtual Machine v2.1
<span style="color: var(--prompt-color);">   /ssssssssss<span style="color: var(--main-bg);">sdMMMMMMMMNNm</span>ssssss/         </span>Kernel: 5.15.0-custom
<span style="color: var(--prompt-color);">  :ssssssss<span style="color: var(--main-bg);">hhdMMMMMMMMMMMNh</span>ssssss:        </span>Uptime: ${uptime}
<span style="color: var(--prompt-color);"> :ssssssss<span style="color: var(--main-bg);">hhdMMMMMMMMMMMNh</span>ssssss:        </span>Shell: bash 5.1.16
<span style="color: var(--prompt-color);"> +ssssssss<span style="color: var(--main-bg);">hhdMMMMMMMMMMMNh</span>ssssss+        </span>Terminal: Terminal.js
<span style="color: var(--prompt-color);"> +ssssssss<span style="color: var(--main-bg);">hhdMMMMMMMMMMMNh</span>ssssss+        </span>CPU: Xeon E5-2699v4 (Sim)
<span style="color: var(--prompt-color);"> :ssssssss<span style="color: var(--main-bg);">hhdMMMMMMMMMMMNh</span>ssssss:        </span>GPU: NVIDIA RTX 4090 (Sim)
<span style="color: var(--prompt-color);">  :ssssssss<span style="color: var(--main-bg);">hhdMMMMMMMMMMMNh</span>ssssss:        </span>Memory: 4096MB / 131072MB
<span style="color: var(--prompt-color);">   /ssssssssss<span style="color: var(--main-bg);">sdMMMMMMMMNNm</span>ssssss/
<span style="color: var(--prompt-color);">    .ossssssssssssssssss<span style="color: var(--main-bg);">dMMMNy</span>ssssso.
<span style="color: var(--prompt-color);">      -+ssssssssssssssssssyyssss+-
<span style="color: var(--prompt-color);">        ´:+ssssssssssssssssss+:\`
<span style="color: var(--prompt-color);">            .-/+oossssoo+/-.</span></pre>`;
}

terminal.addEventListener('click', () => commandInput.focus());

// Bắt đầu chạy terminal
start();