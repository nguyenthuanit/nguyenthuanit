document.addEventListener('DOMContentLoaded', () => {
    initCategoryNavigation();
    initGuideSearch();
});

/* =========================================================
   1. HIỂN THỊ DANH SÁCH BÀI VIẾT THEO CHỦ ĐỀ & CHI TIẾT BÀI
   ========================================================= */
function initCategoryNavigation() {
    const navItems = document.querySelectorAll('.guide-nav-item');
    const contentArea = document.getElementById('guideContentArea');

    if (navItems.length === 0 || !contentArea || typeof GUIDE_DATA === 'undefined') return;

    // Render danh sách các mục bài viết thuộc 1 chủ đề
    function renderCategoryList(categoryKey) {
        const category = GUIDE_DATA[categoryKey];
        if (!category) return;

        const cardsHtml = category.articles.map((article, index) => `
            <div class="topic-article-card" data-category="${categoryKey}" data-article-id="${article.id}">
                <div class="topic-card-header">
                    <span class="topic-badge">${article.badge}</span>
                    <span class="topic-read-time"><i class="far fa-clock"></i> ${article.readTime}</span>
                </div>
                <h3 class="topic-card-title">${index + 1}. ${article.title}</h3>
                <p class="topic-card-summary">${article.summary}</p>
                <span class="topic-card-link">Xem hướng dẫn chi tiết <i class="fas fa-arrow-right"></i></span>
            </div>
        `).join('');

        contentArea.innerHTML = `
            <div class="category-view" style="animation: fadeIn 0.35s ease forwards;">
                <div class="category-view-header">
                    <div class="category-icon-wrap">
                        <i class="${category.icon}"></i>
                    </div>
                    <div>
                        <span class="category-count">${category.articles.length} bài viết hướng dẫn</span>
                        <h2 class="guide-title" style="margin-bottom: 6px;">${category.title}</h2>
                        <p class="guide-desc" style="margin-bottom: 0;">${category.desc}</p>
                    </div>
                </div>

                <div class="topic-articles-grid">
                    ${cardsHtml}
                </div>
            </div>
        `;

        // Gắn sự kiện click cho từng thẻ bài viết con
        contentArea.querySelectorAll('.topic-article-card').forEach(card => {
            card.addEventListener('click', () => {
                const catKey = card.getAttribute('data-category');
                const artId = card.getAttribute('data-article-id');
                renderArticleDetail(catKey, artId);
            });
        });
    }

    // Render nội dung chi tiết của 1 bài viết con + gợi ý các mục khác cùng chủ đề
    function renderArticleDetail(categoryKey, articleId) {
        const category = GUIDE_DATA[categoryKey];
        if (!category) return;

        const article = category.articles.find(a => a.id === articleId);
        if (!article) return;

        const relatedArticles = category.articles.filter(a => a.id !== articleId);
        const relatedHtml = relatedArticles.length > 0 ? `
            <div class="related-articles-box">
                <h4><i class="fas fa-layer-group"></i> Các mục khác cùng chủ đề "${category.title}"</h4>
                <div class="related-list">
                    ${relatedArticles.map(rel => `
                        <button type="button" class="related-item-btn" data-category="${categoryKey}" data-article-id="${rel.id}">
                            <span>${rel.title}</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : '';

        contentArea.innerHTML = `
            <article class="guide-article" style="animation: fadeIn 0.35s ease forwards;">
                <div class="article-breadcrumb">
                    <button type="button" class="back-to-category-btn" data-category="${categoryKey}">
                        <i class="fas fa-arrow-left"></i> Quay lại danh sách ${category.title}
                    </button>
                    <span class="topic-badge">${article.badge}</span>
                </div>

                <h2 class="guide-title">${article.title}</h2>
                <p class="guide-desc">${article.summary}</p>

                <div class="article-body">
                    ${article.content}
                </div>

                ${relatedHtml}
            </article>
        `;

        // Nút quay lại danh sách chủ đề
        const backBtn = contentArea.querySelector('.back-to-category-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                renderCategoryList(categoryKey);
            });
        }

        // Bấm vào các bài viết liên quan cùng chủ đề ở bên dưới
        contentArea.querySelectorAll('.related-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                renderArticleDetail(
                    btn.getAttribute('data-category'),
                    btn.getAttribute('data-article-id')
                );
                window.scrollTo({ top: contentArea.offsetTop - 110, behavior: 'smooth' });
            });
        });

        if (window.innerWidth <= 992) {
            window.scrollTo({ top: contentArea.offsetTop - 120, behavior: 'smooth' });
        }
    }

    // Gắn sự kiện click trên Sidebar bên trái
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            const categoryKey = this.getAttribute('data-category');
            if (categoryKey) {
                renderCategoryList(categoryKey);
            }

            if (window.innerWidth <= 992) {
                window.scrollTo({ top: contentArea.offsetTop - 120, behavior: 'smooth' });
            }
        });
    });

    // Expose hàm render ra window để chức năng tìm kiếm gọi được
    window.openGuideArticle = renderArticleDetail;
    window.openGuideCategory = renderCategoryList;
}

/* =========================================================
   2. TÌM KIẾM TOÀN BỘ BÀI VIẾT CON & CHỦ ĐỀ
   ========================================================= */
function initGuideSearch() {
    const searchInput = document.getElementById('guideSearchInput');
    const searchBtn = document.getElementById('guideSearchBtn');
    const contentArea = document.getElementById('guideContentArea');
    const navItems = document.querySelectorAll('.guide-nav-item');

    if (!searchInput || !contentArea || typeof GUIDE_DATA === 'undefined') return;

    const performSearch = () => {
        const keyword = searchInput.value.toLowerCase().trim();
        if (!keyword) return;

        // Bỏ active trên sidebar khi đang xem kết quả tìm kiếm tổng hợp
        navItems.forEach(nav => nav.classList.remove('active'));

        const results = [];
        Object.entries(GUIDE_DATA).forEach(([catKey, category]) => {
            category.articles.forEach(article => {
                const matchTitle = article.title.toLowerCase().includes(keyword);
                const matchSummary = article.summary.toLowerCase().includes(keyword);
                const matchCat = category.title.toLowerCase().includes(keyword);

                if (matchTitle || matchSummary || matchCat) {
                    results.push({ catKey, categoryTitle: category.title, article });
                }
            });
        });

        if (results.length === 0) {
            contentArea.innerHTML = `
                <div class="guide-placeholder">
                    <div class="placeholder-icon-box">
                        <i class="fas fa-search-minus"></i>
                    </div>
                    <h2>Không tìm thấy kết quả cho "${searchInput.value}"</h2>
                    <p>Hãy thử tìm với từ khóa ngắn gọn hơn như: <strong>Windows, USB, RAM, SSD, DNS, Virus, PC</strong>...</p>
                </div>
            `;
            return;
        }

        const resultsHtml = results.map(item => `
            <div class="topic-article-card" data-category="${item.catKey}" data-article-id="${item.article.id}">
                <div class="topic-card-header">
                    <span class="topic-badge">${item.categoryTitle}</span>
                    <span class="topic-read-time"><i class="far fa-clock"></i> ${item.article.readTime}</span>
                </div>
                <h3 class="topic-card-title">${item.article.title}</h3>
                <p class="topic-card-summary">${item.article.summary}</p>
                <span class="topic-card-link">Đọc bài viết <i class="fas fa-arrow-right"></i></span>
            </div>
        `).join('');

        contentArea.innerHTML = `
            <div class="category-view" style="animation: fadeIn 0.35s ease forwards;">
                <h2 class="guide-title">Kết quả tìm kiếm (${results.length} bài viết)</h2>
                <p class="guide-desc">Hiển thị các hướng dẫn phù hợp với từ khóa <strong>"${searchInput.value}"</strong>:</p>
                <div class="topic-articles-grid">
                    ${resultsHtml}
                </div>
            </div>
        `;

        contentArea.querySelectorAll('.topic-article-card').forEach(card => {
            card.addEventListener('click', () => {
                const catKey = card.getAttribute('data-category');
                const artId = card.getAttribute('data-article-id');
                navItems.forEach(nav => {
                    nav.classList.toggle('active', nav.getAttribute('data-category') === catKey);
                });
                if (window.openGuideArticle) {
                    window.openGuideArticle(catKey, artId);
                }
            });
        });
    };

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
}