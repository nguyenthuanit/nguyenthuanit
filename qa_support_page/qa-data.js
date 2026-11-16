/* ==========================================================
   QA-DATA.JS — KHO DỮ LIỆU CHỦ ĐỀ & BÀI VIẾT HƯỚNG DẪN
   ========================================================== */

const GUIDE_DATA = {
    // 1. CHỦ ĐỀ: HƯỚNG DẪN BẬT / TẮT MÁY
    "bat-tat-may": {
        title: "Hướng dẫn bật/tắt máy tính",
        icon: "fas fa-power-off",
        desc: "Tổng hợp các quy trình khởi động, tắt máy chuẩn kỹ thuật và xử lý sự cố nguồn điện giúp kéo dài tuổi thọ linh kiện.",
        articles: [
            {
                id: "bat-tat-chuan",
                title: "Quy trình bật và tắt máy tính PC / Laptop đúng cách",
                badge: "Cơ bản",
                readTime: "3 phút đọc",
                summary: "Cách mở nguồn, tắt máy an toàn tránh sốc điện và lỗi hệ điều hành Windows.",
                content: `
                    <div class="guide-alert guide-alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div><strong>Lưu ý quan trọng:</strong> Tuyệt đối không rút dây nguồn trực tiếp hoặc nhấn giữ nút nguồn cứng khi máy đang cập nhật hệ thống (Windows Update).</div>
                    </div>
                    <h3>1. Quy trình bật máy tính</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Kiểm tra công tắc nguồn (PSU) & Màn hình</h4>
                                <p>Đảm bảo công tắc phía sau thùng máy đang gạt sang vị trí <span class="highlight">I (ON)</span> và bật nút nguồn màn hình.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Nhấn nút Power trên Case</h4>
                                <p>Nhấn nhẹ nút nguồn trên vỏ máy (hoặc bàn phím Laptop) và chờ hệ thống nạp BIOS/Windows.</p>
                            </div>
                        </div>
                    </div>
                    <h3>2. Quy trình tắt máy an toàn</h3>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-check-circle"></i> Lưu lại toàn bộ tài liệu đang làm việc và đóng các phần mềm đang mở.</li>
                        <li><i class="fas fa-check-circle"></i> Nhấn tổ hợp phím <span class="highlight">Alt + F4</span> tại màn hình Desktop hoặc chọn <strong>Start → Power → Shut down</strong>.</li>
                        <li><i class="fas fa-check-circle"></i> Chờ đèn báo nguồn trên thùng máy tắt hẳn mới ngắt điện ổn áp/ổ cắm.</li>
                    </ul>
                `
            },
            {
                id: "phan-biet-sleep-hibernate",
                title: "Phân biệt chế độ Sleep, Hibernate và Shut down",
                badge: "Kiến thức",
                readTime: "4 phút đọc",
                summary: "Khi nào nên dùng Sleep, Hibernate hay tắt hẳn máy để tiết kiệm điện và bảo vệ RAM/SSD?",
                content: `
                    <div class="guide-alert guide-alert-info">
                        <i class="fas fa-info-circle"></i>
                        <div>Hiểu đúng các chế độ nguồn giúp bạn làm việc linh hoạt mà không làm chai pin Laptop hay giảm tuổi thọ ổ cứng.</div>
                    </div>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-moon"></i> <strong>Sleep (Ngủ):</strong> Lưu trạng thái làm việc vào <strong>RAM</strong>, tiêu thụ rất ít điện. Phù hợp khi nghỉ trưa hoặc rời máy dưới 2 tiếng.</li>
                        <li><i class="fas fa-hdd"></i> <strong>Hibernate (Ngủ đông):</strong> Chép toàn bộ dữ liệu từ RAM xuống ổ cứng <strong>SSD</strong> rồi ngắt điện hoàn toàn. Phù hợp khi cần di chuyển xa mà vẫn giữ nguyên các tab đang mở.</li>
                        <li><i class="fas fa-power-off"></i> <strong>Shut down (Tắt hẳn):</strong> Đóng toàn bộ tiến trình, làm mới bộ nhớ RAM và tắt nguồn hoàn toàn. Nên thực hiện vào cuối ngày làm việc.</li>
                    </ul>
                `
            },
            {
                id: "xu-ly-treo-may",
                title: "Cách xử lý khi máy tính bị treo cứng không tắt được",
                badge: "Xử lý sự cố",
                readTime: "3 phút đọc",
                summary: "Các bước giải phóng ứng dụng bị đơ (Not Responding) trước khi phải nhấn giữ nút nguồn.",
                content: `
                    <h3>Các bước xử lý từ nhẹ đến mạnh</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Mở Task Manager để đóng phần mềm treo</h4>
                                <p>Nhấn tổ hợp <span class="highlight">Ctrl + Shift + Esc</span> → chọn ứng dụng báo <em>Not Responding</em> → bấm <strong>End task</strong>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Khởi động lại Driver Card đồ họa</h4>
                                <p>Nhấn tổ hợp <span class="highlight">Win + Ctrl + Shift + B</span> để làm mới màn hình nếu chuột vẫn di chuyển được nhưng màn hình đứng hình.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <h4>Tắt cứng bằng nút nguồn (Biện pháp cuối)</h4>
                                <p>Nhấn và giữ nút <strong>Power</strong> trên thùng máy khoảng <strong>5 - 7 giây</strong> cho đến khi đèn nguồn tắt hẳn, chờ 10 giây rồi bật lại.</p>
                            </div>
                        </div>
                    </div>
                `
            }
        ]
    },

    // 2. CHỦ ĐỀ: CÀI ĐẶT WINDOWS
    "cai-win": {
        title: "Cài đặt Windows",
        icon: "fab fa-windows",
        desc: "Hướng dẫn chi tiết từ khâu tạo USB Boot chuẩn UEFI/GPT, cài mới Windows 10/11 đến cài đặt Driver và phần mềm thiết yếu.",
        articles: [
            {
                id: "tao-usb-boot-rufus",
                title: "Tạo USB cài đặt Windows 10 / 11 chuẩn UEFI bằng Rufus",
                badge: "Chuẩn bị",
                readTime: "5 phút đọc",
                summary: "Hướng dẫn sử dụng công cụ Rufus tạo USB cài Win nhanh chóng, hỗ trợ vượt qua kiểm tra TPM 2.0.",
                content: `
                    <div class="guide-alert guide-alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div><strong>Cảnh báo dữ liệu:</strong> Toàn bộ dữ liệu trên USB sẽ bị xóa sạch (Format) trong quá trình tạo bộ cài. Hãy sao lưu dữ liệu trước!</div>
                    </div>
                    <h3>Các bước thực hiện</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Chuẩn bị công cụ</h4>
                                <p>Cắm USB dung lượng tối thiểu <strong>8GB</strong> vào máy. Tải phần mềm <strong>Rufus</strong> bản mới nhất và file ảnh đĩa <span class="highlight">.ISO</span> Windows 10/11 chính chủ từ Microsoft.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Thiết lập thông số trên Rufus</h4>
                                <p>Chọn đúng tên USB ở mục <strong>Device</strong> → bấm <strong>SELECT</strong> trỏ tới file ISO → chọn <strong>Partition scheme: GPT</strong> và <strong>Target system: UEFI</strong>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <h4>Bắt đầu ghi bộ cài</h4>
                                <p>Nhấn <strong>START</strong>, chờ thanh trạng thái chạy đến 100% báo <span class="highlight">READY</span> là hoàn tất.</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                id: "phim-tat-boot-bios",
                title: "Danh sách phím tắt vào Boot Menu & BIOS các hãng Mainboard / Laptop",
                badge: "Tra cứu",
                readTime: "2 phút đọc",
                summary: "Bảng tổng hợp phím nóng vào Boot Option (Asus, Gigabyte, MSI, Dell, HP, Lenovo, Acer).",
                content: `
                    <div class="guide-alert guide-alert-info">
                        <i class="fas fa-keyboard"></i>
                        <div>Nhấn liên tục phím tắt ngay sau khi bấm nút nguồn (trước khi logo Windows xuất hiện).</div>
                    </div>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-microchip"></i> <strong>Mainboard ASUS:</strong> Boot Menu: <span class="highlight">F8</span> | BIOS: <span class="highlight">Del</span> hoặc <span class="highlight">F2</span></li>
                        <li><i class="fas fa-microchip"></i> <strong>Mainboard GIGABYTE:</strong> Boot Menu: <span class="highlight">F12</span> | BIOS: <span class="highlight">Del</span></li>
                        <li><i class="fas fa-microchip"></i> <strong>Mainboard MSI / ASRock:</strong> Boot Menu: <span class="highlight">F11</span> | BIOS: <span class="highlight">Del</span></li>
                        <li><i class="fas fa-laptop"></i> <strong>Laptop Dell / Lenovo:</strong> Boot Menu: <span class="highlight">F12</span> | BIOS: <span class="highlight">F2</span> (hoặc nút Novo trên Lenovo)</li>
                        <li><i class="fas fa-laptop"></i> <strong>Laptop HP:</strong> Boot Menu: <span class="highlight">F9</span> | BIOS: <span class="highlight">F10</span></li>
                        <li><i class="fas fa-laptop"></i> <strong>Laptop Acer:</strong> Boot Menu: <span class="highlight">F12</span> | BIOS: <span class="highlight">F2</span> (Cần bật F12 Boot Menu trong BIOS)</li>
                    </ul>
                `
            },
            {
                id: "cai-dat-windows-chi-tiet",
                title: "Các bước cài mới Windows 10 / 11 sạch sẽ từ USB Boot",
                badge: "Thực hành",
                readTime: "7 phút đọc",
                summary: "Hướng dẫn chia ổ đĩa, format phân vùng hệ thống và thiết lập tài khoản sau khi cài đặt.",
                content: `
                    <h3>Quy trình cài đặt chuẩn kỹ thuật</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Khởi động từ USB</h4>
                                <p>Cắm USB Boot, mở Boot Menu và chọn dòng có chữ <span class="highlight">UEFI: [Tên USB của bạn]</span>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Chọn phiên bản & Kiểu cài đặt</h4>
                                <p>Bấm <strong>Next → Install Now</strong> → chọn phiên bản (khuyên dùng <strong>Windows 10/11 Pro</strong>) → chọn kiểu cài đặt <strong>Custom: Install Windows only (advanced)</strong>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <h4>Xử lý phân vùng ổ đĩa (Quan trọng)</h4>
                                <p>Xác định đúng phân vùng ổ <strong>C:</strong> cũ (dựa vào dung lượng), chọn <strong>Delete</strong> các phân vùng hệ thống cũ (System, MSR, Primary của ổ C) thành <em>Unallocated Space</em> rồi bấm <strong>Next</strong>. (Không đụng vào ổ D/E chứa dữ liệu).</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                id: "cai-driver-sau-cai-win",
                title: "Hướng dẫn cài đặt Driver & Tối ưu Windows sau khi cài mới",
                badge: "Tối ưu",
                readTime: "5 phút đọc",
                summary: "Cập nhật đầy đủ Driver Chipset, VGA, âm thanh và cài đặt bộ gõ tiếng Việt, giải nén.",
                content: `
                    <div class="guide-alert guide-alert-success">
                        <i class="fas fa-check-circle"></i>
                        <div>Kết nối mạng Internet ngay sau khi vào màn hình Desktop để Windows Update tự động nhận diện phần lớn Driver cơ bản.</div>
                    </div>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-cogs"></i> <strong>Bước 1 - Windows Update:</strong> Mở <span class="highlight">Settings → Windows Update</span> và bấm <strong>Check for updates</strong> cho đến khi tải xong toàn bộ bản vá và Driver.</li>
                        <li><i class="fas fa-desktop"></i> <strong>Bước 2 - Driver Card đồ họa (VGA):</strong> Tải trực tiếp từ trang chủ <strong>NVIDIA</strong>, <strong>AMD</strong> hoặc <strong>Intel</strong> để đạt hiệu năng đồ họa/game cao nhất.</li>
                        <li><i class="fas fa-box-open"></i> <strong>Bước 3 - Bộ phần mềm cơ bản:</strong> Cài đặt bộ gõ tiếng Việt (<strong>EVKey</strong> hoặc <strong>UniKey</strong>), trình giải nén (<strong>7-Zip / WinRAR</strong>), trình duyệt và bộ thư viện <strong>Visual C++ Redistributable</strong>.</li>
                    </ul>
                `
            }
        ]
    },

    // 3. CHỦ ĐỀ: DIỆT VIRUS AN TOÀN
    "diet-virus": {
        title: "Diệt Virus an toàn",
        icon: "fas fa-shield-virus",
        desc: "Giải pháp phòng chống mã độc, nhận diện phần mềm gián điệp và cấu hình bảo mật hệ thống không làm nặng máy.",
        articles: [
            {
                id: "cau-hinh-windows-defender",
                title: "Tối ưu Windows Security (Defender) bảo vệ thời gian thực",
                badge: "Khuyên dùng",
                readTime: "4 phút đọc",
                summary: "Cách kích hoạt đầy đủ lá chắn bảo vệ mặc định của Microsoft mà không cần cài thêm phần mềm bên thứ 3.",
                content: `
                    <div class="guide-alert guide-alert-success">
                        <i class="fas fa-shield-alt"></i>
                        <div>Trên Windows 10 và Windows 11, <strong>Microsoft Defender</strong> đã đủ mạnh mẽ, nhẹ máy và nhận diện tốt hầu hết mã độc phổ biến.</div>
                    </div>
                    <h3>Các tính năng cần bật</h3>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-check-circle"></i> Mở <strong>Windows Security → Virus & threat protection → Manage settings</strong>.</li>
                        <li><i class="fas fa-check-circle"></i> Bật <strong>Real-time protection</strong> (Bảo vệ thời gian thực) và <strong>Cloud-delivered protection</strong>.</li>
                        <li><i class="fas fa-check-circle"></i> Bật <strong>Ransomware protection (Controlled folder access)</strong> để chống mã độc mã hóa dữ liệu tống tiền.</li>
                    </ul>
                `
            },
            {
                id: "quet-ma-doc-chuyen-sau",
                title: "Cách quét và gỡ bỏ mã độc cứng đầu bằng công cụ miễn phí",
                badge: "Chuyên sâu",
                readTime: "5 phút đọc",
                summary: "Sử dụng Malwarebytes và Microsoft Safety Scanner để dọn sạch Adware, Trojan ẩn sâu.",
                content: `
                    <h3>Quy trình làm sạch hệ thống nhiễm mã độc</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Ngắt kết nối Internet tạm thời</h4>
                                <p>Rút dây mạng hoặc tắt Wi-Fi nếu nghi ngờ máy đang bị điều khiển từ xa hoặc đang gửi dữ liệu ra ngoài.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Quét ngoại tuyến (Microsoft Defender Offline Scan)</h4>
                                <p>Vào <strong>Virus & threat protection → Scan options → Microsoft Defender Offline scan → Scan now</strong>. Máy sẽ khởi động lại và quét trước khi Windows nạp.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <h4>Quét bổ sung với Malwarebytes</h4>
                                <p>Tải bản miễn phí của <strong>Malwarebytes</strong> để loại bỏ các phần mềm quảng cáo (Adware) và tiện ích trình duyệt độc hại.</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                id: "phong-tranh-ransomware-lua-dao",
                title: "Nguyên tắc phòng tránh mã độc tống tiền & File giả mạo",
                badge: "An toàn",
                readTime: "3 phút đọc",
                summary: "Nhận biết các đuôi file nguy hiểm (.exe, .scr, .bat, .vbs) và thói quen tải phần mềm an toàn.",
                content: `
                    <div class="guide-alert guide-alert-warning">
                        <i class="fas fa-user-secret"></i>
                        <div>90% trường hợp nhiễm virus đến từ việc tải phần mềm bẻ khóa (Crack) không rõ nguồn gốc hoặc mở tệp đính kèm lạ qua Zalo/Email.</div>
                    </div>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-eye"></i> <strong>Luôn bật hiển thị đuôi file:</strong> Trong File Explorer chọn <strong>View → Show → File name extensions</strong> để tránh bị lừa bởi file có tên dạng <span class="highlight">Bao_gia.pdf.exe</span>.</li>
                        <li><i class="fas fa-globe"></i> <strong>Kiểm tra file trước khi mở:</strong> Tải tệp nghi ngờ lên trang <strong>VirusTotal.com</strong> để quét bằng hơn 70 bộ máy diệt virus cùng lúc.</li>
                        <li><i class="fas fa-cloud-upload-alt"></i> <strong>Sao lưu dữ liệu 3-2-1:</strong> Luôn lưu bản sao dữ liệu quan trọng lên ổ cứng rời hoặc Google Drive/OneDrive.</li>
                    </ul>
                `
            }
        ]
    },

    // 4. CHỦ ĐỀ: HƯỚNG DẪN LẮP RÁP PC
    "lap-rap-pc": {
        title: "Hướng dẫn lắp ráp PC",
        icon: "fas fa-microchip",
        desc: "Cẩm nang tự lắp ráp máy tính để bàn chuẩn kỹ thuật: lắp CPU, RAM, SSD NVMe, đi dây nguồn PSU và tối ưu luồng gió tản nhiệt.",
        articles: [
            {
                id: "chuan-bi-linh-kien-pc",
                title: "Kiểm tra tính tương thích linh kiện & Dụng cụ cần chuẩn bị",
                badge: "Bước 1",
                readTime: "4 phút đọc",
                summary: "Đối chiếu Socket CPU - Mainboard, chuẩn RAM DDR4/DDR5 và công suất nguồn PSU trước khi lắp.",
                content: `
                    <div class="guide-alert guide-alert-info">
                        <i class="fas fa-tools"></i>
                        <div>Chỉ cần 1 chiếc tua-vít 4 cạnh đầu từ tính (nam châm) cỡ PH2 và vài dây rút nhựa là đủ để lắp hoàn chỉnh một bộ PC.</div>
                    </div>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-microchip"></i> <strong>CPU & Mainboard:</strong> Phải trùng Socket (ví dụ Intel LGA 1700 đi với Mainboard H610/B760/Z790; AMD AM5 đi với A620/B650/X670).</li>
                        <li><i class="fas fa-memory"></i> <strong>RAM:</strong> Kiểm tra kỹ Mainboard hỗ trợ chuẩn <strong>DDR4</strong> hay <strong>DDR5</strong>. Nên lắp 2 thanh (Dual Channel) ở khe <strong>A2 và B2</strong>.</li>
                        <li><i class="fas fa-bolt"></i> <strong>Nguồn (PSU):</strong> Chọn nguồn công suất thực đạt chuẩn <strong>80 Plus Bronze</strong> trở lên, dư tải khoảng 20-30% so với tổng công suất CPU + VGA.</li>
                    </ul>
                `
            },
            {
                id: "lap-cpu-ram-ssd-len-main",
                title: "Lắp đặt CPU, tản nhiệt, RAM và SSD NVMe lên Mainboard",
                badge: "Bước 2",
                readTime: "6 phút đọc",
                summary: "Thao tác lắp các linh kiện cốt lõi bên ngoài vỏ Case và test xuất hình trước khi bắt ốc.",
                content: `
                    <h3>Thứ tự lắp trên bề mặt hộp Mainboard</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Lắp CPU vào Socket</h4>
                                <p>Mở chốt giữ, đặt nhẹ CPU vào sao cho <strong>dấu tam giác vàng</strong> ở góc CPU trùng với dấu tam giác trên Socket. Không ấn mạnh, gạt chốt khóa lại.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Lắp ổ cứng SSD M.2 NVMe & RAM</h4>
                                <p>Cắm SSD M.2 nghiêng góc 30 độ vào khe, ấn xuống và vặn ốc cố định (nhớ bóc nilon miếng tản nhiệt nếu có). Cắm RAM thẳng đứng vào khe A2 - B2 đến khi nghe tiếng <em>tách</em>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <h4>Bôi keo tản nhiệt & Gắn tản nhiệt CPU</h4>
                                <p>Chấm một lượng keo bằng hạt đậu vào giữa lưng CPU, bóc lớp nilon dưới đế đồng tản nhiệt và siết đều ốc theo hình chữ X.</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                id: "cam-day-nguon-front-panel",
                title: "Sơ đồ cắm dây nguồn PSU & Dây nút nguồn Front Panel",
                badge: "Bước 3",
                readTime: "5 phút đọc",
                summary: "Hướng dẫn phân biệt dây nguồn CPU (4+4 pin) với dây VGA (6+2 pin) và cách cắm cụm F_PANEL.",
                content: `
                    <div class="guide-alert guide-alert-warning">
                        <i class="fas fa-bolt"></i>
                        <div><strong>Tuyệt đối không cắm nhầm:</strong> Dây nguồn CPU ghi chữ <strong>CPU (4+4 pin)</strong> cắm góc trên bên trái Mainboard; dây <strong>PCI-E (6+2 pin)</strong> chỉ dùng cắm cho Card đồ họa (VGA).</div>
                    </div>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-plug"></i> <strong>Dây 24-pin ATX:</strong> Cắm vào cạnh phải Mainboard để cấp nguồn chính.</li>
                        <li><i class="fas fa-toggle-on"></i> <strong>Cụm dây Front Panel (F_PANEL):</strong> Nằm ở góc dưới bên phải Mainboard. Hai dây quan trọng nhất là <span class="highlight">POWER SW</span> (nút bật máy) và <span class="highlight">RESET SW</span> (nút khởi động lại) — không phân biệt cực âm/dương.</li>
                        <li><i class="fas fa-lightbulb"></i> <strong>Dây đèn báo:</strong> <span class="highlight">POWER LED (+/-)</span> và <span class="highlight">HDD LED (+/-)</span> cần cắm đúng cực dương (+) bên trái, âm (-) bên phải theo ký hiệu trên Mainboard.</li>
                    </ul>
                `
            },
            {
                id: "toi-uu-airflow-tan-nhiet",
                title: "Nguyên lý tối ưu luồng khí tản nhiệt (Airflow) trong thùng máy",
                badge: "Kinh nghiệm",
                readTime: "4 phút đọc",
                summary: "Cách bố trí quạt hút gió mát và quạt thổi khí nóng giúp giảm 5-10°C nhiệt độ linh kiện.",
                content: `
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-arrow-right"></i> <strong>Mặt trước & Mặt đáy (Intake):</strong> Lắp quạt <strong>hút gió mát</strong> từ ngoài vào trong thùng máy.</li>
                        <li><i class="fas fa-arrow-up"></i> <strong>Mặt sau & Mặt nóc (Exhaust):</strong> Lắp quạt <strong>thổi khí nóng</strong> từ trong ra ngoài (vì khí nóng luôn có xu hướng bốc lên trên).</li>
                        <li><i class="fas fa-filter"></i> <strong>Áp suất dương nhẹ:</strong> Số lượng quạt hút vào nhiều hơn quạt thổi ra giúp hạn chế bụi lọt qua các khe hở không có lưới lọc.</li>
                    </ul>
                `
            }
        ]
    },

    // 5. CHỦ ĐỀ: CẤU HÌNH KẾT NỐI MẠNG
    "ket-noi-mang": {
        title: "Cấu hình kết nối Mạng",
        icon: "fas fa-wifi",
        desc: "Hướng dẫn thiết lập IP tĩnh, đổi DNS tăng tốc truy cập, bấm đầu dây mạng RJ45 và khắc phục lỗi mất kết nối Internet.",
        articles: [
            {
                id: "dat-ip-tinh-va-dns",
                title: "Cách đặt địa chỉ IP tĩnh & Đổi DNS (Google / Cloudflare) trên Windows",
                badge: "Cơ bản",
                readTime: "4 phút đọc",
                summary: "Giúp kết nối mạng ổn định, tránh xung đột IP trong mạng LAN và truy cập web nhanh hơn.",
                content: `
                    <h3>Các bước cấu hình IPv4</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Mở Network Connections</h4>
                                <p>Nhấn tổ hợp <span class="highlight">Win + R</span> → gõ lệnh <span class="highlight">ncpa.cpl</span> → bấm <strong>Enter</strong>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Truy cập thuộc tính IPv4</h4>
                                <p>Chuột phải vào card mạng đang dùng (<strong>Ethernet</strong> hoặc <strong>Wi-Fi</strong>) → chọn <strong>Properties</strong> → nhấp đúp vào <strong>Internet Protocol Version 4 (TCP/IPv4)</strong>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <h4>Nhập thông số DNS tối ưu</h4>
                                <p>Chọn <em>Use the following DNS server addresses</em> và nhập <strong>Cloudflare DNS</strong> (<span class="highlight">1.1.1.1</span> / <span class="highlight">1.0.0.1</span>) hoặc <strong>Google DNS</strong> (<span class="highlight">8.8.8.8</span> / <span class="highlight">8.8.4.4</span>) → bấm <strong>OK</strong>.</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                id: "thu-tu-bam-day-mang-rj45",
                title: "Thứ tự màu dây bấm cáp mạng RJ45 chuẩn B (T568B)",
                badge: "Kỹ thuật",
                readTime: "3 phút đọc",
                summary: "Sơ đồ 8 sợi màu chuẩn quốc tế dùng cho hầu hết hệ thống mạng LAN văn phòng và gia đình.",
                content: `
                    <div class="guide-alert guide-alert-info">
                        <i class="fas fa-network-wired"></i>
                        <div>Đặt đầu hạt mạng RJ45 ngửa phần lá đồng lên trên, chốt khóa hướng xuống dưới và đếm thứ tự từ <strong>trái sang phải</strong>.</div>
                    </div>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-circle" style="color:#fb923c;"></i> <strong>Chân 1:</strong> Trắng Cam</li>
                        <li><i class="fas fa-circle" style="color:#f97316;"></i> <strong>Chân 2:</strong> Cam</li>
                        <li><i class="fas fa-circle" style="color:#4ade80;"></i> <strong>Chân 3:</strong> Trắng Xanh Lá</li>
                        <li><i class="fas fa-circle" style="color:#2563eb;"></i> <strong>Chân 4:</strong> Xanh Dương</li>
                        <li><i class="fas fa-circle" style="color:#93c5fd;"></i> <strong>Chân 5:</strong> Trắng Xanh Dương</li>
                        <li><i class="fas fa-circle" style="color:#16a34a;"></i> <strong>Chân 6:</strong> Xanh Lá</li>
                        <li><i class="fas fa-circle" style="color:#a16207;"></i> <strong>Chân 7:</strong> Trắng Nâu</li>
                        <li><i class="fas fa-circle" style="color:#713f12;"></i> <strong>Chân 8:</strong> Nâu</li>
                    </ul>
                `
            },
            {
                id: "lenh-cmd-sua-loi-mang",
                title: "Bộ lệnh CMD làm mới card mạng & Sửa lỗi mất Internet",
                badge: "Xử lý sự cố",
                readTime: "3 phút đọc",
                summary: "Giải phóng bộ nhớ đệm DNS và đặt lại Winsock khi máy báo chấm than vàng hoặc không vào được web.",
                content: `
                    <p class="guide-desc">Mở <strong>Command Prompt (CMD)</strong> với quyền <strong>Run as Administrator</strong> và chạy lần lượt các lệnh sau:</p>
                    <ul class="guide-feature-list">
                        <li><i class="fas fa-terminal"></i> <span class="highlight">ipconfig /flushdns</span> — Xóa bộ nhớ đệm DNS cũ bị lỗi.</li>
                        <li><i class="fas fa-terminal"></i> <span class="highlight">ipconfig /release</span> và <span class="highlight">ipconfig /renew</span> — Xin cấp lại địa chỉ IP mới từ Router.</li>
                        <li><i class="fas fa-terminal"></i> <span class="highlight">netsh winsock reset</span> — Đặt lại toàn bộ cấu hình giao thức mạng Windows về mặc định (sau đó khởi động lại máy).</li>
                    </ul>
                `
            },
            {
                id: "chia-se-file-may-in-lan",
                title: "Cách bật chia sẻ thư mục & Máy in trong mạng nội bộ (LAN)",
                badge: "Văn phòng",
                readTime: "5 phút đọc",
                summary: "Cấu hình Network Discovery và File Sharing trên Windows 10/11 để truyền dữ liệu nội bộ tốc độ cao.",
                content: `
                    <h3>Các bước thiết lập chia sẻ LAN</h3>
                    <div class="guide-steps">
                        <div class="step-item">
                            <span class="step-num">1</span>
                            <div>
                                <h4>Chuyển hồ sơ mạng sang Private</h4>
                                <p>Vào <strong>Settings → Network & Internet → Properties</strong> của mạng đang kết nối và chọn <strong>Private network</strong>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">2</span>
                            <div>
                                <h4>Bật chia sẻ nâng cao</h4>
                                <p>Mở <strong>Control Panel → Network and Sharing Center → Change advanced sharing settings</strong> → bật <em>Turn on network discovery</em> và <em>Turn on file and printer sharing</em>.</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <span class="step-num">3</span>
                            <div>
                                <h4>Truy cập từ máy tính khác</h4>
                                <p>Nhấn <span class="highlight">Win + R</span> và nhập <span class="highlight">\\\\[Địa-chỉ-IP-máy-chủ]</span> (ví dụ: <span class="highlight">\\\\192.168.1.10</span>) để truy cập thư mục và máy in dùng chung.</p>
                            </div>
                        </div>
                    </div>
                `
            }
        ]
    }
};