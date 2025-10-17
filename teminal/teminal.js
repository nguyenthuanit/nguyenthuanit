document.addEventListener('DOMContentLoaded', () => {
    const terminal = document.getElementById('terminal');
    const history = document.getElementById('history');
    const promptElement = document.getElementById('prompt');
    const commandInput = document.getElementById('command-input');

    // --- Mật khẩu chính và mật khẩu cho lệnh HELP ---
    const mainPassHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // Mật khẩu: 999997
    const helpPassHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; // Mật khẩu: 123

    // --- Quản lý trạng thái của terminal ---
    let state = 'login'; // 'login', 'command', 'help_login'
    let currentUser = 'admin';
    let previousUser = null;

    // --- Trạng thái cho trình giả lập đào coin và IndexedDB ---
    let isMining = false;
    let miningInterval = null;
    let db = null;
    let currentBalance = 0.0;
    let shareCount = 0;
    const BLOCK_REWARD = 0.01;
    const BLOCK_FIND_CHANCE = 0.02;

    // --- CẢI TIẾN: Danh sách các theme có sẵn ---
    const availableThemes = {
        'matrix': 'Classic green on black. The default.',
        'hacker': 'Aggressive crimson on a dark background.',
        'cyberpunk': 'Neon on a deep purple background.',
        'solarized-light': 'Easy on the eyes, for daytime coding.',
        'dracula': 'A popular dark theme for developers.'
    };

    // --- State cho File System ---
    const fileSystem = {
        'documents': {
            'project_alpha.txt': 'Đây là nội dung của dự án Alpha.',
            'notes.log': 'Ghi chú quan trọng: Cập nhật hệ thống vào cuối tuần.'
        },
        'images': {
            'avatar.png': 'Đây là file ảnh giả lập.'
        },
        'README.md': 'Chào mừng bạn đến với terminal giả lập. Gõ `help` để xem các lệnh.'
    };
    let currentPath = [];

    function getCurrentDirectory() {
        return currentPath.reduce((dir, path) => dir[path], fileSystem);
    }

    function print(text) {
        const p = document.createElement('p');
        p.textContent = text;
        history.appendChild(p);
        terminal.scrollTop = terminal.scrollHeight;
    }

    function printHTML(htmlContent) {
        const p = document.createElement('p');
        p.innerHTML = htmlContent;
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

    commandInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            const command = commandInput.value.trim();
            commandInput.value = '';

            if (isMining && command !== 'mine stop') {
                print("Miner is running. Type 'mine stop' to exit.");
                return;
            }

            if (state === 'login') {
                handleLogin(command);
            } else if (state === 'help_login') {
                handleHelpLogin(command);
            } else {
                if (command) print(`${promptElement.textContent} ${command}`);
                handleCommand(command);
            }
        }
    });

    function handleLogin(password) {
        const enteredHash = CryptoJS.SHA256(password).toString();
        print(`password: ********`);

        setTimeout(() => {
            if (enteredHash === mainPassHash) {
                print('Authentication successful. Welcome, admin!');
                state = 'command';
                commandInput.type = 'text';
                updatePrompt();
                handleCommand('neofetch');
                setTimeout(() => print("\nType 'help' to see all available commands."), 100);
            } else {
                print('Access denied.');
                promptElement.textContent = 'password:';
            }
        }, 300);
    }

    function handleHelpLogin(password) {
        const enteredHash = CryptoJS.SHA256(password).toString();
        print(`Help Password: ********`);

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
            commandInput.focus();
        }, 300);
    }

    function handleCommand(command) {
        const [cmd, ...args] = command.split(/\s+/);

        switch (cmd) {
            case 'help':
                state = 'help_login';
                promptElement.textContent = 'Help Password:';
                commandInput.type = 'password';
                commandInput.focus();
                break;
            case 'clear':
                history.innerHTML = '';
                break;
            case 'dashboard': case '1':
                printHTML(`Redirecting to dashboard... <a href="dashboard.html" target="_blank">Click here...</a>`);
                setTimeout(() => { window.open('dashboard.html', '_blank'); }, 1000);
                break;
            case 'settings': case '2':
                printHTML(`Opening settings... <a href="settings.html" target="_blank">Click here...</a>`);
                setTimeout(() => { window.open('settings.html', '_blank'); }, 1000);
                break;
            case 'logout': case '6':
                print('Logging out...');
                setTimeout(() => location.reload(), 1000);
                break;
            case 'top': case 'ps':
                showProcesses();
                break;
            case 'ls':
                listFiles();
                break;
            case 'cd':
                changeDirectory(args[0]);
                break;
            case 'cat':
                readFile(args[0]);
                break;
            case 'tree':
                printTree();
                break;
            case 'neofetch':
                showNeofetch();
                break;
            case 'apt':
                handleApt(args);
                break;
            case 'theme':
                handleTheme(args);
                break;
            case 'whoami':
                print(currentUser);
                break;
            case 'su':
                switchUser(args[0]);
                break;
            case 'exit':
                if (previousUser) {
                    currentUser = previousUser;
                    previousUser = null;
                } else {
                    print("-bash: exit: not in a subshell.");
                }
                break;
            case 'fortune':
                showFortune();
                break;
            case 'mine':
                handleMining(args);
                break;
            case 'balance':
                 print(`Your current balance: ${currentBalance.toFixed(8)} BTC`);
                break;
            default:
                if (command) {
                    print(`-bash: ${command}: command not found.`);
                }
                break;
        }
        if (state === 'command' && !isMining) {
            updatePrompt();
        }
    }

    function showHelp() {
        print("\nAvailable Commands:");
        print("  --- Navigation ---");
        print("  dashboard / 1 : Open the main dashboard.");
        print("  settings / 2  : Open the settings page.");
        print("  logout / 6    : Log out from the session.");
        print("\n  --- System ---");
        print("  neofetch      : Display system information.");
        print("  top / ps      : List running processes.");
        print("  apt [cmd]     : Simulate package management (e.g., 'apt update').");
        print("  whoami/su/exit: Manage simulated users.");
        print("\n  --- File System ---");
        print("  ls            : List files and directories.");
        print("  cd [dir]      : Change directory (use 'cd ..' to go up).");
        print("  cat [file]    : Display file content.");
        print("  tree          : Show directory structure as a tree.");
        print("\n  --- Utility ---");
        print("  theme [cmd]   : Change terminal theme (e.g., 'theme list').");
        print("  fortune       : Display a random quote.");
        print("  mine [cmd]    : Start/stop the bitcoin mining simulator (e.g., 'mine start').");
        print("  balance       : Check your simulated BTC balance.");
        print("  clear         : Clear the terminal history.");
    }

    // --- HÀM CHO TÍNH NĂNG LƯU TRỮ COIN BẰNG INDEXEDDB ---

    function initDB(callback) {
        const request = indexedDB.open('TerminalCoinDB', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('wallet')) {
                db.createObjectStore('wallet', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            if (callback) callback();
        };

        request.onerror = (event) => {
            console.error('Database error:', event.target.errorCode);
        };
    }

    function getBalanceFromDB() {
        if (!db) return;
        const transaction = db.transaction(['wallet'], 'readonly');
        const store = transaction.objectStore('wallet');
        const request = store.get('main_balance');

        request.onsuccess = () => {
            if (request.result) {
                currentBalance = request.result.value;
            } else {
                currentBalance = 0.0;
            }
        };
    }

    function saveBalanceToDB(balance) {
        if (!db) return;
        const transaction = db.transaction(['wallet'], 'readwrite');
        const store = transaction.objectStore('wallet');
        store.put({ id: 'main_balance', value: balance });
    }

    // --- HÀM MÔ PHỎNG ĐÀO COIN ---

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

    function handleMining(args) {
        const action = args[0];
        if (action === 'start') {
            if (isMining) {
                print("Bitcoin miner is already running.");
                return;
            }
            print("Starting Bitcoin miner... (Simulated)");
            print(`Connecting to mining pool: pool.btc.com:3333`);
            print(`Current balance: ${currentBalance.toFixed(8)} BTC`);
            print("To stop, type 'mine stop'");
            isMining = true;
            shareCount = 0;
            promptElement.style.display = 'none';
            document.querySelector('.cursor').style.display = 'none';
            miningInterval = setInterval(simulateMining, 1800);
        } else if (action === 'stop') {
            if (!isMining) {
                print("Miner is not running.");
                return;
            }
            clearInterval(miningInterval);
            isMining = false;
            print("Bitcoin miner stopped.");
            print(`Final balance: ${currentBalance.toFixed(8)} BTC`);
            promptElement.style.display = 'inline';
            document.querySelector('.cursor').style.display = 'inline-block';
            updatePrompt();
            commandInput.focus();
        } else {
            print("Usage: mine [start|stop]");
        }
    }
    
    // --- CẢI TIẾN: HÀM XỬ LÝ THEME ---

    function handleTheme(args) {
        const action = args[0];
        const themeName = args[1];

        if (action === 'list') {
            print("Available themes:");
            for (const name in availableThemes) {
                print(`  - ${name}: ${availableThemes[name]}`);
            }
        } else if (action === 'set' && themeName) {
            if (availableThemes.hasOwnProperty(themeName)) {
                // Đặt class cho body, CSS sẽ tự động xử lý
                document.body.className = `theme-${themeName}`;
                print(`Theme changed to ${themeName}.`);
            } else {
                print(`-bash: theme: '${themeName}' is not a valid theme.`);
                print("Type 'theme list' to see all available themes.");
            }
        } else {
            print("Usage: theme [list|set] [theme_name]");
        }
    }


    // --- Các hàm cũ không thay đổi ---

    function showProcesses() {
        print("PID    USER    CPU%   MEM%   COMMAND");
        print("101    root    5.2    15.3   /sbin/init");
        print("254    admin   2.1    10.1   /usr/bin/sshd");
        print("288    admin   0.8    8.5    -bash");
        print("312    www     1.5    5.0    /usr/sbin/nginx");
    }

    function listFiles() {
        const currentDir = getCurrentDirectory();
        const items = Object.keys(currentDir);
        if (items.length === 0) {
            print("Directory is empty.");
            return;
        }
        let output = "";
        items.forEach(item => {
            if (typeof currentDir[item] === 'object') {
                output += `${item}/  `;
            } else {
                output += `${item}  `;
            }
        });
        print(output);
    }

    function changeDirectory(dirName) {
        if (!dirName || dirName === '/') {
            currentPath = [];
            return;
        }
        if (dirName === '..') {
            if (currentPath.length > 0) {
                currentPath.pop();
            }
            return;
        }
        const currentDir = getCurrentDirectory();
        if (currentDir[dirName] && typeof currentDir[dirName] === 'object') {
            currentPath.push(dirName);
        } else {
            print(`-bash: cd: ${dirName}: No such file or directory`);
        }
    }

    function readFile(fileName) {
        if (!fileName) {
            print("Usage: cat [filename]");
            return;
        }
        const currentDir = getCurrentDirectory();
        if (currentDir[fileName] && typeof currentDir[fileName] === 'string') {
            print(currentDir[fileName]);
        } else {
            print(`-bash: cat: ${fileName}: No such file or is a directory`);
        }
    }

    function generateTree(directory, prefix = '') {
        const entries = Object.keys(directory);
        entries.forEach((entry, index) => {
            const isLast = index === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            print(`${prefix}${connector}${entry}`);
            if (typeof directory[entry] === 'object') {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                generateTree(directory[entry], newPrefix);
            }
        });
    }

    function printTree() {
        print('.');
        generateTree(getCurrentDirectory());
    }

    function showNeofetch() {
        const neofetch = `
         .--.      ${currentUser}@NguyenthuanIT
        |o_o |     ---------------
        |:_/ |     OS: Linux Live x86_64
       //   \\ \\    Host: Virtual Machine v2.1
      (|     | )   Kernel: 5.15.0-custom
     /'\\_   _/\`\\   Uptime: 2 hours, 15 mins
     \\___)=(___/   CPU: Xeon E5-2699v4 3.6Ghz
                   Memory: 4096MB / 131072MB
        `;
        print(neofetch);
    }

    function simulateProgress(callback) {
        let progress = 0;
        const p = document.createElement('p');
        history.appendChild(p);
        const interval = setInterval(() => {
            progress += 10;
            const bar = '[' + '#'.repeat(progress / 10) + '-'.repeat(10 - progress / 10) + '] ' + progress + '%';
            p.textContent = `Downloading: ${bar}`;
            terminal.scrollTop = terminal.scrollHeight;
            if (progress >= 100) {
                clearInterval(interval);
                if (callback) callback();
            }
        }, 100);
    }

    function handleApt(args) {
        const action = args[0];
        const pkg = args[1];
        if (action === 'update') {
            print("Hit:1 http://security.gemini-os.com stable InRelease");
            setTimeout(() => print("Reading package lists... Done."), 500);
        } else if (action === 'install' && pkg) {
            print(`Reading package lists... Done.`);
            simulateProgress(() => {
                print(`Setting up ${pkg}... Done.`);
            });
        } else {
            print("Usage: apt [update|install] [package_name]");
        }
    }

    function switchUser(username) {
        if (!username) {
            print("Usage: su [username]");
            return;
        }
        if (username === currentUser) {
            print("Already logged in as this user.");
            return;
        }
        if (username === 'admin' || username === 'guest') {
            previousUser = currentUser;
            currentUser = username;
            print(`Switched to user '${username}'. Type 'exit' to return.`);
        } else {
            print(`su: user ${username} does not exist`);
        }
    }

    function showFortune() {
        const fortunes = [
            "The best way to predict the future is to invent it.",
            "You will receive a surprisingly large amount of money.",
            "A beautiful, smart, and loving person will be coming into your life.",
            "Do not be afraid of competition.",
            "It is better to be lucky than good."
        ];
        const randomIndex = Math.floor(Math.random() * fortunes.length);
        print(fortunes[randomIndex]);
    }

    // --- Khởi động Terminal ---
    function start() {
        commandInput.value = '';
        commandInput.type = 'password';
        document.body.className = 'theme-matrix'; // Đặt theme mặc định khi khởi động

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

    terminal.addEventListener('click', () => {
        commandInput.focus();
    });

    start();
});