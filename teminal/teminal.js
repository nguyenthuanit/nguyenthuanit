document.addEventListener('DOMContentLoaded', () => {
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

    // --- CÁC HÀM HELPER (BAO GỒM `type` GỐC) ---
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
        const promptSymbol = currentUser === 'admin' ? '#' : '$';
        promptElement.textContent = `${currentUser}@NguyenthuanIT:~${pathString}${promptSymbol}`;
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
            if (currentDir[part]) {
                parent = currentDir;
                finalPart = part;
                currentDir = currentDir[part];
            } else {
                return null;
            }
        }
        return { node: currentDir, parent: parent, name: finalPart };
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
                commandHistory.unshift(command);
                historyIndex = -1;
                print(`${promptElement.textContent} ${command}`);
                executeCommand(command);
            } else {
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
        }
    });
    
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

    // --- BỘ PHÂN TÍCH VÀ THỰC THI LỆNH (HỖ TRỢ PIPES & REDIRECTION) ---
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
        if (currentDir[fileName] && append) {
            currentDir[fileName].content += (currentDir[fileName].content ? '\n' : '') + content;
        } else {
            if (!currentDir[fileName]) {
                 currentDir[fileName] = { type: 'file', content: '', owner: currentUser, group: 'admin', permissions: '644' };
            }
            currentDir[fileName].content = content;
        }
        currentDir[fileName].modified = new Date().toISOString().slice(0, 10);
    }
    
    // --- HÀM CHO TÍNH NĂNG LƯU TRỮ COIN (GỐC) ---
    function initDB(callback) {
        const request = indexedDB.open('TerminalCoinDB', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('wallet')) db.createObjectStore('wallet', { keyPath: 'id' });
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
    const commands = {
        help: () => {
             state = 'help_login';
             promptElement.textContent = 'Help Password:';
             commandInput.type = 'password';
             commandInput.focus();
        },
        clear: () => { history.innerHTML = ''; },
        neofetch: () => showNeofetch(),
        ls: (args) => {
            const showAll = args.includes('-a');
            const longFormat = args.includes('-l');
            const currentDir = getCurrentDirectory();
            let items = Object.keys(currentDir).sort();
            if (!showAll) items = items.filter(item => !item.startsWith('.'));
            if (longFormat) {
                return items.map(item => {
                    const details = currentDir[item];
                    const perms = (details.type === 'dir' ? 'd' : '-') + 
                                  [...details.permissions].map(p => [(p&4)?'r':'-', (p&2)?'w':'-', (p&1)?'x':'-'].join('')).join('');
                    return `${perms.padEnd(11)} 1 ${details.owner.padEnd(8)} ${details.group.padEnd(8)} ${''.padStart(6)} ${details.modified} ${item}`;
                }).join('\n');
            }
            return items.map(item => currentDir[item].type === 'dir' ? `${item}/` : item).join('  ');
        },
        cd: (args) => {
            const dirName = args[0];
            if (!dirName || dirName === '~' || dirName === '/') { currentPath = []; return; }
            if (dirName === '..') { if (currentPath.length > 0) currentPath.pop(); return; }
            const currentDir = getCurrentDirectory();
            if (currentDir[dirName] && currentDir[dirName].type === 'dir') currentPath.push(dirName);
            else return `-bash: cd: ${dirName}: No such file or directory`;
        },
        cat: (args, stdin) => {
             if (stdin) return stdin;
             if (args.length === 0) return "Usage: cat [file]...";
             const currentDir = getCurrentDirectory();
             return args.map(fileName => {
                 if (currentDir[fileName] && currentDir[fileName].type === 'file') return currentDir[fileName].content;
                 return `-bash: cat: ${fileName}: No such file or directory`;
             }).join('\n');
        },
        tree: (args) => {
             const path = args[0] || '.';
             const startNode = findNode(path);
             if (!startNode || startNode.node.type !== 'dir') return `-bash: tree: '${path}': Not a directory`;
             let output = [path];
             function generate(directory, prefix) {
                const entries = Object.keys(directory.content).sort();
                entries.forEach((entry, index) => {
                    const isLast = index === entries.length - 1;
                    output.push(`${prefix}${isLast ? '└── ' : '├── '}${entry}`);
                    if (directory.content[entry].type === 'dir') {
                        generate(directory.content[entry], prefix + (isLast ? '    ' : '│   '));
                    }
                });
             }
             generate(startNode.node, '');
             return output.join('\n');
        },
        mkdir: (args) => {
            if (!args[0]) return "Usage: mkdir <directory_name>";
            const dirName = args[0];
            const currentDir = getCurrentDirectory();
            if (currentDir[dirName]) return `mkdir: cannot create directory ‘${dirName}’: File exists`;
            currentDir[dirName] = { type: 'dir', content: {}, owner: currentUser, group: 'admin', permissions: '755', modified: new Date().toISOString().slice(0, 10) };
        },
        touch: (args) => {
            if (!args[0]) return "Usage: touch <file_name>";
            const fileName = args[0];
            const currentDir = getCurrentDirectory();
            if (currentDir[fileName]) currentDir[fileName].modified = new Date().toISOString().slice(0, 10);
            else currentDir[fileName] = { type: 'file', content: '', owner: currentUser, group: 'admin', permissions: '644', modified: new Date().toISOString().slice(0, 10) };
        },
        grep: (args, stdin) => {
            if (args.length < 1 || (!stdin && args.length < 2)) return "Usage: grep <pattern> [file]";
            const pattern = args[0].replace(/'|"/g, '');
            const fileName = args[1];
            let content = stdin;
            if (!stdin) {
                 const currentDir = getCurrentDirectory();
                 if (currentDir[fileName] && currentDir[fileName].type === 'file') content = currentDir[fileName].content;
                 else return `grep: ${fileName}: No such file or directory`;
            }
            if (!content) return '';
            const regex = new RegExp(pattern, 'g');
            return content.split('\n')
                .filter(line => line.includes(pattern))
                .map(line => line.replace(regex, `<span style="background-color: yellow; color: black;">${pattern}</span>`))
                .join('\n');
        },
        whoami: () => currentUser,
        su: (args) => {
            const username = args[0];
            if (!username) return "Usage: su [username]";
            if (username === 'admin' || username === 'guest') {
                previousUser = currentUser;
                currentUser = username;
                env['USER'] = username;
            } else return `su: user ${username} does not exist`;
        },
        exit: () => {
            if (previousUser) {
                currentUser = previousUser;
                env['USER'] = currentUser;
                previousUser = null;
            } else return "-bash: exit: not in a subshell.";
        },
        alias: (args) => {
            if (args.length === 0) return Object.entries(aliases).map(([name, cmd]) => `alias ${name}='${cmd}'`).join('\n');
            const [aliasDef] = args;
            const [name, value] = aliasDef.split('=');
            if (name && value) aliases[name] = value.replace(/'|"/g, '');
            else return "Usage: alias name='command'";
        },
        ps: () => {
             let output = ["PID\tUSER\tCPU%\tMEM%\tCOMMAND"];
             processes.forEach(p => output.push(`${p.pid}\t${p.user}\t${p.cpu}\t${p.mem}\t${p.command}`));
             return output.join('\n');
        },
        rm: (args) => {
            const recursive = args.includes('-r');
            const targetName = args.find(arg => !arg.startsWith('-'));
            if (!targetName) return "Usage: rm [-r] <file/directory>";
            const currentDir = getCurrentDirectory();
            const target = currentDir[targetName];
            if (!target) return `rm: cannot remove '${targetName}': No such file or directory`;
            if (target.type === 'dir' && !recursive) return `rm: cannot remove '${targetName}': Is a directory`;
            delete currentDir[targetName];
        },
        chmod: (args) => {
            if (args.length < 2) return "Usage: chmod <mode> <file>";
            const mode = args[0];
            const fileName = args[1];
            const result = findNode(fileName);
            if (!result || !result.parent[result.name]) return `chmod: cannot access '${fileName}': No such file or directory`;
            if (!/^[0-7]{3}$/.test(mode)) return `chmod: invalid mode: ‘${mode}’`;
            result.parent[result.name].permissions = mode;
        },
        chown: (args) => {
            if (args.length < 2) return "Usage: chown <user> <file>";
            const owner = args[0];
            const fileName = args[1];
            const result = findNode(fileName);
            if (!result || !result.parent[result.name]) return `chown: cannot access '${fileName}': No such file or directory`;
            result.parent[result.name].owner = owner;
        },
        kill: (args) => {
            if (!args[0]) return "Usage: kill <PID>";
            const pid = parseInt(args[0]);
            const pIndex = processes.findIndex(p => p.pid === pid);
            if (pIndex > -1) processes.splice(pIndex, 1);
            else return `-bash: kill: (${pid}) - No such process`;
        },
        export: (args) => {
            if (args.length === 0) return Object.entries(env).map(([key, val]) => `${key}=${val}`).join('\n');
            const [def] = args;
            const [key, value] = def.split('=');
            if (key && value) env[key] = value.replace(/'|"/g, '');
        },
        printenv: () => Object.entries(env).map(([key, val]) => `${key}=${val}`).join('\n'),
        echo: (args) => args.join(' '),
        theme: (args) => { const [action, themeName] = args; if (action === 'list') return Object.entries(availableThemes).map(([n, d]) => `  - ${n}: ${d}`).join('\n'); if (action === 'set' && availableThemes[themeName]) { document.body.className = `theme-${themeName}`; return `Theme changed to ${themeName}.`; } return "Usage: theme [list|set] [theme_name]"; },
        mine: (args) => {
            const action = args[0];
            if (action === 'start') {
                if (isMining) return "Bitcoin miner is already running.";
                print("Starting Bitcoin miner...");
                isMining = true;
                miningInterval = setInterval(simulateMining, 1800);
            } else if (action === 'stop') {
                if (!isMining) return "Miner is not running.";
                clearInterval(miningInterval);
                isMining = false;
                print(`Final balance: ${currentBalance.toFixed(8)} BTC`);
                return "Bitcoin miner stopped.";
            } else return "Usage: mine [start|stop]";
        },
        balance: () => `Your current balance: ${currentBalance.toFixed(8)} BTC`,
        logout: () => { print('Logging out...'); setTimeout(() => location.reload(), 1000); }
    };
    commands.top = commands.ps;
    
    // --- KHỞI ĐỘNG TERMINAL ---
    function start() {
        commandInput.value = '';
        commandInput.type = 'password';
        document.body.className = 'theme-matrix';
        
        initDB(() => {
            getBalanceFromDB();
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

    start();
});