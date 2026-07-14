document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Chức năng Menu trên di động (Hamburger) ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // --- 2. Chức năng Menu xổ xuống (Dropdown) ---
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault(); 
                const isActive = dropdown.classList.contains('active');
                closeAllDropdowns();
                if (!isActive) {
                    dropdown.classList.add('active');
                }
            });
        }
    });

    function closeAllDropdowns() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });

    // --- 3. Chức năng chuyển đổi Giao diện Sáng/Tối (Theme Toggle) ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;
    
    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    
    function toggleTheme() {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // --- 4. Chức năng Nút cuộn lên đầu trang (Scroll Top Button) ---
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });

        scrollTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // --- 5. Chức năng Cập nhật Hệ thống (Đã được chuyển từ Inline Script) ---
    const updateForm = document.getElementById('updateSystemForm');
    
    if (updateForm) {
        updateForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Ngăn chặn tải lại trang mặc định

            const btn = document.getElementById('updateSystemBtn');
            const icon = document.getElementById('updateIcon');
            const text = document.getElementById('updateBtnText');
            const detailsBox = document.getElementById('updateDetailsBox');

            if (!btn || !icon || !text || !detailsBox) return;

            // Vô hiệu hóa nút trong quá trình xử lý
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.8';
            text.innerText = 'Đang đồng bộ dữ liệu...';

            // Thêm class xoay icon
            icon.classList.add('spinning-animation');

            // Giả lập quá trình tải dữ liệu (1.5 giây)
            setTimeout(() => {
                icon.classList.remove('spinning-animation');
                text.innerText = 'Đã cập nhật mới nhất!';
                
                // Cập nhật giao diện nút sang trạng thái thành công (Xanh lá)
                btn.style.backgroundColor = '#2ecc71';
                btn.style.borderColor = '#2ecc71';
                btn.style.color = '#ffffff';

                // Mở rộng hộp thông báo chi tiết
                detailsBox.style.maxHeight = '200px';
                detailsBox.style.opacity = '1';
                
                /* LƯU Ý UX: Không tự động reload trang (window.location.reload()) sau đó.
                   Đã loại bỏ việc tự load lại để người dùng có thể tiếp tục 
                   đọc thông tin trên footer một cách tự nhiên, thoải mái nhất. */

            }, 1500);
        });
    }
    // --- 6. Chức năng Run Code Giả lập Terminal (Hero Section) ---
    const runBtn = document.getElementById('runCodeBtn');
    const outputArea = document.getElementById('codeOutputArea');
    const outputContent = document.getElementById('outputContent');
    const execTime = document.getElementById('executionTime');
    const runIcon = document.getElementById('runIcon');
    const runText = document.getElementById('runText');

    if (runBtn && outputArea && outputContent) {
        runBtn.addEventListener('click', () => {
            // Đổi trạng thái nút thành "Đang biên dịch..."
            runBtn.classList.remove('success');
            runBtn.classList.add('running');
            runIcon.className = 'fas fa-spinner fa-spin';
            runText.innerText = 'Compiling...';
            
            // Xóa output cũ và mở rộng khung Terminal
            outputContent.innerHTML = '';
            outputContent.classList.remove('cursor-blink');
            outputArea.classList.add('show');
            execTime.innerText = 'Status: Running...';

            // Giả lập thời gian server xử lý (800ms)
            setTimeout(() => {
                runIcon.className = 'fas fa-check';
                runText.innerText = 'Executed!';
                runBtn.classList.remove('running');
                runBtn.classList.add('success');
                
                // Thời gian thực thi ngẫu nhiên để tạo cảm giác thật
                const randomTime = (Math.random() * (0.08 - 0.02) + 0.02).toFixed(3);
                execTime.innerText = `Completed in ${randomTime}s`;

                // Chuỗi thông tin trả về giống output thực tế của Node.js / System
                const logLines = [
                    "[INFO] Authenticating developer credentials...",
                    "[SUCCESS] User 'Nguyễn Minh Thuận' identified.",
                    "--------------------------------------------------",
                    "🚀 SYSTEM STATUS   : ONLINE & READY TO DEPLOY",
                    "🎯 MINDSET         : First-Principles Thinking",
                    "🛠️  CORE STACK      : Full-Stack Web | System Storage | CLI",
                    "📬 AVAILABILITY    : Available for IT / Tech opportunities!",
                    "--------------------------------------------------",
                    ">> System initialized successfully. Waiting for commands..."
                ];

                // Hiệu ứng gõ chữ từng dòng (Typing Effect)
                let lineIndex = 0;
                outputContent.classList.add('cursor-blink');

                function typeLine() {
                    if (lineIndex < logLines.length) {
                        const div = document.createElement('div');
                        // Tạo màu sắc khác nhau cho dòng trạng thái
                        if (logLines[lineIndex].includes("[SUCCESS]") || logLines[lineIndex].includes("🚀")) {
                            div.style.color = "#4ade80"; // Xanh lá
                            div.style.fontWeight = "bold";
                        } else if (logLines[lineIndex].includes("[INFO]")) {
                            div.style.color = "#60a5fa"; // Xanh dương
                        } else if (logLines[lineIndex].includes("----------------")) {
                            div.style.color = "#4b5563"; // Xám
                        } else {
                            div.style.color = "#e2e8f0"; // Trắng sáng
                        }
                        
                        div.innerText = logLines[lineIndex];
                        outputContent.appendChild(div);
                        
                        // Tự động cuộn xuống dòng mới nhất
                        outputContent.scrollTop = outputContent.scrollHeight;
                        
                        lineIndex++;
                        setTimeout(typeLine, 120); // Tốc độ gõ 120ms/dòng
                    }
                }

                typeLine(); // Bắt đầu gõ

                // Trả lại trạng thái nút sau 4 giây
                setTimeout(() => {
                    runIcon.className = 'fas fa-play';
                    runText.innerText = 'Run Again';
                    runBtn.classList.remove('success');
                }, 4000);

            }, 800);
        });
    }
});