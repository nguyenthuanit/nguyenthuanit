document.addEventListener('DOMContentLoaded', () => {
    // 1. Xác định container chứa nội dung cần thay đổi (dựa theo cấu trúc HTML của bạn)
    const mainContainer = document.querySelector('main');

    // 2. Hàm xử lý tải nội dung mới
    async function loadPage(url) {
        try {
            // Hiển thị trạng thái đang tải (tùy chọn)
            mainContainer.style.opacity = '0.5';

            // Fetch mã HTML từ URL mới
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const htmlString = await response.text();

            // Chuyển đổi chuỗi HTML thành DOM object
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');

            // Lấy phần nội dung thẻ <main> từ trang mới
            const newContent = doc.querySelector('main').innerHTML;
            
            // Cập nhật tiêu đề trang (thẻ <title>)
            document.title = doc.title;

            // Thay thế nội dung hiện tại
            mainContainer.innerHTML = newContent;

            // Cuộn lên đầu trang sau khi chuyển nội dung
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Khởi tạo lại các sự kiện JS cho nội dung mới (nếu có)
            reinitScripts();

        } catch (error) {
            console.error('Lỗi khi tải trang:', error);
            mainContainer.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2>Đã xảy ra lỗi tải trang</h2>
                    <p>Vui lòng thử lại sau.</p>
                </div>
            `;
        } finally {
            mainContainer.style.opacity = '1';
        }
    }

    // 3. Lắng nghe sự kiện click trên các thẻ <a>
    document.body.addEventListener('click', e => {
        // Tìm thẻ <a> gần nhất mà người dùng click vào
        const link = e.target.closest('a');
        
        if (link) {
            const url = link.getAttribute('href');

            // Bỏ qua nếu link là anchor (#), link ngoài (http), hoặc gọi javascript
            if (!url || url.startsWith('#') || url.startsWith('http') || url.startsWith('javascript')) {
                return;
            }

            e.preventDefault(); // Chặn tải lại trang

            // Cập nhật URL trên trình duyệt
            history.pushState(null, '', url);

            // Gọi hàm tải trang
            loadPage(url);
        }
    });

    // 4. Xử lý khi người dùng bấm nút Back/Forward trên trình duyệt
    window.addEventListener('popstate', () => {
        loadPage(location.pathname);
    });

    // Hàm gọi lại các script cần thiết cho nội dung mới được tiêm vào
    function reinitScripts() {
        // Ví dụ: Kích hoạt lại tính năng tìm kiếm hoặc menu điều hướng tab nếu nội dung mới chứa chúng
        // Bạn có thể đưa phần logic trong qa-script.js (như guide-nav-item click) vào đây
    }
});