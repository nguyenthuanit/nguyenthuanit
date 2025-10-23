// Thêm các lệnh liên quan đến hệ thống vào đối tượng 'commands' đã tồn tại
Object.assign(commands, {
    help: () => {
        state = 'help_login';
        promptElement.textContent = 'Help Password:';
        commandInput.type = 'password';
        commandInput.focus();
    },
    clear: () => { history.innerHTML = ''; },
    neofetch: () => showNeofetch(),
    ps: () => {
        let output = ["PID\tUSER\tCPU%\tMEM%\tCOMMAND"];
        processes.forEach(p => output.push(`${p.pid}\t${p.user}\t${p.cpu}\t${p.mem}\t${p.command}`));
        return output.join('\n');
    },
    kill: (args) => {
        if (!args[0]) return "Usage: kill <PID>";
        const pid = parseInt(args[0]);
        const pIndex = processes.findIndex(p => p.pid === pid);
        if (pIndex > -1) processes.splice(pIndex, 1);
        else return `-bash: kill: (${pid}) - No such process`;
    },
    whoami: () => currentUser,
    su: (args) => {
        const username = args[0];
        if (!username) return "Usage: su [username]";
        if (username === 'admin' || username === 'guest' || username === 'root') {
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
    logout: () => { print('Logging out...'); setTimeout(() => location.reload(), 1000); },
    
    // CẢI TIẾN: history hỗ trợ cờ '-c'
    history: (args) => {
        if (args[0] === '-c') {
            commandHistory = [];
            historyIndex = -1;
            return;
        }
        return commandHistory.slice(0).reverse().map((cmd, i) => ` ${i + 1}  ${cmd}`).join('\n');
    },
    
    wget: async (args) => {
        const url = args[0];
        if (!url) return 'Usage: wget <URL>';
        print(`--Connecting to ${new URL(url).hostname}... connected.`);
        await new Promise(res => setTimeout(res, 500)); 
        if (remoteFiles[url]) {
            const fileName = url.split('/').pop();
            const currentDirNode = getCurrentDirectory();
            const currentDirContent = currentDirNode.content || currentDirNode;
            print(`Saving to: ‘${fileName}’`);
            await new Promise(res => setTimeout(res, 800));
            currentDirContent[fileName] = { type: 'file', content: remoteFiles[url], owner: currentUser, group: 'admin', permissions: '644', modified: new Date().toISOString().slice(0, 10) };
            saveFileSystemToDB();
            return `100% [===================>] ${remoteFiles[url].length}  --.-KB/s    in 0s`;
        } else {
            return `404 Not Found`;
        }
    },
    
    // --- LỆNH MỚI ---
    date: () => {
        return new Date().toString();
    },

    uname: (args) => {
        if (args[0] === '-a') return 'Linux NguyenthuanIT 5.15.0-custom #1 SMP x86_64 GNU/Linux (Simulation)';
        return 'Linux';
    },

    ping: async (args) => {
        const host = args[0];
        if (!host) return "Usage: ping <host>";
        print(`PING ${host} (127.0.0.1): 56 data bytes`);
        for (let i = 0; i < 4; i++) {
            await new Promise(res => setTimeout(res, 800));
            const time = (Math.random() * 10 + 5).toFixed(2);
            print(`64 bytes from 127.0.0.1: icmp_seq=${i} ttl=64 time=${time} ms`);
        }
        return `\n--- ${host} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss`;
    },
    
    curl: async (args) => {
        const url = args[0];
        if (!url) return 'Usage: curl <URL>';
        await new Promise(res => setTimeout(res, 500)); 
        if (remoteFiles[url]) {
            return remoteFiles[url];
        } else {
            return `curl: (404) Not Found`;
        }
    },
    
    man: (args) => {
        const cmd = args[0];
        if (!cmd) return "Usage: man <command>";
        if (manPages[cmd]) return manPages[cmd];
        return `No manual entry for ${cmd}`;
    },

});
// Gán lệnh top bằng ps sau khi đã định nghĩa
commands.top = commands.ps;