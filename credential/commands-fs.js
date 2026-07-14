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
                // Chuyển đổi '755' thành 'rwxr-xr-x'
                const perms = (details.type === 'dir' ? 'd' : '-') + 
                              [...details.permissions].map(p => {
                                  const d = parseInt(p, 10);
                                  return ((d & 4) ? 'r' : '-') + 
                                         ((d & 2) ? 'w' : '-') + 
                                         ((d & 1) ? 'x' : '-');
                              }).join('');
                return `${perms.padEnd(11)} 1 ${details.owner.padEnd(8)} ${details.group.padEnd(8)} ${'128'.padStart(6)} ${details.modified} ${item}${details.type === 'dir' ? '/' : ''}`;
            }).join('\n');
        }
        return items.map(item => currentDirContent[item].type === 'dir' ? `${item}/` : item).join('  ');
    },

    cd: (args) => {
        const dirName = args[0];
        if (!dirName || dirName === '~' || dirName === '/') { currentPath = []; return; }
        if (dirName === '..') { if (currentPath.length > 0) currentPath.pop(); return; }
        
        const targetNode = findNodeByPath(dirName);
        
        if (!targetNode) {
            return `-bash: cd: ${dirName}: No such file or directory`;
        }
        if (targetNode.type !== 'dir') {
            return `-bash: cd: ${dirName}: Not a directory`;
        }
        
        // Cập nhật currentPath dựa trên đường dẫn mới
        if (dirName.startsWith('/')) {
            currentPath = dirName.split('/').filter(p => p);
        } else if (dirName.startsWith('~')) {
             currentPath = dirName.substring(1).split('/').filter(p => p);
        } else {
            // Xử lý đường dẫn tương đối phức tạp hơn, tạm thời giả định cd đơn giản
             const currentDirNode = getCurrentDirectory();
             const currentDirContent = currentDirNode.content || currentDirNode;
             if (currentDirContent[dirName] && currentDirContent[dirName].type === 'dir') {
                 currentPath.push(dirName);
             }
        }
    },

    cat: (args, stdin) => {
        if (stdin) return stdin;
        if (args.length === 0) return "Usage: cat [file]...";
        
        return args.map(fileName => {
            const node = findNodeByPath(fileName);
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
        
        const node = findNodeByPath(targetName);
        if (!node) return `rm: cannot remove '${targetName}': No such file or directory`;

        // Tìm thư mục cha
        const parentPath = targetName.includes('/') ? targetName.substring(0, targetName.lastIndexOf('/')) : '.';
        const parentNode = findNodeByPath(parentPath) || getCurrentDirectory();
        const parentContent = parentNode.content || parentNode;
        const name = targetName.split('/').pop();

        if (!checkPermissions(node, currentUser, 'write')) return `rm: cannot remove '${targetName}': Permission denied`;
        if (node.type === 'dir' && !recursive) return `rm: cannot remove '${targetName}': Is a directory`;
        
        delete parentContent[name];
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
                    if (isRecursive || targets.length > 1) prefix += `<span style="color:var(--prompt-color);">${filePath}</span>:`;
                    if (showLineNumbers) prefix += `<span style="color:var(--link-color);">${index + 1}</span>:`;
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
                else if (node && node.type === 'dir') { results.push(`grep: ${fileName}: Is a directory`); }
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

    // --- CÁC LỆNH MỚI & CẢI TIẾN ---
    nano: (args) => {
        if (!args[0]) return "Usage: nano <filename>";
        const fileName = args[0];
        const node = findNodeByPath(fileName);
        if (node && node.type === 'dir') return `nano: ${fileName}: Is a directory`;
        const initialContent = (node && node.type === 'file') ? node.content : '';
        enterEditorMode(fileName, initialContent);
    },

    // CẢI TIẾN: `cp` với logic xử lý (file->file), (file->dir), (dir->dir)
    cp: (args) => {
        const recursive = args.includes('-r');
        const paths = args.filter(a => !a.startsWith('-'));
        if (paths.length < 2) return "Usage: cp [-r] <source> <destination>";
        
        const sourcePath = paths[0];
        const destPath = paths[1];
        
        const sourceNode = findNodeByPath(sourcePath);
        if (!sourceNode) return `cp: cannot stat '${sourcePath}': No such file or directory`;
        if (sourceNode.type === 'dir' && !recursive) return `cp: -r not specified; omitting directory '${sourcePath}'`;
        
        const sourceName = sourcePath.split('/').pop();
        const destNode = findNodeByPath(destPath);
        
        // Trường hợp 1: Đích là một thư mục (e.g., cp file.txt docs/)
        if (destNode && destNode.type === 'dir') {
            const destDirContent = destNode.content || destNode;
            if (destDirContent[sourceName]) return `cp: cannot copy '${sourcePath}' to '${destPath}/${sourceName}': File exists`;
            destDirContent[sourceName] = deepCopy(sourceNode);
        }
        // Trường hợp 2: Đích là file hoặc không tồn tại (e.g., cp file.txt new.txt)
        else {
            const destName = destPath.split('/').pop();
            const destParentPath = destPath.includes('/') ? destPath.substring(0, destPath.lastIndexOf('/')) : '.';
            const destParentNode = findNodeByPath(destParentPath) || getCurrentDirectory();
            
            if (!destParentNode || destParentNode.type !== 'dir') return `cp: cannot create regular file '${destPath}': Not a directory`;
            
            const destDirContent = destParentNode.content || destParentNode;
            if (destDirContent[destName]) return `cp: cannot copy to '${destPath}': File exists`;
            
            destDirContent[destName] = deepCopy(sourceNode);
        }
        saveFileSystemToDB();
    },

    // CẢI TIẾN: `mv` với logic xử lý (rename), (move->dir)
    mv: (args) => {
        if (args.length < 2) return "Usage: mv <source> <destination>";
        const [sourcePath, destPath] = args;

        // 1. Tìm node nguồn và cha của nó
        const sourceName = sourcePath.split('/').pop();
        const sourceParentPath = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : '.';
        const sourceParentNode = findNodeByPath(sourceParentPath) || getCurrentDirectory();

        if (!sourceParentNode || !sourceParentNode.content) return `mv: cannot stat '${sourcePath}': No such file or directory`;
        
        const sourceDirContent = sourceParentNode.content || sourceParentNode;
        const sourceNode = sourceDirContent[sourceName];

        if (!sourceNode) return `mv: cannot stat '${sourcePath}': No such file or directory`;

        // 2. Tìm node đích
        const destNode = findNodeByPath(destPath);

        // Trường hợp 1: Đích là thư mục (e.g., mv file.txt docs/)
        if (destNode && destNode.type === 'dir') {
            const destDirContent = destNode.content;
            if (destDirContent[sourceName]) return `mv: cannot move '${sourcePath}' to '${destPath}/${sourceName}': File exists`;
            
            destDirContent[sourceName] = sourceNode; // Di chuyển node
            delete sourceDirContent[sourceName]; // Xóa khỏi vị trí cũ
        } 
        // Trường hợp 2: Đích là file hoặc không tồn tại (rename hoặc move+rename)
        else {
            const destName = destPath.split('/').pop();
            const destParentPath = destPath.includes('/') ? destPath.substring(0, destPath.lastIndexOf('/')) : '.';
            const destParentNode = findNodeByPath(destParentPath) || getCurrentDirectory();

            if (!destParentNode || destParentNode.type !== 'dir') return `mv: cannot move to '${destPath}': Not a directory`;
            
            const destDirContent = destParentNode.content || destParentNode;
            if (destDirContent[destName]) return `mv: cannot move to '${destPath}': File exists`;
            
            destDirContent[destName] = sourceNode;
            delete sourceDirContent[sourceName];
        }
        
        saveFileSystemToDB();
    },

    // --- LỆNH MỚI ---
    pwd: () => {
        return '/' + currentPath.join('/');
    },

    stat: (args) => {
        if (!args[0]) return "Usage: stat <file>";
        const node = findNodeByPath(args[0]);
        if (!node) return `stat: cannot stat '${args[0]}': No such file or directory`;
        
        const perms = (node.type === 'dir' ? 'd' : '-') + 
                      [...node.permissions].map(p => {
                          const d = parseInt(p, 10);
                          return ((d & 4) ? 'r' : '-') + ((d & 2) ? 'w' : '-') + ((d & 1) ? 'x' : '-');
                      }).join('');

        return [
            `  File: ${args[0]}`,
            `  Type: ${node.type}`,
            `Access: (${node.permissions}/${perms})  Owner: ( ${node.owner} / ${node.group} )`,
            `Modify: ${node.modified}`
        ].join('\n');
    },

    wc: (args, stdin) => {
        let content = '';
        let fileName = '';
        if (stdin) {
            content = stdin;
        } else {
            if (args.length === 0) return "Usage: wc [-l, -w, -c] <file>";
            fileName = args.find(arg => !arg.startsWith('-'));
            if (!fileName) return "Usage: wc [-l, -w, -c] <file>";
            const node = findNodeByPath(fileName);
            if (!node) return `wc: ${fileName}: No such file or directory`;
            if (node.type === 'dir') return `wc: ${fileName}: Is a directory`;
            content = node.content;
        }
        
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(Boolean).length;
        const chars = content.length;

        const showLines = args.includes('-l');
        const showWords = args.includes('-w');
        const showChars = args.includes('-c');

        if (!showLines && !showWords && !showChars) {
            return `  ${lines}  ${words}  ${chars} ${fileName}`;
        }
        
        let output = [];
        if (showLines) output.push(lines);
        if (showWords) output.push(words);
        if (showChars) output.push(chars);
        
        return `  ${output.join('  ')} ${fileName}`;
    },

    head: (args, stdin) => {
        let n = 10;
        let fileName = '';
        
        if (args.includes('-n')) {
            const nIndex = args.indexOf('-n');
            if (args[nIndex + 1]) n = parseInt(args[nIndex + 1]);
            fileName = args.filter(a => a !== '-n' && a !== String(n))[0];
        } else {
            fileName = args[0];
        }
        
        let content = '';
        if (stdin) content = stdin;
        else {
            if (!fileName) return "Usage: head [-n K] <file>";
            const node = findNodeByPath(fileName);
            if (!node) return `head: ${fileName}: No such file or directory`;
            if (node.type === 'dir') return `head: error reading '${fileName}': Is a directory`;
            content = node.content;
        }
        
        return content.split('\n').slice(0, n).join('\n');
    },

    tail: (args, stdin) => {
        let n = 10;
        let fileName = '';
        
        if (args.includes('-n')) {
            const nIndex = args.indexOf('-n');
            if (args[nIndex + 1]) n = parseInt(args[nIndex + 1]);
            fileName = args.filter(a => a !== '-n' && a !== String(n))[0];
        } else {
            fileName = args[0];
        }

        let content = '';
        if (stdin) content = stdin;
        else {
            if (!fileName) return "Usage: tail [-n K] <file>";
            const node = findNodeByPath(fileName);
            if (!node) return `tail: ${fileName}: No such file or directory`;
            if (node.type === 'dir') return `tail: error reading '${fileName}': Is a directory`;
            content = node.content;
        }
        
        return content.split('\n').slice(-n).join('\n');
    },

    find: (args) => {
        const path = args[0] || '.';
        const namePattern = args[1] === '-name' ? args[2] : null;
        
        if (!namePattern) return "Usage: find <path> -name <pattern>";
        
        const startNode = findNodeByPath(path);
        if (!startNode || startNode.type !== 'dir') return `find: '${path}': No such file or directory`;
        
        const regex = new RegExp(namePattern.replace(/\*/g, '.*'));
        let results = [];
        
        function searchRecursive(directory, currentPath) {
            const dirContent = directory.content || directory;
            for (const entryName in dirContent) {
                const node = dirContent[entryName];
                const fullPath = (currentPath === '/' ? '' : currentPath) + '/' + entryName;
                
                if (entryName.match(regex)) {
                    results.push(fullPath);
                }
                
                if (node.type === 'dir') {
                    searchRecursive(node, fullPath);
                }
            }
        }
        
        searchRecursive(startNode, path);
        return results.join('\n');
    },
    
    df: () => {
        return `<pre>
Filesystem     Size  Used Avail Use% Mounted on
/dev/root      100G   20G   80G  20% /
(SSD)   1.0T 250G  750G  25% /mnt/data</pre>`;
    },
    
    which: (args) => {
        const cmd = args[0];
        if (!cmd) return "Usage: which <command>";
        if (commands[cmd]) return (env['PATH'] || '/usr/bin') + '/' + cmd;
        if (aliases[cmd]) return `which: '${cmd}' is an aliased command: alias ${cmd}='${aliases[cmd]}'`;
        return `which: no ${cmd} in (${env['PATH'] || '/usr/bin'})`;
    },

});