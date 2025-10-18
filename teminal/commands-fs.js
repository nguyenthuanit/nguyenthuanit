// Thêm các lệnh liên quan đến file system vào đối tượng 'commands' đã tồn tại
Object.assign(commands, {
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
                return `${perms.padEnd(11)} 1 ${details.owner.padEnd(8)} ${details.group.padEnd(8)} ${'128'.padStart(6)} ${details.modified} ${item}`;
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
             const node = currentDir[fileName];
             if (node && node.type === 'file') {
                 if (!checkPermissions(node, currentUser, 'read')) {
                     return `-bash: cat: ${fileName}: Permission denied`;
                 }
                 return node.content;
             }
             return `-bash: cat: ${fileName}: No such file or directory`;
         }).join('\n');
    },
    tree: (args) => {
         const path = args[0] || '.';
         const startNode = findNodeByPath(path);
         if (!startNode || startNode.type !== 'dir') return `-bash: tree: '${path}': Not a directory`;
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
         generate(startNode, '');
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
    rm: (args) => {
        const recursive = args.includes('-r');
        const targetName = args.find(arg => !arg.startsWith('-'));
        if (!targetName) return "Usage: rm [-r] <file/directory>";
        const currentDir = getCurrentDirectory();
        const target = currentDir[targetName];
        if (!target) return `rm: cannot remove '${targetName}': No such file or directory`;
        if (!checkPermissions(target, currentUser, 'write')) {
            return `rm: cannot remove '${targetName}': Permission denied`;
        }
        if (target.type === 'dir' && !recursive) return `rm: cannot remove '${targetName}': Is a directory`;
        delete currentDir[targetName];
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
    chmod: (args) => {
        if (args.length < 2) return "Usage: chmod <mode> <file>";
        const mode = args[0];
        const fileName = args[1];
        const node = findNodeByPath(fileName);
        if (!node) return `chmod: cannot access '${fileName}': No such file or directory`;
        if (!/^[0-7]{3}$/.test(mode)) return `chmod: invalid mode: ‘${mode}’`;
        node.permissions = mode;
    },
    chown: (args) => {
        if (args.length < 2) return "Usage: chown <user> <file>";
        const owner = args[0];
        const fileName = args[1];
        const node = findNodeByPath(fileName);
        if (!node) return `chown: cannot access '${fileName}': No such file or directory`;
        node.owner = owner;
    },
});