document.addEventListener('DOMContentLoaded', () => {
    const terminal = document.getElementById('terminal');
    const history = document.getElementById('history');
    const promptElement = document.getElementById('prompt');
    const commandInput = document.getElementById('command-input');

    const storedHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // Mật khẩu: 999997
    let state = 'login';

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
            if(i < text.length) {
                p.textContent += text[i];
                i++;
                terminal.scrollTop = terminal.scrollHeight;
            } else {
                clearInterval(interval);
                if (callback) callback();
            }
        }, 50);
    }

    function showMenu() {
        print("\nPlease select an option:");
        print("(1) Go to Dashboard");
        print("(2) Open Settings");
        print("(3) System Check");
        print("(4) View Logs");
        print("(5) Network Config");
        print("(6) Logout");
        print("Type a number and press Enter.");
    }

    commandInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const command = commandInput.value.trim();
            commandInput.value = '';

            if (state === 'login') {
                handleLogin(command);
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
            if (enteredHash === storedHash) {
                print('Authentication successful. Welcome, admin!');
                state = 'command';
                promptElement.textContent = 'admin@bandung:~#';
                commandInput.type = 'text';
                showMenu();
            } else {
                print('Access denied.');
                promptElement.textContent = 'password:';
            }
        }, 300);
    }
    
    function handleCommand(command) {
        switch(command) {
            case '1':
                printHTML(`Redirecting... <a href="dashboard.html" target="_blank">Click here if you are not redirected.</a>`);
                setTimeout(() => { window.open('dashboard.html', '_blank'); }, 1000);
                break;
            case '2':
                printHTML(`Opening settings... <a href="settings.html" target="_blank">Click here to continue.</a>`);
                setTimeout(() => { window.open('settings.html', '_blank'); }, 1000);
                break;
            case '3':
                print('Running system diagnostics...');
                setTimeout(() => print('[OK] CPU: 4.2GHz | RAM: 98% Free | DISK: 75% Free'), 500);
                break;
            case '4':
                print('Displaying last 3 system logs...');
                print(`  [INFO] ${new Date().toLocaleString()} - Service 'sshd' started.`);
                print(`  [WARN] ${new Date().toLocaleString()} - High memory usage detected.`);
                print(`  [INFO] ${new Date().toLocaleString()} - User 'admin' logged in successfully.`);
                break;
            case '5':
                print('Displaying network configuration...');
                print('  eth0: 103.199.16.113');
                print('  Subnet Mask: 255.255.255.0');
                print('  Gateway: 103.199.16.1');
                break;
            case '6':
                print('Logging out...');
                setTimeout(() => location.reload(), 1000);
                break;
            case 'help':
                showMenu();
                break;
            case 'clear':
                history.innerHTML = '';
                break;
            default:
                if(command) {
                    print(`-bash: ${command}: command not found. Type 'help' to see available options.`);
                }
                break;
        }
    }

    function start() {
        commandInput.value = '';
        commandInput.type = 'password';
        type('Connecting to 103.199.16.113 (Bandung)...', () => {
            type('Connection established.', () => {
                print('Username: admin');
                promptElement.textContent = 'password:';
                commandInput.focus();
            });
        });
    }

    terminal.addEventListener('click', () => {
        commandInput.focus();
    });

    start();
});