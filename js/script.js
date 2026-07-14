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
});