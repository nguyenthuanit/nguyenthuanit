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
    history: () => {
        return commandHistory.slice(0).reverse().map((cmd, i) => ` ${i + 1}  ${cmd}`).join('\n');
    },
    wget: async (args) => {
        const url = args[0];
        if (!url) return 'Usage: wget <URL>';
        print(`--Connecting to ${new URL(url).hostname}... connected.`);
        await new Promise(res => setTimeout(res, 500)); 
        if (remoteFiles[url]) {
            const fileName = url.split('/').pop();
            const currentDir = getCurrentDirectory();
            print(`Saving to: ‘${fileName}’`);
            await new Promise(res => setTimeout(res, 800));
            currentDir[fileName] = { type: 'file', content: remoteFiles[url], owner: currentUser, group: 'admin', permissions: '644', modified: new Date().toISOString().slice(0, 10) };
            return `100% [===================>] ${remoteFiles[url].length}  --.-KB/s    in 0s`;
        } else {
            return `404 Not Found`;
        }
    },
});
// Gán lệnh top bằng ps sau khi đã định nghĩa
commands.top = commands.ps;