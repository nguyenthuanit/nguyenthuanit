if (!window.__MULTI_PLATFORM_SMM_INITIALIZED__) {
    window.__MULTI_PLATFORM_SMM_INITIALIZED__ = true;

    // =========================================================================
    // CẤU HÌNH THƯƠNG HIỆU, TÀI KHOẢN NHẬN TIỀN & GOOGLE SHEETS API
    // =========================================================================
    const SITE_CONFIG = Object.freeze({
        brandName: 'NT Pro',
        adminName: 'Hệ Thống Dịch Vụ MXH 24/7',
        supportPhone: '0942.833.888',
        markupPercent: 0,
        bankId: 'BIDV',
        bankBin: '970422', // Mã BIN Napas của ngân hàng nhận (MBBank = 970422)
        bankAccNo: '8869839473',
        bankAccName: 'NGUYEN MINH THUAN',
        momoPhone: '0817181220',
        momoName: 'NGUYEN MINH THUAN',
        momoRawEmvco: '',
        bankSyntax: 'THANH TOAN DICH VU',
        // LINK WEB APP GOOGLE APPS SCRIPT CỦA BẠN:
        googleSheetWebAppUrl: 'https://script.google.com/macros/s/AKfycbyIRv7GM8fCvBPYuqfrutKB12W_DJEU644AMaTs7ERttzBvypWGReVp-KlFTYnhrsaA6A/exec'
    });

    const PROMO_CODES = {
        'NTPRO10': { percent: 10, desc: 'Giảm 10% toàn bộ đơn hàng' },
        'VIP20': { percent: 20, desc: 'Ưu đãi khách VIP giảm 20%' },
        'NEWBIE': { percent: 5, desc: 'Giảm 5% cho khách hàng mới' }
    };

    const SEEDING_TEMPLATES = {
        shop: [
            'Sản phẩm chất lượng lắm shop ơi, đóng gói rất kỹ!',
            'Mình nhận được hàng rồi nhé, ưng ý lắm ạ',
            'Shop tư vấn nhiệt tình, giao hàng siêu nhanh luôn',
            'Hàng chuẩn như hình, sẽ ủng hộ shop dài dài nhé',
            'Giá hợp lý mà chất lượng vượt mong đợi luôn ạ'
        ],
        price: [
            'Shop ơi mẫu này còn hàng không tư vấn mình với?',
            'Check inbox báo giá sỉ/lẻ giúp mình nhé shop',
            'Giao về TP.HCM thì mấy ngày nhận được vậy ạ?',
            'Mình muốn đặt 2 bộ này, shop kiểm tra tin nhắn nha',
            'Có được kiểm tra hàng trước khi thanh toán không shop?'
        ],
        personal: [
            'Xuất sắc quá bạn ơi, chúc bạn luôn thành công nhé!',
            'Tuyệt vời quá, thả ngàn tim luôn ạ ❤️',
            'Hình ảnh chất lượng và chỉn chu quá!',
            'Luôn theo dõi và ủng hộ bạn nhé!',
            'Đỉnh của chóp luôn bạn ơi 🔥'
        ]
    };

    const PLATFORMS_DATA = {
        facebook: {
            name: 'Facebook',
            icon: 'fa-brands fa-facebook text-blue',
            placeholder: 'Dán link bài viết, trang cá nhân hoặc Fanpage Facebook...',
            services: {
                fb_like: {
                    title: 'Tăng Like / Cảm Xúc Bài Viết',
                    hasReactions: true,
                    servers: [
                        { id: 'fb_l1', name: 'Server 1 - Like Việt Nhanh (Khuyên dùng)', price: 18, min: 50, max: 50000, warranty: 'Không BH', speed: '5k-10k/ngày', desc: 'Tài khoản Facebook Việt Nam thật, lên tự nhiên sau 1-5 phút.' },
                        { id: 'fb_l2', name: 'Server 2 - Like + Cảm Xúc Tiết Kiệm', price: 12, min: 100, max: 100000, warranty: 'Không BH', speed: 'Ổn định', desc: 'Hỗ trợ chọn kết hợp 7 loại cảm xúc (Like, Tim, Thương, Haha, Wow...).' },
                        { id: 'fb_l3', name: 'Server 3 - Like Via Việt VIP', price: 28, min: 50, max: 20000, warranty: 'BH 7 ngày', speed: 'Cực nhanh', desc: 'Nick Việt có avatar và bài đăng thật, uy tín cao cho bài bán hàng.' }
                    ]
                },
                fb_sub: {
                    title: 'Tăng Sub / Follow Cá Nhân',
                    servers: [
                        { id: 'fb_s1', name: 'Server 1 - Sub Việt Phổ Thông', price: 25, min: 100, max: 50000, warranty: 'BH 7 ngày', speed: '1k-5k/ngày', desc: 'Tăng người theo dõi thật, yêu cầu bật công khai nút Theo dõi.' },
                        { id: 'fb_s2', name: 'Server 2 - Sub Via Việt Cứng (Độ Bền Cao)', price: 42, min: 100, max: 30000, warranty: 'BH 30 ngày', speed: '3k/ngày', desc: 'Via Việt hạn chế tụt tối đa, cực đẹp cho trang cá nhân chính.' }
                    ]
                },
                fb_page: {
                    title: 'Tăng Like & Follow Fanpage',
                    servers: [
                        { id: 'fb_p1', name: 'Server 1 - Like + Follow Fanpage Việt', price: 45, min: 100, max: 50000, warranty: 'BH 15 ngày', speed: '1k-3k/ngày', desc: 'Tăng đồng thời cả Like và Follow cho Fanpage thường & Pro5.' },
                        { id: 'fb_p2', name: 'Server 2 - Chỉ Tăng Follow Fanpage', price: 24, min: 100, max: 100000, warranty: 'BH 7 ngày', speed: 'Nhanh', desc: 'Tối ưu chi phí cho Fanpage cần tăng nhanh số người theo dõi.' }
                    ]
                },
                fb_cmt: {
                    title: 'Tăng Bình Luận (Comment)',
                    hasComments: true,
                    servers: [
                        { id: 'fb_c1', name: 'Server 1 - Comment Nick Việt Thật', price: 350, min: 5, max: 500, warranty: 'Không tụt', speed: '5-15 phút', desc: 'Mỗi dòng tương ứng 1 tài khoản Việt Nam bình luận vào bài viết.' },
                        { id: 'fb_c2', name: 'Server 2 - Comment Seeding Bán Hàng VIP', price: 500, min: 5, max: 1000, warranty: 'Vĩnh viễn', speed: 'Tự nhiên', desc: 'Nick Việt hoạt động thật, đẩy tương tác bài quảng cáo cực tốt.' }
                    ]
                },
                fb_eye: {
                    title: 'Tăng Mắt Livestream',
                    hasLiveMinutes: true,
                    servers: [
                        { id: 'fb_e1', name: 'Server 1 - Mắt Live Tiêu Chuẩn', price: 4, min: 50, max: 5000, warranty: 'Đúng phút', speed: '1-2 phút', desc: 'Công thức tính: Số mắt × Số phút × Đơn giá.' },
                        { id: 'fb_e2', name: 'Server 2 - Mắt Live Siêu Ổn Định (VIP)', price: 6, min: 50, max: 10000, warranty: 'Duy trì 100%', speed: 'Tức thì', desc: 'Giữ mắt ổn định xuyên suốt phiên livestream.' }
                    ]
                },
                fb_view: {
                    title: 'Tăng View Video / Reels',
                    servers: [
                        { id: 'fb_v1', name: 'Server 1 - View Video / Reels Giá Rẻ', price: 6, min: 500, max: 1000000, warranty: 'BH 7 ngày', speed: '10k-50k/ngày', desc: 'Tương thích mọi định dạng Video và thước phim Reels.' },
                        { id: 'fb_v2', name: 'Server 2 - View Giữ Chân Đề Xuất', price: 11, min: 500, max: 500000, warranty: 'BH 30 ngày', speed: 'Tốc độ cao', desc: 'Thời lượng xem dài giúp video dễ lên xu hướng.' }
                    ]
                }
            }
        },
        tiktok: {
            name: 'TikTok',
            icon: 'fa-brands fa-tiktok text-tiktok',
            placeholder: 'Dán link Video TikTok, link Livestream hoặc @username kênh TikTok...',
            services: {
                tt_acclive: {
                    title: 'Acc TikTok Live Giá Rẻ',
                    isAccountService: true,
                    customLabel: 'Nhập SĐT Zalo hoặc Email nhận bàn giao Acc TikTok Live',
                    customPlaceholder: 'Nhập SĐT Zalo của bạn để hệ thống gửi thông tin đăng nhập Acc...',
                    servers: [
                        { id: 'tt_acc1', name: 'Gói 1 - Acc TikTok Đủ 1K Follow (Mở Sẵn Live Điện Thoại)', price: 65000, min: 1, max: 50, warranty: 'BH Login 1-1', speed: 'Giao ngay', desc: 'Tài khoản TikTok Việt sạch, đã đủ >1.000 Follow, bật sẵn tính năng phát Livestream trên điện thoại.' },
                        { id: 'tt_acc2', name: 'Gói 2 - Acc TikTok Live + Giỏ Hàng TikTok Shop (Affiliate)', price: 110000, min: 1, max: 50, warranty: 'BH 7 ngày', speed: 'Giao ngay', desc: 'Đã mở sẵn Livestream kèm giỏ hàng tiếp thị liên kết, đổi toàn bộ thông tin chính chủ 100%.' },
                        { id: 'tt_acc3', name: 'Gói 3 - Acc TikTok Live Studio PC + Mobile (5K Follow)', price: 195000, min: 1, max: 20, warranty: 'BH 15 ngày', speed: 'Giao ngay', desc: 'Tài khoản độ trust cao hỗ trợ phát Live trên cả máy tính (Live Studio) và điện thoại, cắn đề xuất cực mạnh.' }
                    ]
                },
                tt_like: {
                    title: 'Tăng Tim (Like) Video TikTok',
                    servers: [
                        { id: 'tt_l1', name: 'Server 1 - Tim TikTok Việt Thật (Đẩy Xu Hướng)', price: 19, min: 50, max: 100000, warranty: 'BH 7 ngày', speed: 'Lên ngay', desc: 'Tài khoản TikTok Việt Nam thật thả tim tự nhiên, hỗ trợ video dễ cắn đề xuất.' },
                        { id: 'tt_l2', name: 'Server 2 - Tim TikTok Tiết Kiệm Tốc Độ Cao', price: 11, min: 100, max: 500000, warranty: 'Không BH', speed: '5k-20k/giờ', desc: 'Giá siêu rẻ phù hợp seeding số lượng lớn cho video bán hàng.' }
                    ]
                },
                tt_sub: {
                    title: 'Tăng Follow Kênh TikTok',
                    servers: [
                        { id: 'tt_s1', name: 'Server 1 - Follow TikTok Việt (Mở Live & Giỏ Hàng)', price: 42, min: 100, max: 50000, warranty: 'BH 30 ngày', speed: '1k-3k/ngày', desc: 'Follow người dùng Việt thật, an toàn tuyệt đối để bật Livestream & TikTok Shop.' },
                        { id: 'tt_s2', name: 'Server 2 - Follow TikTok Phổ Thông Ổn Định', price: 26, min: 100, max: 200000, warranty: 'BH 15 ngày', speed: '3k-10k/ngày', desc: 'Tăng nhanh số lượng người theo dõi tạo độ uy tín cho kênh.' }
                    ]
                },
                tt_view: {
                    title: 'Tăng View Video TikTok',
                    servers: [
                        { id: 'tt_v1', name: 'Server 1 - View Video TikTok Siêu Tốc', price: 2, min: 1000, max: 10000000, warranty: 'Không tụt', speed: '10k-100k/giờ', desc: 'Lên ngay lập tức sau 1 phút khởi tạo đơn, không giới hạn số lượng.' },
                        { id: 'tt_v2', name: 'Server 2 - View TikTok Giữ Chân (Đề Xuất FYP)', price: 6, min: 1000, max: 2000000, warranty: 'BH 30 ngày', speed: 'Tự nhiên', desc: 'Thời gian xem hết video giúp tăng điểm chất lượng thuật toán FYP.' }
                    ]
                },
                tt_eye: {
                    title: 'Tăng Mắt Livestream TikTok',
                    hasLiveMinutes: true,
                    servers: [
                        { id: 'tt_e1', name: 'Server 1 - Mắt Live TikTok Ổn Định (Giữ Mắt)', price: 5, min: 50, max: 10000, warranty: 'Đúng phút', speed: '1-2 phút', desc: 'Giữ mắt xem ổn định xuyên suốt phiên live bán hàng. Công thức: Số mắt × Số phút × Đơn giá.' },
                        { id: 'tt_e2', name: 'Server 2 - Mắt Live TikTok VIP (Đẩy Top Phòng Live)', price: 8, min: 50, max: 20000, warranty: 'Duy trì 100%', speed: 'Tức thì', desc: 'Tài khoản chất lượng cao vào phòng live giúp thu hút khách xem thật.' }
                    ]
                },
                tt_cmt: {
                    title: 'Tăng Bình Luận (Comment) TikTok',
                    hasComments: true,
                    servers: [
                        { id: 'tt_c1', name: 'Server 1 - Comment TikTok Nick Việt Seeding', price: 400, min: 5, max: 500, warranty: 'Vĩnh viễn', speed: 'Tự nhiên', desc: 'Bình luận đúng nội dung kịch bản theo từng dòng giúp tăng tỷ lệ chốt đơn.' }
                    ]
                },
                tt_save: {
                    title: 'Tăng Yêu Thích (Lưu) & Share Video',
                    servers: [
                        { id: 'tt_sh1', name: 'Server 1 - Tăng Lưu Video Vào Yêu Thích (Bookmark)', price: 8, min: 100, max: 500000, warranty: 'BH 30 ngày', speed: 'Nhanh', desc: 'Tăng chỉ số lưu video — yếu tố quan trọng nhất để TikTok đánh giá nội dung hay.' },
                        { id: 'tt_sh2', name: 'Server 2 - Tăng Lượt Chia Sẻ (Share) Video', price: 10, min: 100, max: 500000, warranty: 'BH 30 ngày', speed: 'Siêu tốc', desc: 'Đẩy mạnh tín hiệu lan truyền viral cho video.' }
                    ]
                }
            }
        },
        instagram: {
            name: 'Instagram',
            icon: 'fa-brands fa-instagram text-ig',
            placeholder: 'Dán link bài viết, Reels hoặc trang cá nhân Instagram...',
            services: {
                ig_like: {
                    title: 'Tăng Tim Bài Viết / Reels IG',
                    servers: [
                        { id: 'ig_l1', name: 'Server 1 - Tim Instagram Việt Thật', price: 22, min: 50, max: 50000, warranty: 'BH 7 ngày', speed: 'Lên ngay', desc: 'Tài khoản Instagram Việt Nam tương tác tự nhiên.' },
                        { id: 'ig_l2', name: 'Server 2 - Tim Quốc Tế Tốc Độ Cao', price: 10, min: 100, max: 200000, warranty: 'Không BH', speed: '10k/giờ', desc: 'Giá siêu rẻ cho các bài đăng cần đẩy số lượng tim lớn.' }
                    ]
                },
                ig_sub: {
                    title: 'Tăng Follow Instagram',
                    servers: [
                        { id: 'ig_s1', name: 'Server 1 - Follow IG Việt Chất Lượng', price: 48, min: 100, max: 30000, warranty: 'BH 30 ngày', speed: '1k-3k/ngày', desc: 'Tài khoản Việt có avatar, phù hợp xây dựng thương hiệu & shop.' },
                        { id: 'ig_s2', name: 'Server 2 - Follow IG Quốc Tế Giá Rẻ', price: 19, min: 100, max: 500000, warranty: 'BH 15 ngày', speed: '5k-20k/ngày', desc: 'Tốc độ nhanh, độ ổn định cao.' }
                    ]
                },
                ig_view: {
                    title: 'Tăng View Reels / Story IG',
                    servers: [
                        { id: 'ig_v1', name: 'Server 1 - View Reels IG Siêu Tốc', price: 4, min: 500, max: 1000000, warranty: 'Không tụt', speed: 'Tức thì', desc: 'Đẩy nhanh lượt xem cho Reels Instagram.' }
                    ]
                },
                ig_cmt: {
                    title: 'Tăng Comment Instagram',
                    hasComments: true,
                    servers: [
                        { id: 'ig_c1', name: 'Server 1 - Comment IG Nick Việt', price: 450, min: 5, max: 500, warranty: 'Vĩnh viễn', speed: 'Tự nhiên', desc: 'Bình luận đúng nội dung yêu cầu từ các tài khoản Việt.' }
                    ]
                }
            }
        },
        threads: {
            name: 'Threads',
            icon: 'fa-brands fa-threads text-threads',
            placeholder: 'Dán link bài đăng hoặc trang cá nhân Threads...',
            services: {
                th_like: {
                    title: 'Tăng Tim Bài Viết Threads',
                    servers: [
                        { id: 'th_l1', name: 'Server 1 - Tim Threads Việt Tự Nhiên', price: 30, min: 50, max: 20000, warranty: 'BH 7 ngày', speed: 'Nhanh', desc: 'Đẩy tương tác giúp bài đăng Threads dễ vào luồng đề xuất.' },
                        { id: 'th_l2', name: 'Server 2 - Tim Threads Quốc Tế', price: 16, min: 100, max: 100000, warranty: 'Không BH', speed: 'Siêu tốc', desc: 'Tối ưu chi phí seeding bài viết mới.' }
                    ]
                },
                th_sub: {
                    title: 'Tăng Follow Threads',
                    servers: [
                        { id: 'th_s1', name: 'Server 1 - Follow Threads Việt Uy Tín', price: 55, min: 100, max: 30000, warranty: 'BH 30 ngày', speed: '1k-2k/ngày', desc: 'Người dùng Threads Việt Nam thật.' }
                    ]
                },
                th_cmt: {
                    title: 'Tăng Bình Luận Threads',
                    hasComments: true,
                    servers: [
                        { id: 'th_c1', name: 'Server 1 - Comment Threads Seeding', price: 500, min: 5, max: 500, warranty: 'Không tụt', speed: 'Lên đều', desc: 'Tạo hiệu ứng thảo luận sôi nổi dưới bài đăng Threads.' }
                    ]
                }
            }
        },
        youtube: {
            name: 'YouTube',
            icon: 'fa-brands fa-youtube text-yt',
            placeholder: 'Dán link Video, Shorts hoặc link Kênh YouTube...',
            services: {
                yt_view: {
                    title: 'Tăng View Video / Shorts YouTube',
                    servers: [
                        { id: 'yt_v1', name: 'Server 1 - View YouTube Đề Xuất (Real Traffic)', price: 45, min: 500, max: 1000000, warranty: 'BH 30 ngày', speed: '5k-20k/ngày', desc: 'Nguồn view từ tìm kiếm và đề xuất, an toàn tuyệt đối cho kênh bật kiếm tiền.' },
                        { id: 'yt_v2', name: 'Server 2 - View YouTube Shorts Nhanh', price: 32, min: 1000, max: 500000, warranty: 'BH 15 ngày', speed: 'Nhanh', desc: 'Tối ưu riêng cho video ngắn YouTube Shorts.' }
                    ]
                },
                yt_sub: {
                    title: 'Tăng Subscribe Theo Dõi Kênh',
                    servers: [
                        { id: 'yt_s1', name: 'Server 1 - Subscribe Kênh Bền Vững', price: 380, min: 50, max: 20000, warranty: 'BH 30 ngày', speed: '100-500/ngày', desc: 'Tăng sub kèm lượt xem tự nhiên hạn chế quét.' }
                    ]
                },
                yt_like: {
                    title: 'Tăng Like Video YouTube',
                    servers: [
                        { id: 'yt_l1', name: 'Server 1 - Like Video YouTube Nhanh', price: 35, min: 50, max: 100000, warranty: 'BH 15 ngày', speed: 'Lên ngay', desc: 'Tăng tỷ lệ tương tác đẩy SEO video.' }
                    ]
                },
                yt_cmt: {
                    title: 'Tăng Bình Luận YouTube',
                    hasComments: true,
                    servers: [
                        { id: 'yt_c1', name: 'Server 1 - Comment YouTube Theo Nội Dung', price: 600, min: 5, max: 500, warranty: 'Không tụt', speed: 'Lên đều', desc: 'Tài khoản Google Việt Nam bình luận trực tiếp vào video.' }
                    ]
                }
            }
        },
        shopee: {
            name: 'Shopee',
            icon: 'fa-solid fa-bag-shopping text-shopee',
            placeholder: 'Dán link Gian hàng (Shop) hoặc link Sản phẩm Shopee...',
            services: {
                sp_sub: {
                    title: 'Tăng Follow Gian Hàng Shopee',
                    servers: [
                        { id: 'sp_s1', name: 'Server 1 - Follow Shopee Người Dùng Thật', price: 48, min: 100, max: 50000, warranty: 'BH 30 ngày', speed: '500-2k/ngày', desc: 'Tăng độ uy tín cho gian hàng, hỗ trợ đạt điều kiện lên Shop Yêu Thích.' }
                    ]
                },
                sp_like: {
                    title: 'Tăng Tim Sản Phẩm Shopee',
                    servers: [
                        { id: 'sp_l1', name: 'Server 1 - Tim Sản Phẩm Đẩy Top Tìm Kiếm', price: 25, min: 100, max: 50000, warranty: 'BH 15 ngày', speed: 'Nhanh', desc: 'Giúp sản phẩm hiển thị tốt hơn khi khách tìm kiếm từ khóa.' }
                    ]
                },
                sp_eye: {
                    title: 'Tăng Mắt Shopee Live',
                    hasLiveMinutes: true,
                    servers: [
                        { id: 'sp_e1', name: 'Server 1 - Mắt Xem Livestream Shopee', price: 5, min: 50, max: 5000, warranty: 'Đúng phút', speed: 'Lên ngay', desc: 'Giữ mắt ổn định thu hút người mua thật vào phiên live.' }
                    ]
                }
            }
        },
        twitter: {
            name: 'Twitter (X)',
            icon: 'fa-brands fa-x-twitter text-twitter',
            placeholder: 'Dán link bài đăng (Tweet) hoặc link Profile X/Twitter...',
            services: {
                tw_like: {
                    title: 'Tăng Tim (Like) Bài Đăng X/Twitter',
                    servers: [
                        { id: 'tw_l1', name: 'Server 1 - Like X/Twitter Tốc Độ Cao', price: 24, min: 50, max: 100000, warranty: 'BH 7 ngày', speed: 'Lên ngay', desc: 'Phù hợp cho cả tài khoản cá nhân và dự án Crypto/Web3.' }
                    ]
                },
                tw_sub: {
                    title: 'Tăng Follow X/Twitter',
                    servers: [
                        { id: 'tw_s1', name: 'Server 1 - Follow X Chất Lượng Cao', price: 65, min: 100, max: 100000, warranty: 'BH 30 ngày', speed: '1k-5k/ngày', desc: 'Tài khoản có đầy đủ hồ sơ, hạn chế tụt.' }
                    ]
                },
                tw_view: {
                    title: 'Tăng View / Retweet Bài Đăng X',
                    servers: [
                        { id: 'tw_v1', name: 'Server 1 - Impression / View Tweet Giá Rẻ', price: 3, min: 1000, max: 5000000, warranty: 'Không tụt', speed: 'Siêu tốc', desc: 'Tăng lượt tiếp cận hiển thị cho bài Tweet.' },
                        { id: 'tw_v2', name: 'Server 2 - Retweet (Đăng Lại) X/Twitter', price: 38, min: 50, max: 50000, warranty: 'BH 15 ngày', speed: 'Nhanh', desc: 'Lan tỏa bài viết nhanh chóng.' }
                    ]
                }
            }
        },
        telegram: {
            name: 'Telegram',
            icon: 'fa-brands fa-telegram text-telegram',
            placeholder: 'Dán link Group/Channel (t.me/...) hoặc link bài viết Telegram...',
            services: {
                tg_mem: {
                    title: 'Tăng Member Group / Sub Channel',
                    servers: [
                        { id: 'tg_m1', name: 'Server 1 - Member Telegram Ổn Định (Non-Drop)', price: 35, min: 100, max: 200000, warranty: 'BH 30 ngày', speed: '2k-10k/ngày', desc: 'Hỗ trợ cả Group trò chuyện và Channel thông báo công khai.' },
                        { id: 'tg_m2', name: 'Server 2 - Member Telegram Giá Rẻ', price: 18, min: 500, max: 500000, warranty: 'Không BH', speed: 'Siêu tốc', desc: 'Tăng nhanh số lượng thành viên tạo uy tín cộng đồng.' }
                    ]
                },
                tg_view: {
                    title: 'Tăng View Bài Viết Channel',
                    servers: [
                        { id: 'tg_v1', name: 'Server 1 - View Bài Post Telegram Tức Thì', price: 2, min: 500, max: 2000000, warranty: 'Không tụt', speed: '1-5 phút', desc: 'Tăng mắt xem cho bài thông báo trên Channel.' }
                    ]
                },
                tg_react: {
                    title: 'Tăng Cảm Xúc (Reaction) Bài Viết',
                    servers: [
                        { id: 'tg_r1', name: 'Server 1 - Reaction Tích Cực (👍❤️🔥🎉)', price: 8, min: 50, max: 100000, warranty: 'Không tụt', speed: 'Lên ngay', desc: 'Tự động thả các biểu tượng cảm xúc tích cực vào bài đăng.' }
                    ]
                }
            }
        }
    };

    const INITIAL_ORDERS = [
        {
            id: 'OT90214',
            time: '27/10/2026 09:10',
            createdAt: 1793067000000,
            platformKey: 'facebook',
            serviceKey: 'fb_like',
            platformName: 'Facebook',
            serviceName: 'Tăng Like / Cảm Xúc Bài Viết',
            serverName: 'Server 1 - Like Việt Nhanh (Khuyên dùng)',
            uid: '100089412398123',
            quantity: 100,
            cost: 1800,
            retailPrice: 1800,
            note: 'Khách Minh Zalo',
            status: 'Hoàn thành'
        },
        {
            id: 'OT90218',
            time: '27/10/2026 10:05',
            createdAt: Date.now() - 15 * 60 * 1000,
            platformKey: 'tiktok',
            serviceKey: 'tt_like',
            platformName: 'TikTok',
            serviceName: 'Tăng Tim (Like) Video TikTok',
            serverName: 'Server 1 - Tim TikTok Việt Thật (Đẩy Xu Hướng)',
            uid: '7391827391827391821',
            quantity: 500,
            cost: 9500,
            retailPrice: 9500,
            note: 'Video Xu Hướng TikTok',
            status: 'Đang chạy'
        }
    ];

    let storedData = null;
    try {
        storedData = JSON.parse(localStorage.getItem('dichvumxh_state_v3'));
    } catch (e) { }

    let appState = {
        theme: (storedData && storedData.theme) ? storedData.theme : 'light',
        config: SITE_CONFIG,
        orders: (storedData && Array.isArray(storedData.orders)) ? storedData.orders : INITIAL_ORDERS
    };

    let currentPlatformKey = 'facebook';
    let currentServiceKey = 'fb_like';
    let currentServerIndex = 0;
    let inlineQrMethod = 'bank';
    let momoScanSubMode = 'emvco';
    let lastCreatedOrder = null;
    let isMassOrderMode = false;
    let activePromoCode = null;
    let qrCountdownInterval = null;

    function isGoogleSheetConfigured() {
        return Boolean(
            SITE_CONFIG.googleSheetWebAppUrl &&
            SITE_CONFIG.googleSheetWebAppUrl.startsWith('https://script.google.com/macros/s/')
        );
    }

    function saveState() {
        localStorage.setItem('dichvumxh_state_v3', JSON.stringify({
            theme: appState.theme,
            config: SITE_CONFIG,
            orders: appState.orders
        }));
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getStatusBadgeClass(status) {
        const st = String(status || '').toLowerCase();
        if (st.includes('hoàn thành') || st.includes('xong')) return 'badge-success';
        if (st.includes('hủy') || st.includes('lỗi')) return 'badge-danger';
        if (st.includes('chờ')) return 'badge-info';
        return 'badge-warning';
    }

    // =========================================================================
    // KẾT NỐI GOOGLE SHEETS: GHI ĐƠN MỚI & TRA CỨU CÔ LẬP TỪNG MÃ ĐƠN
    // =========================================================================
    async function syncOrderToGoogleSheet(orderObj) {
        if (!isGoogleSheetConfigured()) return false;
        try {
            const response = await fetch(SITE_CONFIG.googleSheetWebAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'createOrder', order: orderObj })
            });
            const data = await response.json();
            return Boolean(data && data.success);
        } catch (err) {
            console.warn('Google Sheets Sync Warning:', err);
            return false;
        }
    }

    async function fetchOrderByCodeFromGoogleSheet(orderCode) {
        const cleanCode = (orderCode || '').trim().replace(/^#/, '').toUpperCase();
        if (!cleanCode) return null;

        if (isGoogleSheetConfigured()) {
            try {
                const url = `${SITE_CONFIG.googleSheetWebAppUrl}?action=getOrder&id=${encodeURIComponent(cleanCode)}&_t=${Date.now()}`;
                const response = await fetch(url);
                const data = await response.json();
                if (data && data.success && data.order) {
                    const idx = appState.orders.findIndex(o => String(o.id).toUpperCase() === cleanCode);
                    if (idx >= 0) appState.orders[idx] = data.order;
                    else appState.orders.unshift(data.order);
                    saveState();
                    return data.order;
                }
            } catch (err) {
                console.warn('Google Sheets Lookup Fallback to Local:', err);
            }
        }

        return appState.orders.find(o => String(o.id).toUpperCase() === cleanCode) || null;
    }

    function getSessionOrders() {
        try {
            return JSON.parse(sessionStorage.getItem('ntpro_my_session_orders') || '[]');
        } catch (e) {
            return [];
        }
    }

    function addSessionOrder(orderId) {
        const list = getSessionOrders();
        if (!list.includes(orderId)) {
            list.unshift(orderId);
            sessionStorage.setItem('ntpro_my_session_orders', JSON.stringify(list.slice(0, 8)));
        }
        renderSessionOrderChips();
    }

    function renderSessionOrderChips() {
        const list = getSessionOrders();
        const box = document.getElementById('sessionOrdersBox');
        const chipsContainer = document.getElementById('sessionOrderChips');
        if (!box || !chipsContainer) return;

        if (list.length === 0) {
            box.classList.add('hidden');
            return;
        }

        box.classList.remove('hidden');
        chipsContainer.innerHTML = list.map(id => `
            <button type="button" class="session-chip" data-order-id="${escapeHtml(id)}">#${escapeHtml(id)}</button>
        `).join('');

        chipsContainer.querySelectorAll('.session-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const code = chip.dataset.orderId;
                document.getElementById('miniCheckOrderInput').value = code;
                handleMiniOrderLookup(code);
            });
        });
    }

    function formatVND(num) {
        return Math.round(num || 0).toLocaleString('vi-VN') + 'đ';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.querySelector('#themeToggleBtn i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fa-solid fa-sun text-amber' : 'fa-solid fa-moon';
        }
    }

    function showToast(message, icon = 'fa-circle-check') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid ${icon} text-green"></i> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3400);
    }

    // =========================================================================
    // BỘ MÃ HÓA QR THỰC TẾ CHO MOMO (EMVCo CRC16-CCITT & MOMO 2|99) + VIETQR
    // =========================================================================
    const NAPAS_BANK_BINS = {
        MB: '970422', MBBANK: '970422',
        VCB: '970436', VIETCOMBANK: '970436',
        TCB: '970407', TECHCOMBANK: '970407',
        ACB: '970416',
        BIDV: '970418',
        ICB: '970415', VIETINBANK: '970415',
        VBA: '970405', AGRIBANK: '970405',
        VPB: '970432', VPBANK: '970432',
        TPB: '970423', TPBANK: '970423',
        STB: '970403', SACOMBANK: '970403',
        VIB: '970441',
        SHB: '970443',
        MSB: '970426',
        OCB: '970448',
        LPB: '970449',
        BVB: '970454', TIMO: '970454', MOMO: '970454'
    };

    function toCleanAscii(str) {
        return String(str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .replace(/[^a-zA-Z0-9 ._-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function calcEmvcoCrc16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            crc ^= (str.charCodeAt(i) & 0xFF) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0) {
                    crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
                } else {
                    crc = (crc << 1) & 0xFFFF;
                }
            }
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    function formatEmvTlv(tag, value) {
        const valStr = String(value ?? '');
        return `${tag}${String(valStr.length).padStart(2, '0')}${valStr}`;
    }

    function parseEmvTlv(payload) {
        const result = [];
        let i = 0;
        while (i + 4 <= payload.length) {
            const tag = payload.slice(i, i + 2);
            const len = parseInt(payload.slice(i + 2, i + 4), 10);
            if (isNaN(len) || i + 4 + len > payload.length) break;
            const value = payload.slice(i + 4, i + 4 + len);
            result.push({ tag, value });
            i += 4 + len;
        }
        return result;
    }

    function injectDynamicEmvcoPayload(rawEmvco, amount, memoText) {
        const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
        const cleanMemo = toCleanAscii(memoText || 'THANH TOAN').slice(0, 25);
        const topFields = parseEmvTlv(String(rawEmvco || '').trim());
        if (topFields.length === 0) return '';

        const filtered = topFields.filter(f => f.tag !== '63' && f.tag !== '54');
        const hasTag01 = filtered.some(f => f.tag === '01');
        if (hasTag01) {
            filtered.forEach(f => {
                if (f.tag === '01') f.value = cleanAmount > 0 ? '12' : '11';
            });
        } else {
            filtered.splice(1, 0, { tag: '01', value: cleanAmount > 0 ? '12' : '11' });
        }

        const tag62Index = filtered.findIndex(f => f.tag === '62');
        if (cleanMemo) {
            if (tag62Index >= 0) {
                const subFields = parseEmvTlv(filtered[tag62Index].value).filter(sf => sf.tag !== '08');
                subFields.push({ tag: '08', value: cleanMemo });
                filtered[tag62Index].value = subFields.map(sf => formatEmvTlv(sf.tag, sf.value)).join('');
            } else {
                filtered.push({ tag: '62', value: formatEmvTlv('08', cleanMemo) });
            }
        }

        const outParts = [];
        let amountInserted = false;
        for (const f of filtered) {
            outParts.push(formatEmvTlv(f.tag, f.value));
            if (f.tag === '53' && cleanAmount > 0) {
                outParts.push(formatEmvTlv('54', String(cleanAmount)));
                amountInserted = true;
            }
        }
        if (cleanAmount > 0 && !amountInserted) {
            outParts.push(formatEmvTlv('54', String(cleanAmount)));
        }

        const bodyWithoutCrc = outParts.join('') + '6304';
        const crcHex = calcEmvcoCrc16(bodyWithoutCrc);
        return bodyWithoutCrc + crcHex;
    }

    function buildStandardEmvcoPayload(bankBin, accNo, amount, memoText) {
        const cleanBin = String(bankBin || '970422').replace(/\D/g, '');
        const cleanAcc = String(accNo || '').trim().replace(/\s+/g, '');
        const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
        const cleanMemo = toCleanAscii(memoText || 'THANH TOAN').slice(0, 25);

        const beneficiary = formatEmvTlv('00', cleanBin) + formatEmvTlv('01', cleanAcc);
        const tag38Value = formatEmvTlv('00', 'A000000727') + formatEmvTlv('01', beneficiary) + formatEmvTlv('02', 'QRIBFTTA');

        const parts = [
            formatEmvTlv('00', '01'),
            formatEmvTlv('01', cleanAmount > 0 ? '12' : '11'),
            formatEmvTlv('38', tag38Value),
            formatEmvTlv('53', '704')
        ];
        if (cleanAmount > 0) {
            parts.push(formatEmvTlv('54', String(cleanAmount)));
        }
        parts.push(formatEmvTlv('58', 'VN'));
        if (cleanMemo) {
            parts.push(formatEmvTlv('62', formatEmvTlv('08', cleanMemo)));
        }

        const rawForCrc = parts.join('') + '6304';
        return rawForCrc + calcEmvcoCrc16(rawForCrc);
    }

    function getSavedCustomMomoQr() {
        try {
            const saved = JSON.parse(localStorage.getItem('ntpro_custom_momo_qr_v1') || 'null');
            if (saved && (saved.rawPayload || saved.dataUrl)) return saved;
        } catch (e) { }
        if (SITE_CONFIG.momoRawEmvco && SITE_CONFIG.momoRawEmvco.startsWith('000201')) {
            return { rawPayload: SITE_CONFIG.momoRawEmvco.trim(), type: 'emvco' };
        }
        return null;
    }

    function buildQrImageFromPayload(payloadText, colorHex = '000000') {
        const encoded = encodeURIComponent(payloadText);
        return `https://api.qrserver.com/v1/create-qr-code/?size=340x340&ecc=M&margin=10&color=${colorHex}&data=${encoded}`;
    }

    function buildDynamicQrUrl(method, amount, memoText) {
        const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
        const cleanMemo = toCleanAscii(memoText || SITE_CONFIG.bankSyntax || 'THANH TOAN');

        if (method === 'momo') {
            const customMomo = getSavedCustomMomoQr();

            if (customMomo) {
                if (customMomo.rawPayload && customMomo.rawPayload.startsWith('000201')) {
                    const dynamicEmvco = injectDynamicEmvcoPayload(customMomo.rawPayload, cleanAmount, cleanMemo);
                    return buildQrImageFromPayload(dynamicEmvco, 'a50064');
                }
                if (customMomo.rawPayload && customMomo.rawPayload.startsWith('2|99|')) {
                    const segs = customMomo.rawPayload.split('|');
                    const phone = (segs[2] || SITE_CONFIG.momoPhone).replace(/\D/g, '');
                    const name = toCleanAscii(segs[3] || SITE_CONFIG.momoName);
                    const momoNative = `2|99|${phone}|${name}|0|0|0|${cleanAmount}|${cleanMemo}|transfer_myqr`;
                    return buildQrImageFromPayload(momoNative, 'a50064');
                }
                if (customMomo.dataUrl) {
                    return customMomo.dataUrl;
                }
            }

            if (momoScanSubMode === 'native') {
                const cleanPhone = String(SITE_CONFIG.momoPhone || '').replace(/\D/g, '');
                const cleanName = toCleanAscii(SITE_CONFIG.momoName || 'NGUYEN VAN A');
                const momoPayload = `2|99|${cleanPhone}|${cleanName}|0|0|0|${cleanAmount}|${cleanMemo}|transfer_myqr`;
                return buildQrImageFromPayload(momoPayload, 'a50064');
            }

            const bankKey = String(SITE_CONFIG.bankId || 'MB').toUpperCase();
            const bankBin = SITE_CONFIG.bankBin || NAPAS_BANK_BINS[bankKey] || '970422';
            const cleanAcc = String(SITE_CONFIG.bankAccNo || SITE_CONFIG.momoPhone || '').replace(/\D/g, '');
            const emvcoPayload = buildStandardEmvcoPayload(bankBin, cleanAcc, cleanAmount, cleanMemo);
            return buildQrImageFromPayload(emvcoPayload, 'a50064');
        }

        return `https://img.vietqr.io/image/${SITE_CONFIG.bankId}-${SITE_CONFIG.bankAccNo}-compact2.png?amount=${cleanAmount}&addInfo=${encodeURIComponent(cleanMemo)}&accountName=${encodeURIComponent(SITE_CONFIG.bankAccName)}`;
    }

    function extractCleanTarget(rawInput) {
        const input = (rawInput || '').trim().replace(/\s*\(\+\d+\s*link\)$/i, '');
        if (!input) return '';
        if (/^\d{8,25}$/.test(input)) return input;

        if (/facebook\.com\/share\/[pvr]\//i.test(input)) {
            return input.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
        }

        const patterns = [
            /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
            /tiktok\.com\/@([\w.-]+)/i,
            /(?:vm|vt)\.tiktok\.com\/([\w.-]+)/i,
            /story_fbid=(\d+)/i,
            /fbid=(\d+)/i,
            /\/posts\/([\w.-]+)/i,
            /threads\.net\/@[\w.]+\/post\/([\w.-]+)/i,
            /\/reel\/([\w.-]+)/i,
            /instagram\.com\/p\/([\w.-]+)/i,
            /\/shorts\/([\w.-]+)/i,
            /[?&]v=([\w.-]+)/i,
            /youtu\.be\/([\w.-]+)/i,
            /t\.me\/([\w./-]+)/i,
            /(?:twitter\.com|x\.com)\/[\w.]+\/status\/(\d+)/i,
            /(?:instagram\.com|threads\.net)\/@?([\w.]+)\/?$/i,
            /id=(\d+)/i
        ];

        for (const regex of patterns) {
            const match = input.match(regex);
            if (match && match[1]) return match[1];
        }

        return input.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    }

    function getSelectedReactions() {
        const checked = Array.from(document.querySelectorAll('#reactionContainer input[name="reaction"]:checked'))
            .map(el => el.value);
        return checked.length > 0 ? checked : ['LIKE'];
    }

    function renderBrandHeader() {
        document.getElementById('brandNameDisplay').textContent = SITE_CONFIG.brandName;
        document.getElementById('sidebarAdminName').textContent = SITE_CONFIG.adminName;
        document.getElementById('supportPhoneDisplay').textContent = SITE_CONFIG.supportPhone;
        document.getElementById('supportLinkBtn').href = `https://zalo.me/${SITE_CONFIG.supportPhone.replace(/\D/g, '')}`;
    }

    function renderNavigationMenus() {
        const sidebarMenu = document.getElementById('sidebarPlatformMenu');
        sidebarMenu.innerHTML = Object.entries(PLATFORMS_DATA).map(([pKey, pData]) => {
            const isOpen = pKey === currentPlatformKey;
            const subItems = Object.entries(pData.services).map(([sKey, sData]) => `
                <a href="#" class="sub-service-link ${sKey === currentServiceKey ? 'active' : ''}" data-platform="${pKey}" data-service="${sKey}">
                    <i class="fa-solid fa-angle-right"></i>
                    <span>${sData.title}</span>
                </a>
            `).join('');

            return `
                <div class="platform-group ${isOpen ? 'open' : ''}" data-platform-group="${pKey}">
                    <button type="button" class="platform-group-btn">
                        <i class="${pData.icon}"></i>
                        <span>Dịch Vụ ${pData.name}</span>
                        <i class="fa-solid fa-chevron-right arrow-icon"></i>
                    </button>
                    <div class="platform-sublist">${subItems}</div>
                </div>
            `;
        }).join('');

        sidebarMenu.querySelectorAll('.platform-group-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.platform-group').classList.toggle('open');
            });
        });

        sidebarMenu.querySelectorAll('.sub-service-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                switchView('order-view');
                selectPlatformAndService(link.dataset.platform, link.dataset.service);
            });
        });

        const platformBar = document.getElementById('platformBar');
        platformBar.innerHTML = Object.entries(PLATFORMS_DATA).map(([pKey, pData]) => `
            <button type="button" class="platform-pill ${pKey === currentPlatformKey ? 'active' : ''}" data-platform="${pKey}">
                <i class="${pData.icon}"></i>
                <span>${pData.name}</span>
            </button>
        `).join('');

        platformBar.querySelectorAll('.platform-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const pKey = pill.dataset.platform;
                const firstServiceKey = Object.keys(PLATFORMS_DATA[pKey].services)[0];
                selectPlatformAndService(pKey, firstServiceKey);
            });
        });

        const platformSelect = document.getElementById('platformSelect');
        const priceFilter = document.getElementById('priceListPlatformFilter');
        const optionsHtml = Object.entries(PLATFORMS_DATA).map(([pKey, pData]) =>
            `<option value="${pKey}">${pData.name}</option>`
        ).join('');

        platformSelect.innerHTML = optionsHtml;
        platformSelect.value = currentPlatformKey;
        priceFilter.innerHTML = `<option value="ALL">Tất cả nền tảng</option>` + optionsHtml;
    }

    function selectPlatformAndService(platformKey, serviceKey, serverIdx = 0) {
        if (!PLATFORMS_DATA[platformKey]) platformKey = 'facebook';
        currentPlatformKey = platformKey;
        const platform = PLATFORMS_DATA[platformKey];
        currentServiceKey = (serviceKey && platform.services[serviceKey]) ? serviceKey : Object.keys(platform.services)[0];
        currentServerIndex = serverIdx || 0;

        const service = platform.services[currentServiceKey];

        const quickAccBtn = document.getElementById('quickAccTiktokLiveBtn');
        if (quickAccBtn) {
            quickAccBtn.classList.toggle('active', currentServiceKey === 'tt_acclive');
        }

        document.querySelectorAll('.platform-pill').forEach(el => {
            el.classList.toggle('active', el.dataset.platform === platformKey);
        });
        document.querySelectorAll('.platform-group').forEach(group => {
            if (group.dataset.platformGroup === platformKey) group.classList.add('open');
        });
        document.querySelectorAll('.sub-service-link').forEach(link => {
            link.classList.toggle('active', link.dataset.service === currentServiceKey);
        });

        document.getElementById('platformSelect').value = platformKey;
        const serviceSelect = document.getElementById('serviceSelect');
        serviceSelect.innerHTML = Object.entries(platform.services).map(([sKey, sData]) =>
            `<option value="${sKey}">${sData.title}</option>`
        ).join('');
        serviceSelect.value = currentServiceKey;

        const quickTabs = document.getElementById('serviceQuickTabs');
        quickTabs.innerHTML = Object.entries(platform.services).map(([sKey, sData]) => `
            <button type="button" class="service-tab ${sKey === currentServiceKey ? 'active' : ''}" data-service="${sKey}">
                ${sData.title}
            </button>
        `).join('');

        quickTabs.querySelectorAll('.service-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                selectPlatformAndService(currentPlatformKey, tab.dataset.service);
            });
        });

        document.getElementById('currentPlatformBadge').innerHTML = `<i class="${platform.icon}"></i>`;
        document.getElementById('currentServiceTitle').textContent = `${service.title} (${platform.name})`;

        const targetLabel = document.getElementById('targetInputLabel');
        const targetInput = document.getElementById('targetUidInput');
        const qtyInput = document.getElementById('quantityInput');
        const toggleMassBtn = document.getElementById('toggleMassOrderBtn');

        if (service.isAccountService) {
            targetLabel.innerHTML = `${service.customLabel} <span class="required">*</span>`;
            targetInput.placeholder = service.customPlaceholder;
            qtyInput.value = 1;
            if (isMassOrderMode) {
                isMassOrderMode = false;
                toggleMassBtn?.classList.remove('active');
                document.getElementById('singleTargetWrap')?.classList.remove('hidden');
                document.getElementById('massTargetWrap')?.classList.add('hidden');
            }
            toggleMassBtn?.classList.add('hidden');
        } else {
            targetLabel.innerHTML = `Nhập Link hoặc ID cần chạy <span class="required">*</span>`;
            targetInput.placeholder = platform.placeholder;
            if (Number(qtyInput.value) < 10) qtyInput.value = 100;
            toggleMassBtn?.classList.remove('hidden');
        }

        document.getElementById('reactionGroup').classList.toggle('hidden', !service.hasReactions);
        document.getElementById('commentGroup').classList.toggle('hidden', !service.hasComments);
        document.getElementById('quantityGroup').classList.toggle('hidden', !!service.hasComments);
        document.getElementById('liveMinutesGroup').classList.toggle('hidden', !service.hasLiveMinutes);

        const unitText = service.isAccountService ? 'acc' : 'lượt';
        const container = document.getElementById('serverListContainer');
        container.innerHTML = service.servers.map((sv, idx) => `
            <label class="server-option ${idx === currentServerIndex ? 'active' : ''}" data-index="${idx}">
                <input type="radio" name="serverRadio" value="${sv.id}" ${idx === currentServerIndex ? 'checked' : ''}>
                <div class="server-content">
                    <div class="server-top-line">
                        <span class="server-name">${sv.name}</span>
                        <span class="badge badge-info">${sv.warranty}</span>
                        <span class="server-price-badge">${sv.price.toLocaleString('vi-VN')}đ / ${unitText}</span>
                    </div>
                    <div class="server-desc">⚡ Tốc độ: ${sv.speed} — ${sv.desc}</div>
                </div>
            </label>
        `).join('');

        container.querySelectorAll('.server-option').forEach(optionEl => {
            optionEl.addEventListener('click', () => {
                container.querySelectorAll('.server-option').forEach(el => el.classList.remove('active'));
                optionEl.classList.add('active');
                optionEl.querySelector('input').checked = true;
                currentServerIndex = Number(optionEl.dataset.index);
                updateServerDetailsAndPrice();
            });
        });

        updateServerDetailsAndPrice();
    }

    function getMassTargetLinks() {
        return (document.getElementById('massTargetTextarea')?.value || '')
            .split('\n')
            .map(l => extractCleanTarget(l))
            .filter(Boolean);
    }

    function calculateCurrentOrder() {
        const platform = PLATFORMS_DATA[currentPlatformKey];
        const service = platform.services[currentServiceKey];
        const server = service.servers[currentServerIndex] || service.servers[0];
        let quantity = Number(document.getElementById('quantityInput').value) || 0;

        if (service.hasComments) {
            const lines = document.getElementById('commentTextarea').value
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean);
            quantity = lines.length;
            document.getElementById('commentLineCount').textContent = quantity;
        }

        let multiplier = 1;
        if (service.hasLiveMinutes) {
            multiplier = Number(document.getElementById('liveMinutesSelect').value) || 60;
        }

        const massLinks = isMassOrderMode ? getMassTargetLinks() : [];
        const linkCount = isMassOrderMode ? Math.max(1, massLinks.length) : 1;
        if (isMassOrderMode) {
            document.getElementById('massLinkCount').textContent = massLinks.length;
        }

        const rawCostPerLink = quantity * server.price * multiplier;
        const baseTotal = Math.round(rawCostPerLink * linkCount * (1 + SITE_CONFIG.markupPercent / 100));

        const totalVolume = quantity * linkCount;
        let bulkDiscountPercent = 0;
        if (!service.isAccountService) {
            if (totalVolume >= 10000) bulkDiscountPercent = 10;
            else if (totalVolume >= 5000) bulkDiscountPercent = 5;
        }

        const promoPercent = activePromoCode && PROMO_CODES[activePromoCode] ? PROMO_CODES[activePromoCode].percent : 0;
        const totalDiscountPercent = Math.min(30, bulkDiscountPercent + promoPercent);
        const discountAmount = Math.round(baseTotal * (totalDiscountPercent / 100));
        const retailPrice = Math.max(0, baseTotal - discountAmount);

        return {
            platform,
            service,
            server,
            quantity,
            multiplier,
            linkCount,
            totalCost: baseTotal,
            discountAmount,
            totalDiscountPercent,
            retailPrice
        };
    }

    function updateServerDetailsAndPrice() {
        const {
            platform,
            service,
            server,
            quantity,
            multiplier,
            linkCount,
            discountAmount,
            totalDiscountPercent,
            retailPrice
        } = calculateCurrentOrder();

        const unitLabel = service.isAccountService ? 'acc' : 'lượt';

        document.getElementById('minMaxHint').textContent = `Min: ${server.min.toLocaleString()} - Max: ${server.max.toLocaleString()}`;
        document.getElementById('summaryUnitPrice').textContent = service.hasLiveMinutes
            ? `${server.price.toLocaleString('vi-VN')}đ × ${multiplier} phút`
            : `${server.price.toLocaleString('vi-VN')}đ / ${unitLabel}`;

        document.getElementById('summaryQty').textContent = isMassOrderMode && linkCount > 1
            ? `${quantity.toLocaleString('vi-VN')} × ${linkCount} link`
            : quantity.toLocaleString('vi-VN');

        const discountEl = document.getElementById('summaryDiscountAmount');
        if (discountEl) {
            discountEl.textContent = discountAmount > 0
                ? `-${formatVND(discountAmount)} (${totalDiscountPercent}%)`
                : '-0đ';
        }

        document.getElementById('summaryRetailPrice').textContent = formatVND(retailPrice);

        document.getElementById('selectedServerDetailBox').innerHTML = `
            <div><strong>Nền tảng:</strong> ${platform.name}</div>
            <div><strong>Máy chủ:</strong> ${server.name}</div>
            <div><strong>Tốc độ:</strong> ${server.speed} • <strong>Bảo hành:</strong> ${server.warranty}</div>
            <div style="margin-top:6px;">${server.desc}</div>
        `;
    }

    function startQrCountdown() {
        if (qrCountdownInterval) clearInterval(qrCountdownInterval);
        let remaining = 15 * 60;
        const timerEl = document.getElementById('qrTimerText');
        if (!timerEl) return;

        const updateTimer = () => {
            const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
            const secs = String(remaining % 60).padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
            if (remaining > 0) remaining--;
        };
        updateTimer();
        qrCountdownInterval = setInterval(updateTimer, 1000);
    }

    function renderCreatedOrderInlineQR(orderObj) {
        if (!orderObj) return;
        const qrBox = document.getElementById('inlineQrPaymentBox');
        qrBox.classList.remove('hidden');

        const isMomo = inlineQrMethod === 'momo';
        qrBox.classList.toggle('momo-active', isMomo);

        const momoConfigBar = document.getElementById('momoRealConfigBar');
        if (momoConfigBar) momoConfigBar.classList.toggle('hidden', !isMomo);

        const openMomoBtn = document.getElementById('openMomoAppBtn');
        if (openMomoBtn) openMomoBtn.classList.toggle('hidden', !isMomo);

        const customMomo = getSavedCustomMomoQr();
        const clearMomoBtn = document.getElementById('clearRealMomoQrBtn');
        if (clearMomoBtn) clearMomoBtn.classList.toggle('hidden', !customMomo);

        const invoiceAmount = orderObj.retailPrice || orderObj.cost;
        const amountStr = formatVND(invoiceAmount);
        const memo = `THANH TOAN ${orderObj.id}`;

        document.getElementById('inlineCreatedOrderId').textContent = `#${orderObj.id}`;
        document.getElementById('inlineQrAmountBadge').textContent = amountStr;
        document.getElementById('inlineQrExactAmount').textContent = amountStr;
        document.getElementById('inlineQrNoteAmount').textContent = amountStr;
        document.getElementById('inlineQrMemo').textContent = memo;

        const verifyBadge = document.getElementById('inlineQrVerifyBadge');

        if (isMomo) {
            const cleanPhone = String(SITE_CONFIG.momoPhone || '').replace(/\D/g, '');
            document.getElementById('inlineQrProviderName').textContent = customMomo
                ? 'Ví MoMo Chính Chủ (QR Động)'
                : (momoScanSubMode === 'native' ? 'Ví Điện Tử MoMo (2|99)' : `QR Đa Năng MoMo (${SITE_CONFIG.bankId})`);
            document.getElementById('inlineQrAccNo').textContent = cleanPhone || SITE_CONFIG.bankAccNo;
            document.getElementById('inlineQrAccName').textContent = SITE_CONFIG.momoName;
            document.getElementById('inlineQrMethodPill').textContent = 'Mở App MoMo ➔ Quét Mã';
            if (verifyBadge) {
                verifyBadge.innerHTML = customMomo
                    ? `<i class="fa-solid fa-circle-check"></i> Đã nạp QR MoMo chính chủ (Tự điền tiền)`
                    : `<i class="fa-solid fa-circle-check"></i> Chuẩn EMVCo CRC16 - Quét thực tế bằng MoMo`;
            }
        } else {
            document.getElementById('inlineQrProviderName').textContent = `Ngân hàng ${SITE_CONFIG.bankId}`;
            document.getElementById('inlineQrAccNo').textContent = SITE_CONFIG.bankAccNo;
            document.getElementById('inlineQrAccName').textContent = SITE_CONFIG.bankAccName;
            document.getElementById('inlineQrMethodPill').textContent = 'VietQR Napas 24/7';
            if (verifyBadge) {
                verifyBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Tự điền số tiền & mã đơn`;
            }
        }

        const qrImg = document.getElementById('inlineQrImage');
        const primaryUrl = buildDynamicQrUrl(inlineQrMethod, invoiceAmount, memo);
        qrImg.onerror = () => {
            qrImg.onerror = null;
            const fallbackPayload = buildStandardEmvcoPayload(
                SITE_CONFIG.bankBin || '970422',
                SITE_CONFIG.bankAccNo,
                invoiceAmount,
                memo
            );
            qrImg.src = `https://quickchart.io/qr?size=320&margin=2&text=${encodeURIComponent(fallbackPayload)}`;
        };
        qrImg.src = primaryUrl;
        startQrCountdown();
    }

    function downloadOrderInvoiceImage(orderObj) {
        if (!orderObj) return;
        const canvas = document.createElement('canvas');
        canvas.width = 680;
        canvas.height = 460;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(24, 24, canvas.width - 48, canvas.height - 48);

        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(`${SITE_CONFIG.brandName} - HÓA ĐƠN DỊCH VỤ MXH`, 48, 70);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`Thời gian: ${orderObj.time}  |  Đồng bộ Google Sheets 24/7`, 48, 96);

        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(48, 114);
        ctx.lineTo(canvas.width - 48, 114);
        ctx.stroke();

        const lines = [
            ['Mã Đơn Hàng:', `#${orderObj.id}`],
            ['Nền tảng & Dịch vụ:', `[${orderObj.platformName}] ${orderObj.serviceName}`],
            ['Gói máy chủ:', orderObj.serverName],
            ['Link / UID chạy:', orderObj.uid],
            ['Số lượng:', `${orderObj.quantity.toLocaleString('vi-VN')}`],
            ['Tổng Thanh Toán:', formatVND(orderObj.retailPrice || orderObj.cost)],
            ['Nội dung CK:', `THANH TOAN ${orderObj.id}`],
            ['Ngân hàng nhận:', `${SITE_CONFIG.bankId} - ${SITE_CONFIG.bankAccNo} (${SITE_CONFIG.bankAccName})`]
        ];

        let y = 152;
        lines.forEach(([label, val]) => {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px Inter, sans-serif';
            ctx.fillText(label, 48, y);

            ctx.fillStyle = label === 'Tổng Thanh Toán:' ? '#10b981' : '#f8fafc';
            ctx.font = 'bold 14px Inter, sans-serif';
            ctx.fillText(String(val).slice(0, 48), 210, y);
            y += 34;
        });

        ctx.fillStyle = '#64748b';
        ctx.font = '11.5px Inter, sans-serif';
        ctx.fillText('NTpro sản phẩm thuộc NGUYENTHUANIT PORTFOLIO PROJECT (NT TECHNOLOGY)', 48, 418);

        const link = document.createElement('a');
        link.download = `HoaDon_${orderObj.id}_NTPro.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast(`Đã tải ảnh Bill đơn hàng #${orderObj.id}!`);
    }

    async function renderOrdersHistory() {
        const rawQuery = (document.getElementById('historySearchInput')?.value || '').trim().replace(/^#/, '');
        const queryUpper = rawQuery.toUpperCase();
        const noticeEl = document.getElementById('historyPrivateNotice');
        const tableWrapEl = document.getElementById('historyTableContainer');
        const tbody = document.getElementById('historyTableBody');

        if (!queryUpper) {
            noticeEl.classList.remove('hidden');
            tableWrapEl.classList.add('hidden');
            tbody.innerHTML = '';
            return;
        }

        noticeEl.classList.remove('hidden');
        tableWrapEl.classList.add('hidden');
        noticeEl.innerHTML = `
            <div class="private-icon-circle">
                <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
            <h3>Đang tra cứu Mã Đơn #${escapeHtml(queryUpper)} trên Google Sheets...</h3>
            <p>Vui lòng chờ trong giây lát.</p>
        `;

        const matchedOrder = await fetchOrderByCodeFromGoogleSheet(queryUpper);

        if (!matchedOrder) {
            noticeEl.classList.remove('hidden');
            tableWrapEl.classList.add('hidden');
            noticeEl.innerHTML = `
                <div class="private-icon-circle" style="color: var(--danger); background: rgba(239,68,68,0.1);">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <h3>Không tìm thấy Mã Đơn Hàng #${escapeHtml(queryUpper)}</h3>
                <p>Mã đơn không tồn tại trên Google Sheets hoặc chưa chính xác. Vui lòng kiểm tra lại đúng Mã Đơn Hàng cá nhân của bạn.</p>
            `;
            return;
        }

        noticeEl.classList.add('hidden');
        tableWrapEl.classList.remove('hidden');

        tbody.innerHTML = `
            <tr>
                <td><strong>#${escapeHtml(matchedOrder.id)}</strong></td>
                <td>${escapeHtml(matchedOrder.time)}</td>
                <td>
                    <div><strong>[${escapeHtml(matchedOrder.platformName || 'MXH')}] ${escapeHtml(matchedOrder.serviceName)}</strong></div>
                    <div class="text-muted" style="font-size:11.5px;">${escapeHtml(matchedOrder.serverName)}</div>
                </td>
                <td>
                    <code>${escapeHtml(matchedOrder.uid)}</code>
                    <button type="button" class="btn-icon-copy" data-copy-uid="${escapeHtml(matchedOrder.uid)}" title="Sao chép">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </td>
                <td><strong>${Number(matchedOrder.quantity).toLocaleString('vi-VN')}</strong></td>
                <td class="text-green"><strong>${formatVND(matchedOrder.retailPrice || matchedOrder.cost)}</strong></td>
                <td>${escapeHtml(matchedOrder.note || '-')}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(matchedOrder.status)}">${escapeHtml(matchedOrder.status)}</span>
                </td>
                <td>
                    <a href="status.html?id=${encodeURIComponent(matchedOrder.id)}" class="btn btn-outline btn-sm">Chi Tiết Tiến Độ</a>
                </td>
            </tr>
        `;

        tbody.querySelectorAll('.btn-icon-copy[data-copy-uid]').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-copy-uid');
                navigator.clipboard.writeText(val);
                showToast(`Đã sao chép: ${val}`);
            });
        });
    }

    async function handleMiniOrderLookup(codeInput) {
        const cleanCode = (codeInput || '').trim().replace(/^#/, '').toUpperCase();
        const container = document.getElementById('miniOrderLookupResult');

        if (!cleanCode) {
            showToast('Vui lòng nhập Mã Đơn Hàng của bạn!', 'fa-circle-exclamation');
            return;
        }

        container.innerHTML = `
            <div class="private-lookup-placeholder">
                <i class="fa-solid fa-spinner fa-spin" style="color: var(--primary);"></i>
                <span>Đang kiểm tra đơn hàng <b>#${escapeHtml(cleanCode)}</b> từ Google Sheets...</span>
            </div>
        `;

        const matched = await fetchOrderByCodeFromGoogleSheet(cleanCode);
        if (!matched) {
            container.innerHTML = `
                <div class="private-lookup-placeholder" style="border-color: var(--danger); color: var(--danger);">
                    <i class="fa-solid fa-circle-xmark" style="color: var(--danger);"></i>
                    <span>Không tìm thấy đơn hàng <b>#${escapeHtml(cleanCode)}</b>. Vui lòng kiểm tra lại mã đơn cá nhân.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="mini-order-item">
                <div>
                    <div style="font-weight:700; font-size:13.5px; color: var(--primary);">#${escapeHtml(matched.id)} • [${escapeHtml(matched.platformName || 'MXH')}] ${escapeHtml(matched.serviceName)}</div>
                    <div class="text-muted" style="font-size:12px;">Tài khoản/ID: <b>${escapeHtml(matched.uid)}</b> • SL: <b>${Number(matched.quantity).toLocaleString()}</b></div>
                    <div style="margin-top: 6px;">
                        <a href="status.html?id=${encodeURIComponent(matched.id)}" class="link-sm"><i class="fa-solid fa-arrow-up-right-from-square"></i> Mở trang theo dõi chi tiết</a>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div class="text-green" style="font-weight:700; font-size:13.5px;">${formatVND(matched.retailPrice || matched.cost)}</div>
                    <span class="badge ${getStatusBadgeClass(matched.status)}">${escapeHtml(matched.status)}</span>
                </div>
            </div>
        `;
    }

    window.showToast = showToast;

    function renderPriceListTable() {
        const filterPlatform = document.getElementById('priceListPlatformFilter')?.value || 'ALL';
        const keyword = (document.getElementById('priceListSearchInput')?.value || '').trim().toLowerCase();
        const markup = 1 + SITE_CONFIG.markupPercent / 100;
        const rows = [];

        Object.entries(PLATFORMS_DATA).forEach(([pKey, pData]) => {
            if (filterPlatform !== 'ALL' && filterPlatform !== pKey) return;
            Object.entries(pData.services).forEach(([sKey, service]) => {
                service.servers.forEach((sv, sIdx) => {
                    const searchTarget = `${pData.name} ${service.title} ${sv.name} ${sv.desc}`.toLowerCase();
                    if (keyword && !searchTarget.includes(keyword)) return;

                    const price100 = Math.round(sv.price * 100 * markup);
                    const price1000 = Math.round(sv.price * 1000 * markup);
                    rows.push(`
                        <tr>
                            <td><i class="${pData.icon}"></i> <strong>${pData.name}</strong></td>
                            <td><strong>${service.title}</strong></td>
                            <td>${sv.name}</td>
                            <td>${sv.speed} • <span class="text-primary">${sv.warranty}</span></td>
                            <td><strong>${sv.price.toLocaleString('vi-VN')}đ</strong></td>
                            <td class="text-red"><strong>${formatVND(price100)}</strong></td>
                            <td class="text-green"><strong>${formatVND(price1000)}</strong></td>
                            <td>
                                <button type="button" class="btn btn-primary btn-sm quick-buy-price-btn" data-platform="${pKey}" data-service="${sKey}" data-server="${sIdx}">
                                    <i class="fa-solid fa-cart-plus"></i> Chọn Mua
                                </button>
                            </td>
                        </tr>
                    `);
                });
            });
        });

        const tbody = document.getElementById('priceListTableBody');
        tbody.innerHTML = rows.length > 0 ? rows.join('') : `
            <tr>
                <td colspan="8" style="text-align:center; padding: 24px; color: var(--text-muted);">
                    Không tìm thấy gói dịch vụ nào phù hợp với từ khóa "${escapeHtml(keyword)}".
                </td>
            </tr>
        `;

        tbody.querySelectorAll('.quick-buy-price-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchView('order-view');
                selectPlatformAndService(btn.dataset.platform, btn.dataset.service, Number(btn.dataset.server));
                showToast('Đã chọn gói máy chủ! Vui lòng dán Link/UID để lên đơn.');
            });
        });
    }

    function switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === viewId);
        });
        document.querySelectorAll('.nav-item[data-view], .bottom-nav-item[data-view]').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.addEventListener('DOMContentLoaded', () => {
        saveState();
        applyTheme(appState.theme || 'light');
        renderBrandHeader();
        renderNavigationMenus();

        const urlParams = new URLSearchParams(window.location.search);
        const initPlatform = urlParams.get('platform') || 'facebook';
        const initService = urlParams.get('service') || 'fb_like';
        const initUid = urlParams.get('uid') || '';
        selectPlatformAndService(initPlatform, initService);
        if (initUid) {
            document.getElementById('targetUidInput').value = initUid;
        }

        renderOrdersHistory();
        renderPriceListTable();
        renderSessionOrderChips();

        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
            applyTheme(appState.theme);
            saveState();
        });

        document.querySelectorAll('.nav-item[data-view], .bottom-nav-item[data-view]').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                switchView(item.dataset.view);
            });
        });

        const quickAccTiktokBtn = document.getElementById('quickAccTiktokLiveBtn');
        if (quickAccTiktokBtn) {
            quickAccTiktokBtn.addEventListener('click', e => {
                e.preventDefault();
                switchView('order-view');
                selectPlatformAndService('tiktok', 'tt_acclive');
                showToast('Đã chọn danh mục: Acc TikTok Live Giá Rẻ!');
            });
        }

        const toggleMassBtn = document.getElementById('toggleMassOrderBtn');
        toggleMassBtn.addEventListener('click', () => {
            isMassOrderMode = !isMassOrderMode;
            toggleMassBtn.classList.toggle('active', isMassOrderMode);
            document.getElementById('singleTargetWrap').classList.toggle('hidden', isMassOrderMode);
            document.getElementById('massTargetWrap').classList.toggle('hidden', !isMassOrderMode);
            updateServerDetailsAndPrice();
        });

        document.getElementById('massTargetTextarea').addEventListener('input', updateServerDetailsAndPrice);
        document.getElementById('cleanMassUidBtn').addEventListener('click', () => {
            const cleaned = getMassTargetLinks();
            document.getElementById('massTargetTextarea').value = cleaned.join('\n');
            updateServerDetailsAndPrice();
            showToast(`Đã chuẩn hóa ${cleaned.length} link hợp lệ!`);
        });

        document.querySelectorAll('#reactionContainer .reaction-item input').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selected = getSelectedReactions();
                document.querySelectorAll('#reactionContainer .reaction-item').forEach(label => {
                    const inp = label.querySelector('input');
                    label.classList.toggle('active', inp.checked);
                });
                if (selected.length === 1 && !checkbox.checked) {
                    const firstInput = document.querySelector('#reactionContainer input[value="LIKE"]');
                    firstInput.checked = true;
                    firstInput.closest('.reaction-item').classList.add('active');
                }
                document.getElementById('selectedReactionsHint').textContent = `Đang chọn: ${getSelectedReactions().join(', ')}`;
            });
        });

        document.querySelectorAll('.template-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const type = chip.dataset.template;
                const textarea = document.getElementById('commentTextarea');
                if (type === 'clear') {
                    textarea.value = '';
                } else if (SEEDING_TEMPLATES[type]) {
                    textarea.value = SEEDING_TEMPLATES[type].join('\n');
                    showToast('Đã điền mẫu kịch bản bình luận!');
                }
                updateServerDetailsAndPrice();
            });
        });

        document.getElementById('applyPromoBtn').addEventListener('click', () => {
            const rawCode = document.getElementById('promoCodeInput').value.trim().toUpperCase();
            const feedback = document.getElementById('promoFeedbackText');
            if (!rawCode) {
                activePromoCode = null;
                feedback.innerHTML = 'Tổng đơn từ 5,000 lượt tự động giảm thêm 5% - 10%';
                updateServerDetailsAndPrice();
                return;
            }
            if (PROMO_CODES[rawCode]) {
                activePromoCode = rawCode;
                feedback.innerHTML = `<span class="text-green"><i class="fa-solid fa-circle-check"></i> Đã áp dụng mã <b>${escapeHtml(rawCode)}</b>: ${escapeHtml(PROMO_CODES[rawCode].desc)}</span>`;
                showToast(`Áp dụng mã ${rawCode} thành công!`);
            } else {
                activePromoCode = null;
                feedback.innerHTML = `<span class="text-red"><i class="fa-solid fa-circle-xmark"></i> Mã "${escapeHtml(rawCode)}" không tồn tại. Thử nhập: NTPRO10 hoặc VIP20</span>`;
                showToast('Mã giảm giá không hợp lệ!', 'fa-circle-exclamation');
            }
            updateServerDetailsAndPrice();
        });

        document.querySelectorAll('#inlineQrPaymentBox .qr-method-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#inlineQrPaymentBox .qr-method-tab').forEach(el => el.classList.remove('active'));
                tab.classList.add('active');
                inlineQrMethod = tab.dataset.method;
                if (lastCreatedOrder) {
                    renderCreatedOrderInlineQR(lastCreatedOrder);
                }
            });
        });

        document.querySelectorAll('.momo-mode-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.momo-mode-chip').forEach(el => el.classList.remove('active'));
                chip.classList.add('active');
                momoScanSubMode = chip.dataset.momoMode || 'emvco';
                if (lastCreatedOrder) {
                    renderCreatedOrderInlineQR(lastCreatedOrder);
                }
                showToast(
                    momoScanSubMode === 'emvco'
                        ? 'Đã chuyển sang chuẩn QR Đa Năng EMVCo (Quét 100% trên App MoMo)!'
                        : 'Đã chuyển sang chuẩn Ví MoMo nội bộ (2|99)!'
                );
            });
        });

        const uploadMomoBtn = document.getElementById('uploadRealMomoQrBtn');
        const momoFileInput = document.getElementById('realMomoQrFileInput');
        const clearMomoBtn = document.getElementById('clearRealMomoQrBtn');

        if (uploadMomoBtn && momoFileInput) {
            uploadMomoBtn.addEventListener('click', () => momoFileInput.click());

            momoFileInput.addEventListener('change', e => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = ev => {
                    const dataUrl = ev.target.result;
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);

                        let decodedText = '';
                        if (typeof window.jsQR === 'function') {
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = window.jsQR(imgData.data, imgData.width, imgData.height);
                            if (code && code.data) {
                                decodedText = code.data.trim();
                            }
                        }

                        localStorage.setItem('ntpro_custom_momo_qr_v1', JSON.stringify({
                            rawPayload: decodedText,
                            dataUrl: dataUrl,
                            updatedAt: Date.now()
                        }));

                        if (lastCreatedOrder) {
                            renderCreatedOrderInlineQR(lastCreatedOrder);
                        }

                        if (decodedText.startsWith('000201') || decodedText.startsWith('2|99|')) {
                            showToast('Đã đọc thành công mã QR MoMo thật! Tự động gắn số tiền & mã đơn khi khách quét.');
                        } else {
                            showToast('Đã lưu ảnh QR MoMo gốc của bạn vào khung thanh toán!');
                        }
                    };
                    img.src = dataUrl;
                };
                reader.readAsDataURL(file);
                momoFileInput.value = '';
            });
        }

        if (clearMomoBtn) {
            clearMomoBtn.addEventListener('click', () => {
                localStorage.removeItem('ntpro_custom_momo_qr_v1');
                if (lastCreatedOrder) {
                    renderCreatedOrderInlineQR(lastCreatedOrder);
                }
                showToast('Đã khôi phục về mã QR mặc định của hệ thống.');
            });
        }

        const openMomoAppBtn = document.getElementById('openMomoAppBtn');
        if (openMomoAppBtn) {
            openMomoAppBtn.addEventListener('click', () => {
                if (!lastCreatedOrder) return;
                const cleanPhone = String(SITE_CONFIG.momoPhone || '').replace(/\D/g, '');
                navigator.clipboard.writeText(cleanPhone);
                showToast(`Đã copy SĐT MoMo ${cleanPhone}! Đang mở ứng dụng MoMo...`);
                setTimeout(() => {
                    window.location.href = 'momo://';
                }, 400);
            });
        }

        const downloadQrOnlyBtn = document.getElementById('downloadQrOnlyBtn');
        if (downloadQrOnlyBtn) {
            downloadQrOnlyBtn.addEventListener('click', async () => {
                const qrImg = document.getElementById('inlineQrImage');
                if (!qrImg || !qrImg.src || !lastCreatedOrder) return;
                try {
                    const res = await fetch(qrImg.src);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `QR_${inlineQrMethod.toUpperCase()}_${lastCreatedOrder.id}.png`;
                    a.click();
                    URL.revokeObjectURL(blobUrl);
                    showToast('Đã tải ảnh QR! Mở App MoMo ➔ Quét Mã ➔ Chọn ảnh có sẵn.');
                } catch (err) {
                    window.open(qrImg.src, '_blank');
                }
            });
        }

        document.getElementById('platformSelect').addEventListener('change', e => {
            const pKey = e.target.value;
            const firstService = Object.keys(PLATFORMS_DATA[pKey].services)[0];
            selectPlatformAndService(pKey, firstService);
        });

        document.getElementById('serviceSelect').addEventListener('change', e => {
            selectPlatformAndService(currentPlatformKey, e.target.value);
        });

        document.getElementById('quantityInput').addEventListener('input', updateServerDetailsAndPrice);
        document.getElementById('commentTextarea').addEventListener('input', updateServerDetailsAndPrice);
        document.getElementById('liveMinutesSelect').addEventListener('change', updateServerDetailsAndPrice);

        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('quantityInput').value = btn.dataset.qty;
                updateServerDetailsAndPrice();
            });
        });

        const targetUidInput = document.getElementById('targetUidInput');
        const handleExtract = () => {
            const raw = targetUidInput.value;
            if (!raw) return;
            const extracted = extractCleanTarget(raw);
            targetUidInput.value = extracted;
            document.getElementById('uidConvertStatus').innerHTML = `<span class="text-green"><i class="fa-solid fa-check"></i> Đã chuẩn hóa: <b>${escapeHtml(extracted)}</b></span>`;
        };

        targetUidInput.addEventListener('change', handleExtract);
        document.getElementById('extractUidBtn').addEventListener('click', () => {
            handleExtract();
            showToast('Đã chuẩn hóa Link/ID!');
        });

        const handleTopbarOrderCheck = () => {
            const code = document.getElementById('quickOrderCheckInput').value.trim().replace(/^#/, '');
            if (!code) {
                showToast('Vui lòng dán Mã Đơn Hàng cần kiểm tra!', 'fa-circle-exclamation');
                return;
            }
            window.location.href = `status.html?id=${encodeURIComponent(code.toUpperCase())}`;
        };

        document.getElementById('quickOrderCheckBtn').addEventListener('click', handleTopbarOrderCheck);
        document.getElementById('quickOrderCheckInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleTopbarOrderCheck();
            }
        });

        document.getElementById('miniCheckOrderBtn').addEventListener('click', () => {
            handleMiniOrderLookup(document.getElementById('miniCheckOrderInput').value);
        });

        // KHI BẤM "LƯU & KHỞI TẠO ĐƠN" -> GHI LÊN GOOGLE SHEETS VỚI TRẠNG THÁI "CHỜ THANH TOÁN"
        document.getElementById('orderForm').addEventListener('submit', async e => {
            e.preventDefault();
            const submitBtn = document.getElementById('orderSubmitBtn');
            if (submitBtn && submitBtn.disabled) return;

            const { platform, service, server, quantity, totalCost, retailPrice } = calculateCurrentOrder();

            const targets = isMassOrderMode
                ? getMassTargetLinks()
                : [extractCleanTarget(targetUidInput.value)].filter(Boolean);

            if (targets.length === 0) {
                showToast('Vui lòng nhập thông tin Link / ID hoặc SĐT nhận đơn!', 'fa-circle-exclamation');
                return;
            }
            if (quantity < server.min || quantity > server.max) {
                showToast(`Số lượng mỗi link cần từ ${server.min} đến ${server.max}!`, 'fa-circle-exclamation');
                return;
            }

            const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang Khởi Tạo Đơn...`;
            }

            try {
                const now = new Date();
                const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const userNote = document.getElementById('orderNoteInput').value.trim();

                const extraDetails = [];
                if (service.hasReactions) {
                    extraDetails.push(`Cảm xúc: ${getSelectedReactions().join(', ')}`);
                }
                if (service.hasLiveMinutes) {
                    const mins = document.getElementById('liveMinutesSelect').value;
                    extraDetails.push(`Thời lượng Live: ${mins} phút`);
                }
                if (service.hasComments) {
                    const cmts = document.getElementById('commentTextarea').value
                        .split('\n').map(l => l.trim()).filter(Boolean);
                    extraDetails.push(`ND Comment (${cmts.length}): ${cmts.join(' | ')}`);
                }
                if (targets.length > 1) {
                    extraDetails.push(`DS Đa Link (${targets.length}): ${targets.join(', ')}`);
                }
                if (activePromoCode) {
                    extraDetails.push(`Voucher: ${activePromoCode}`);
                }

                const fullNote = [userNote, ...extraDetails].filter(Boolean).join(' — ');
                const uniqueSuffix = String(Date.now()).slice(-3) + Math.floor(10 + Math.random() * 90);

                const newOrder = {
                    id: 'OT' + uniqueSuffix,
                    time: timeStr,
                    createdAt: Date.now(),
                    platformKey: currentPlatformKey,
                    serviceKey: currentServiceKey,
                    platformName: platform.name,
                    serviceName: service.title,
                    serverName: server.name,
                    uid: targets.length > 1 ? `${targets[0]} (+${targets.length - 1} link)` : targets[0],
                    quantity: quantity * targets.length,
                    cost: totalCost,
                    retailPrice,
                    note: fullNote,
                    status: 'Chờ thanh toán'
                };

                appState.orders.unshift(newOrder);
                saveState();
                addSessionOrder(newOrder.id);

                lastCreatedOrder = newOrder;
                renderCreatedOrderInlineQR(newOrder);

                targetUidInput.value = '';
                document.getElementById('massTargetTextarea').value = '';
                document.getElementById('orderNoteInput').value = '';
                if (service.hasComments) {
                    document.getElementById('commentTextarea').value = '';
                    updateServerDetailsAndPrice();
                }

                document.getElementById('inlineQrPaymentBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                showToast(`Khởi tạo đơn #${newOrder.id} thành công! Vui lòng quét QR để thanh toán.`);

                const synced = await syncOrderToGoogleSheet(newOrder);
                if (synced) {
                    showToast(`Đã lưu đơn #${newOrder.id} (Chờ thanh toán) vào hệ thống!`);
                }

                document.getElementById('miniCheckOrderInput').value = newOrder.id;
                handleMiniOrderLookup(newOrder.id);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        });

        document.getElementById('copyInlineOrderIdBtn').addEventListener('click', () => {
            if (!lastCreatedOrder) return;
            navigator.clipboard.writeText(lastCreatedOrder.id);
            showToast(`Đã sao chép Mã Đơn: ${lastCreatedOrder.id}`);
        });

        document.getElementById('downloadInvoiceBtn').addEventListener('click', () => {
            if (!lastCreatedOrder) return;
            downloadOrderInvoiceImage(lastCreatedOrder);
        });

        document.getElementById('openOrderStatusNowBtn').addEventListener('click', () => {
            if (!lastCreatedOrder) return;
            window.location.href = `status.html?id=${encodeURIComponent(lastCreatedOrder.id)}`;
        });

        document.getElementById('confirmPaidZaloBtn').addEventListener('click', () => {
            if (!lastCreatedOrder) return;
            const confirmMsg = `Đã chuyển khoản đơn #${lastCreatedOrder.id} - Dịch vụ: ${lastCreatedOrder.serviceName} (${lastCreatedOrder.platformName}) - Số tiền: ${formatVND(lastCreatedOrder.retailPrice)}`;
            navigator.clipboard.writeText(confirmMsg);
            showToast('Đã copy thông tin xác nhận! Đang mở Zalo hỗ trợ...');
            setTimeout(() => {
                window.open(`https://zalo.me/${SITE_CONFIG.supportPhone.replace(/\D/g, '')}`, '_blank');
            }, 700);
        });

        document.getElementById('copyQuoteBtn').addEventListener('click', () => {
            const { platform, service, server, quantity, linkCount, retailPrice } = calculateCurrentOrder();
            const unitLabel = service.isAccountService ? 'acc' : 'lượt';
            const quoteText = [
                `✨ BÁO GIÁ DỊCH VỤ ${platform.name.toUpperCase()} - ${SITE_CONFIG.brandName} ✨`,
                `📌 Dịch vụ: ${service.title}`,
                `⚡ Gói máy chủ: ${server.name} (${server.warranty})`,
                `🔢 Số lượng: ${quantity.toLocaleString('vi-VN')} ${unitLabel}${linkCount > 1 ? ` × ${linkCount} link` : ''}`,
                `💰 Tổng thanh toán: ${formatVND(retailPrice)}`,
                `🏦 Ngân hàng: ${SITE_CONFIG.bankId} - ${SITE_CONFIG.bankAccNo} (${SITE_CONFIG.bankAccName})`,
                `📱 Ví MoMo: ${SITE_CONFIG.momoPhone} (${SITE_CONFIG.momoName})`
            ].join('\n');

            navigator.clipboard.writeText(quoteText);
            showToast('Đã sao chép thông tin báo giá!');
        });

        document.getElementById('historySearchBtn').addEventListener('click', renderOrdersHistory);
        document.getElementById('historySearchInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                renderOrdersHistory();
            }
        });
        document.getElementById('priceListPlatformFilter').addEventListener('change', renderPriceListTable);
        document.getElementById('priceListSearchInput').addEventListener('input', renderPriceListTable);

        document.getElementById('quickPriceListBtn').addEventListener('click', () => switchView('pricelist-view'));

        document.querySelectorAll('.btn-icon-copy[data-copy-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = document.getElementById(btn.dataset.copyTarget).textContent;
                navigator.clipboard.writeText(text);
                showToast(`Đã sao chép: ${text}`);
            });
        });

        document.getElementById('openSidebarBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('open');
            document.getElementById('sidebarOverlay').classList.add('active');
        });
        document.getElementById('closeSidebarBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        });
        document.getElementById('sidebarOverlay').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        });
    });
}