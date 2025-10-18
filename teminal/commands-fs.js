// Thêm các lệnh liên quan đến file system vào đối tượng 'commands' đã tồn tại

// Hàm hỗ trợ để sao chép sâu (deep copy) một đối tượng
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

Object.assign(commands, {
    ls: (args) => {
        const showAll = args.includes('-a');
        const longFormat = args.includes('-l');
        const dirNode = getCurrentDirectory();
        const currentDirContent = dirNode.content || dirNode;
        let items = Object.keys(currentDirContent).sort();
        if (!showAll) items = items.filter(item => !item.startsWith('.'));
        if (longFormat) {
            return items.map(item => {
                const details = currentDirContent[item];
                if (!details.permissions) return `ls: cannot access '${item}': No such file or directory`;
                const perms = (details.type === 'dir' ? 'd' : '-') + [...details.permissions].map(p => [(p & 4) ? 'r' : '-', (p & 2) ? 'w' : '-', (p & 1) ? 'x' : '-'].join('')).join('');
                return `${perms.padEnd(11)} 1 ${details.owner.padEnd(8)} ${details.group.padEnd(8)} ${'128'.padStart(6)} ${details.modified} ${item}`;
            }).join('\n');
        }
        return items.map(item => currentDirContent[item].type === 'dir' ? `${item}/` : item).join('  ');
    },

    cd: (args) => {
        const dirName = args[0];
        if (!dirName || dirName === '~' || dirName === '/') { currentPath = []; return; }
        if (dirName === '..') { if (currentPath.length > 0) currentPath.pop(); return; }
        const currentDirNode = getCurrentDirectory();
        const currentDirContent = currentDirNode.content || currentDirNode;
        if (currentDirContent[dirName] && currentDirContent[dirName].type === 'dir') {
            currentPath.push(dirName);
        } else { return `-bash: cd: ${dirName}: No such file or directory`; }
    },

    cat: (args, stdin) => {
        if (stdin) return stdin;
        if (args.length === 0) return "Usage: cat [file]...";
        const currentDirNode = getCurrentDirectory();
        const currentDirContent = currentDirNode.content || currentDirNode;
        return args.map(fileName => {
            const node = currentDirContent[fileName];
            if (node && node.type === 'file') {
                if (!checkPermissions(node, currentUser, 'read')) return `-bash: cat: ${fileName}: Permission denied`;
                return node.content;
            } else if (node && node.type === 'dir') { return `-bash: cat: ${fileName}: Is a directory`; }
            return `-bash: cat: ${fileName}: No such file or directory`;
        }).join('\n');
    },

    tree: (args) => {
        const pathArg = args[0] || '.';
        let startNode; let displayName = pathArg;
        if (pathArg === '.') {
            startNode = getCurrentDirectory();
            displayName = currentPath.length > 0 ? currentPath[currentPath.length - 1] : '~';
        } else { startNode = findNodeByPath(pathArg); }
        if (!startNode || startNode.type !== 'dir') return `-bash: tree: '${pathArg}': Not a directory`;
        let output = [displayName];
        function generate(directory, prefix) {
            const dirContent = directory.content || directory;
            const entries = Object.keys(dirContent).sort();
            entries.forEach((entry, index) => {
                const isLast = index === entries.length - 1;
                const node = dirContent[entry];
                const entryName = node.type === 'dir' ? `${entry}/` : entry;
                output.push(`${prefix}${isLast ? '└── ' : '├── '}${entryName}`);
                if (node.type === 'dir') generate(node, prefix + (isLast ? '    ' : '│   '));
            });
        }
        generate(startNode, '');
        return output.join('\n');
    },

    mkdir: (args) => {
        if (!args[0]) return "Usage: mkdir <directory_name>";
        const dirName = args[0];
        const currentDirNode = getCurrentDirectory();
        const currentDirContent = currentDirNode.content || currentDirNode;
        if (currentDirContent[dirName]) return `mkdir: cannot create directory ‘${dirName}’: File exists`;
        currentDirContent[dirName] = { type: 'dir', content: {}, owner: currentUser, group: 'admin', permissions: '755', modified: new Date().toISOString().slice(0, 10) };
        saveFileSystemToDB();
    },

    touch: (args) => {
        if (args.length === 0) return "Usage: touch <file_name_1> [file_name_2]...";
        const currentDirNode = getCurrentDirectory();
        const currentDirContent = currentDirNode.content || currentDirNode;
        args.forEach(fileName => {
            if (currentDirContent[fileName] && currentDirContent[fileName].type === 'file') {
                currentDirContent[fileName].modified = new Date().toISOString().slice(0, 10);
            } else if (currentDirContent[fileName] && currentDirContent[fileName].type === 'dir') {
                print(`touch: cannot touch '${fileName}': Is a directory`);
            } else {
                currentDirContent[fileName] = { type: 'file', content: '', owner: currentUser, group: 'admin', permissions: '644', modified: new Date().toISOString().slice(0, 10) };
            }
        });
        saveFileSystemToDB();
    },

    rm: (args) => {
        const recursive = args.includes('-r');
        const targetName = args.find(arg => !arg.startsWith('-'));
        if (!targetName) return "Usage: rm [-r] <file/directory>";
        const currentDirNode = getCurrentDirectory();
        const currentDirContent = currentDirNode.content || currentDirNode;
        const target = currentDirContent[targetName];
        if (!target) return `rm: cannot remove '${targetName}': No such file or directory`;
        if (!checkPermissions(target, currentUser, 'write')) return `rm: cannot remove '${targetName}': Permission denied`;
        if (target.type === 'dir' && !recursive) return `rm: cannot remove '${targetName}': Is a directory`;
        delete currentDirContent[targetName];
        saveFileSystemToDB();
    },

    grep: (args, stdin) => {
        const flags = args.filter(arg => arg.startsWith('-'));
        const nonFlags = args.filter(arg => !arg.startsWith('-'));
        const isCaseInsensitive = flags.includes('-i');
        const showLineNumbers = flags.includes('-n');
        const isRecursive = flags.includes('-r');
        if (nonFlags.length < 1 || (!stdin && nonFlags.length < 2 && !isRecursive)) return "Usage: grep [-i, -n, -r] <pattern> [file/dir...]";
        const pattern = nonFlags[0];
        const targets = nonFlags.slice(1);
        const regex = new RegExp(pattern, isCaseInsensitive ? 'gi' : 'g');
        let results = [];
        const searchInFile = (fileNode, filePath) => {
            if (!fileNode || fileNode.type !== 'file' || typeof fileNode.content !== 'string') return;
            const lines = fileNode.content.split('\n');
            lines.forEach((line, index) => {
                if (line.match(isCaseInsensitive ? new RegExp(pattern, 'i') : pattern)) {
                    const highlightedLine = line.replace(regex, `<span style="background-color: yellow; color: black;">$&</span>`);
                    let prefix = '';
                    if (isRecursive || targets.length > 1) prefix += `${filePath}:`;
                    if (showLineNumbers) prefix += `${index + 1}:`;
                    results.push(prefix + highlightedLine);
                }
            });
        };
        if (stdin) { searchInFile({ type: 'file', content: stdin }, '(stdin)'); } 
        else if (isRecursive) {
            const startPath = targets[0] || '.';
            const startNode = findNodeByPath(startPath);
            if (!startNode || startNode.type !== 'dir') return `grep: ${startPath}: No such directory`;
            function searchInDirectory(directory, currentDirPath) {
                const dirContent = directory.content || directory;
                for (const entryName in dirContent) {
                    const node = dirContent[entryName];
                    const newPath = (currentDirPath === '/' ? '' : currentDirPath) + '/' + entryName;
                    if (node.type === 'file') { searchInFile(node, newPath); } 
                    else if (node.type === 'dir') { searchInDirectory(node, newPath); }
                }
            }
            searchInDirectory(startNode, startPath);
        } else {
            targets.forEach(fileName => {
                const node = findNodeByPath(fileName);
                if (node && node.type === 'file') { searchInFile(node, fileName); } 
                else { results.push(`grep: ${fileName}: No such file or directory`); }
            });
        }
        return results.join('\n');
    },

    chmod: (args) => {
        const isRecursive = args.includes('-R');
        const remainingArgs = args.filter(arg => arg !== '-R');
        if (remainingArgs.length < 2) return "Usage: chmod [-R] <mode> <file/dir>";
        const mode = remainingArgs[0];
        const targetPath = remainingArgs[1];
        if (!/^[0-7]{3}$/.test(mode)) return `chmod: invalid mode: ‘${mode}’`;
        const targetNode = findNodeByPath(targetPath);
        if (!targetNode) return `chmod: cannot access '${targetPath}': No such file or directory`;
        function changePermissionsRecursive(node, newMode) {
            node.permissions = newMode;
            if (node.type === 'dir' && node.content) {
                Object.values(node.content).forEach(child => changePermissionsRecursive(child, newMode));
            }
        }
        if (isRecursive) {
            if (targetNode.type !== 'dir') return `chmod: -R can only be used with directories`;
            changePermissionsRecursive(targetNode, mode);
        } else {
            targetNode.permissions = mode;
        }
        saveFileSystemToDB();
    },

    chown: (args) => {
        const isRecursive = args.includes('-R');
        const remainingArgs = args.filter(arg => arg !== '-R');
        if (remainingArgs.length < 2) return "Usage: chown [-R] <user[:group]> <file/dir>";
        const ownerSpec = remainingArgs[0];
        const targetPath = remainingArgs[1];
        const [newOwner, newGroup] = ownerSpec.split(':');
        const targetNode = findNodeByPath(targetPath);
        if (!targetNode) return `chown: cannot access '${targetPath}': No such file or directory`;
        function changeOwnerRecursive(node, owner, group) {
            if (owner) node.owner = owner;
            if (group) node.group = group;
            if (node.type === 'dir' && node.content) {
                Object.values(node.content).forEach(child => changeOwnerRecursive(child, owner, group));
            }
        }
        if (isRecursive) {
            if (targetNode.type !== 'dir') return `chown: -R can only be used with directories`;
            changeOwnerRecursive(targetNode, newOwner, newGroup);
        } else {
            if (newOwner) targetNode.owner = newOwner;
            if (newGroup) targetNode.group = newGroup;
        }
        saveFileSystemToDB();
    },

    // --- CÁC LỆNH MỚI ---
    nano: (args) => {
        if (!args[0]) return "Usage: nano <filename>";
        const fileName = args[0];
        const node = findNodeByPath(fileName);
        if (node && node.type === 'dir') return `nano: ${fileName}: Is a directory`;
        const initialContent = (node && node.type === 'file') ? node.content : '';
        enterEditorMode(fileName, initialContent);
    },

    cp: (args) => {
        if (args.length < 2) return "Usage: cp <source> <destination>";
        const [sourcePath, destPath] = args;
        const sourceNode = findNodeByPath(sourcePath);
        if (!sourceNode) return `cp: cannot stat '${sourcePath}': No such file or directory`;

        let destParentNode;
        let destName = destPath.split('/').pop();
        let destParentPath = destPath.substring(0, destPath.lastIndexOf('/'));
        
        if (destParentPath === '') destParentNode = getCurrentDirectory();
        else destParentNode = findNodeByPath(destParentPath);
        
        if (!destParentNode || destParentNode.type !== 'dir') {
             // Check if dest is a directory
             const destNode = findNodeByPath(destPath);
             if(destNode && destNode.type === 'dir') {
                 destParentNode = destNode;
                 destName = sourcePath.split('/').pop();
             } else {
                return `cp: destination '${destPath}' is not a directory.`;
             }
        }
        
        const destDirContent = destParentNode.content || destParentNode;
        if (destDirContent[destName]) return `cp: '${destPath}/${destName}' already exists.`;
        
        destDirContent[destName] = deepCopy(sourceNode);
        saveFileSystemToDB();
    },

    mv: (args) => {
        if (args.length < 2) return "Usage: mv <source> <destination>";
        const [sourcePath, destPath] = args;

        const sourceName = sourcePath.split('/').pop();
        const sourceParentPath = sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '.';
        const sourceParentNode = findNodeByPath(sourceParentPath);

        if (!sourceParentNode) return `mv: cannot stat '${sourcePath}': No such file or directory`;

        const sourceDirContent = sourceParentNode.content || sourceParentNode;
        const sourceNode = sourceDirContent[sourceName];

        if (!sourceNode) return `mv: cannot stat '${sourcePath}': No such file or directory`;

        // Logic đổi tên trong cùng thư mục
        const destNode = findNodeByPath(destPath);
        if(!destNode) {
            const destParentPath = destPath.substring(0, destPath.lastIndexOf('/')) || '.';
            if (sourceParentPath === destParentPath) {
                const destName = destPath.split('/').pop();
                sourceDirContent[destName] = deepCopy(sourceNode);
                delete sourceDirContent[sourceName];
                saveFileSystemToDB();
                return;
            }
        }
        
        // Logic di chuyển
        const cpError = commands.cp(args);
        if (cpError) return cpError; // Trả về lỗi nếu cp thất bại
        
        const destCheckNode = findNodeByPath(destPath);
        if (destCheckNode) { // Nếu cp thành công
            delete sourceDirContent[sourceName];
            saveFileSystemToDB();
        } else {
            return `mv: failed to move '${sourcePath}' to '${destPath}'.`;
        }
    },
});