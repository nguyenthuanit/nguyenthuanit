document.addEventListener('DOMContentLoaded', () => {

    // --- Chức năng cho Menu trên di động (Hamburger) ---
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // --- Chức năng cho Menu xổ xuống (Dropdown) ---
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                // Ngăn chặn hành vi mặc định của thẻ <a>
                e.preventDefault(); 
                
                // Kiểm tra xem dropdown này có đang active không
                const isActive = dropdown.classList.contains('active');

                // Đóng tất cả các dropdown khác trước khi mở cái mới
                closeAllDropdowns();

                // Nếu dropdown này chưa active, hãy mở nó
                if (!isActive) {
                    dropdown.classList.add('active');
                }
            });
        }
    });

    // Hàm đóng tất cả các dropdown
    function closeAllDropdowns() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }

    // Lắng nghe sự kiện click trên toàn bộ trang để đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        // Nếu không click vào bên trong một dropdown nào thì đóng tất cả
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });


    // --- Chức năng chuyển đổi Giao diện Sáng/Tối (Theme Toggle) ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Hàm áp dụng theme
    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    
    // Hàm chuyển đổi theme
    function toggleTheme() {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    // Tải theme đã lưu từ localStorage khi trang được tải
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);


    // --- Chức năng Nút cuộn lên đầu trang (Scroll Top Button) ---
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    if (scrollTopBtn) {
        // Hiển thị/ẩn nút khi cuộn trang
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });

        // Cuộn lên đầu khi click
        scrollTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});