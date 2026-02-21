/**
 * NMT VIP BO - JAVASCRIPT CORE (VERSION 4.1 - FIXED DEPOSIT & ENHANCED)
 * Đã sửa lỗi nạp tiền và tối ưu logic đồng bộ
 */

// --- 1. STATE & BIẾN TOÀN CỤC ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzENF5j2O8npZIRGKr_a7RGYnJwWB8v5sv8ThsvwxPSmJ8ykQDaT4ws4EW9kbQSkc-S/exec";
const API_KEY = "NMT_SECRET_2026";
const EXCHANGE_RATE = 25000;

let state = {
    usdBalance: 0.00,
    realizedPnL: 0,
    history: [],
    dotHistory: [],
    winStreak: 0,
    currentStreakType: null,
    totalVolume: 0
};

let currentPrice = 100.00;
let isBoRunning = false;
let currentBetDirection = null;
let betEntryPrice = 0;
let activeAIPrediction = null;

// --- ÂM THANH BÁO KẾT QUẢ ---
const winSound = new Audio('https://quicksounds.com/uploads/tracks/1149463990_1215160074_1349386407.mp3');
const loseSound = new Audio('https://www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3');
const fakeNames = ["Nguyễn Hải", "Trần Tuấn", "Lê Nam", "Phạm Quân", "Hoàng Linh", "Vũ Thảo", "Đặng Long", "Bùi Phát", "Võ Cường", "Phan Anh"];

// --- 2. ĐỒNG BỘ DỮ LIỆU (LOCAL STORAGE & CLOUD) ---

async function loadData() {
    const saved = localStorage.getItem('nmt_vip_bo_lite');
    if (saved) {
        state = Object.assign(state, JSON.parse(saved));
        updateUI();
    }

    try {
        console.log("🔄 Đang đồng bộ số dư từ Google Sheets...");
        const response = await fetch(GOOGLE_SHEET_URL);
        const cloudData = await response.json();

        if (cloudData && cloudData.balance !== undefined) {
            state.usdBalance = parseFloat(cloudData.balance);
            console.log("✅ Đồng bộ thành công. Số dư: $" + state.usdBalance);
            updateUI();
            saveData();
        }
    } catch (err) {
        console.warn("⚠️ Không thể kết nối Sheets để đồng bộ.");
    }
}

function saveData() {
    localStorage.setItem('nmt_vip_bo_lite', JSON.stringify(state));
}

async function sendToGoogleSheets(action, amount, result, profit_loss, balance, note) {
    // 1. Lấy thông tin tài khoản đang đăng nhập để định danh người chơi
    const session = JSON.parse(localStorage.getItem('nmt_session')) || {id: 'Khách', hash: 'Unknown'};

    const data = {
        api_key: API_KEY, 
        time: new Date().toLocaleString("vi-VN"),
        action: action,
        amount: amount,
        result: result,
        pnl: profit_loss,
        balance: balance,
        note: note,
        // Gửi ID và mã băm để Backend cập nhật đúng số dư vào sheet datanguoichoi
        player_id: session.id,
        hash_pass: session.hash
    };

    try {
        // 2. Loại bỏ "no-cors" để cho phép đồng bộ hóa dữ liệu thực tế giữa các thiết bị
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(data)
        });
        
        console.log("✅ Đã đồng bộ giao dịch lên hệ thống đám mây.");
    } catch (err) {
        console.error("❌ Lỗi mạng: Không thể gửi dữ liệu lên Sheets:", err);
    }
}

// --- 3. MÔ PHỎNG THỊ TRƯỜNG & THAO TÚNG AI ---

function simulateMarket() {
    let volatility = (Math.random() * 2 - 1) / 100;

    if (isBoRunning && activeAIPrediction) {
        const isAIHit = Math.random() <= 0.95;
        if (activeAIPrediction === 'UP') {
            volatility = isAIHit ? Math.abs(volatility) + 0.005 : -Math.abs(volatility) - 0.005;
        } else {
            volatility = isAIHit ? -Math.abs(volatility) - 0.005 : Math.abs(volatility) + 0.005;
        }
    }

    currentPrice = parseFloat((currentPrice * (1 + volatility)).toFixed(2));
    updateOrderBook();
    updateUI();
}

function updateOrderBook() {
    const hp = document.getElementById('header-price');
    if (!hp) return;
    hp.innerText = currentPrice.toFixed(2);

    const obPriceEl = document.getElementById('ob-price');
    if (obPriceEl) {
        obPriceEl.innerText = currentPrice.toFixed(2);
        obPriceEl.className = (volatility > 0) ? 'ob-current-price price-up' : 'ob-current-price price-down';
    }
}

// --- 4. NGƯỜI CHƠI ẢO & AI ---

function generateFakeBet() {
    if (Math.random() > 0.4 || isBoRunning) return;
    const name = fakeNames[Math.floor(Math.random() * fakeNames.length)] + "***";
    const amount = (Math.random() * 800 + 50).toFixed(0);
    const feed = document.getElementById('live-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `<strong>${name}</strong> cược <span style="color:var(--accent)">$${amount}</span> 💸`;
    feed.prepend(item);
    if (feed.children.length > 10) feed.lastChild.remove();
}

function getAIPrediction() {
    if (isBoRunning) return;
    const btn = document.getElementById('btn-predict');
    const resultBox = document.getElementById('ai-result');

    btn.disabled = true;
    btn.innerHTML = "⏳ Đang quét khối lượng giao dịch...";
    resultBox.style.display = 'block';
    resultBox.innerHTML = "Đang kết nối siêu máy tính...";

    setTimeout(() => {
        const isUp = Math.random() > 0.5;
        activeAIPrediction = isUp ? 'UP' : 'DOWN';
        const accuracy = (Math.random() * 2 + 95).toFixed(2);

        btn.innerHTML = "🤖 Phân Tích Lại";
        btn.disabled = false;
        resultBox.innerHTML = `🔥 AI khuyên: <strong style="color:${isUp ? 'var(--green)' : 'var(--red)'}">${isUp ? 'TĂNG 📈' : 'GIẢM 📉'}</strong><br>Tỉ lệ thắng: ${accuracy}%`;
    }, 1500);
}

// --- 5. LOGIC GIAO DỊCH (BO) ---

function placeBO(direction) {
    if (isBoRunning) return;
    const betAmount = parseFloat(document.getElementById('bo-amount').value);

    if (isNaN(betAmount) || betAmount < 1) return alert("Cược tối thiểu $1");
    if (betAmount > state.usdBalance) return alert("Số dư không đủ!");

    state.usdBalance -= betAmount;
    isBoRunning = true;
    currentBetDirection = direction;
    betEntryPrice = currentPrice;

    document.querySelectorAll('.btn-huge, #btn-predict').forEach(b => b.disabled = true);
    const progressBar = document.getElementById('countdown-bar');
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';

    setTimeout(() => {
        progressBar.style.transition = 'width 5s linear';
        progressBar.style.width = '0%';
    }, 50);

    let timeLeft = 5;
    const countdown = setInterval(() => {
        timeLeft--;
        document.getElementById('bo-status').innerHTML = `Kết quả sau: ${timeLeft}s<br>Vào lệnh: ${betEntryPrice.toFixed(2)}`;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            resolveBO(direction, betAmount, betEntryPrice);
        }
    }, 1000);
    updateUI();
}

function resolveBO(direction, betAmount, entryPrice) {
    const exitPrice = currentPrice;
    let isWin = false, isTie = false, resultText = 'HÒA', profit = 0;

    if (exitPrice > entryPrice) {
        state.dotHistory.push('up');
        if (direction === 'UP') isWin = true;
    } else if (exitPrice < entryPrice) {
        state.dotHistory.push('down');
        if (direction === 'DOWN') isWin = true;
    } else {
        state.dotHistory.push('tie');
        isTie = true;
    }

    if (state.dotHistory.length > 56) state.dotHistory.shift();
    let note = activeAIPrediction ? "Dùng Bot AI " + activeAIPrediction : "Cược tay";

    if (isWin) {
        winSound.play().catch(e => console.log("Sound block"));
        profit = betAmount * 0.95;
        state.usdBalance += (betAmount + profit);
        state.realizedPnL += profit;
        resultText = "THẮNG";
        showFloatingText(`+$${profit.toFixed(2)}`, 'var(--green)');
    } else if (isTie) {
        state.usdBalance += betAmount;
        resultText = "HÒA";
    } else {
        loseSound.play().catch(e => console.log("Sound block"));
        profit = -betAmount;
        state.realizedPnL -= betAmount;
        resultText = "THUA";
        showFloatingText(`-$${betAmount}`, 'var(--red)');
    }

    state.history.unshift({ action: direction, amount: profit, price: entryPrice, result: resultText, time: new Date().toLocaleTimeString() });
    state.totalVolume += betAmount;

    sendToGoogleSheets(`Cược ${direction}`, betAmount, resultText, profit.toFixed(2), state.usdBalance.toFixed(2), note);

    isBoRunning = false;
    activeAIPrediction = null;
    document.querySelectorAll('.btn-huge, #btn-predict').forEach(b => b.disabled = false);
    saveData();
    updateUI();
}

// --- 6. CẬP NHẬT GIAO DIỆN ---

function updateUI() {
    const fmt = (n) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById('usd-balance').innerText = fmt(state.usdBalance);
    document.getElementById('total-asset').innerText = fmt(state.usdBalance);

    const pnlEl = document.getElementById('realized-pnl');
    pnlEl.innerText = fmt(state.realizedPnL);
    pnlEl.style.color = state.realizedPnL >= 0 ? 'var(--green)' : 'var(--red)';

    // --- BẮT ĐẦU CẬP NHẬT LOGIC VIP TỚI 1 TỶ USD ---
    let vip = "VIP 0", color = "var(--text-muted)";
    const vol = state.totalVolume;

    if (vol >= 1000000000) { vip = "VIP MAX (VÔ CỰC)"; color = "#ff00ff"; } // 1 Tỷ USD
    else if (vol >= 100000000) { vip = "VIP 9 (Chúa Tể)"; color = "#ff4500"; } // 100 Triệu USD
    else if (vol >= 10000000) { vip = "VIP 8 (Huyền Thoại)"; color = "#ff8c00"; } // 10 Triệu USD
    else if (vol >= 1000000) { vip = "VIP 7 (Thách Đấu)"; color = "#ffd700"; } // 1 Triệu USD
    else if (vol >= 500000) { vip = "VIP 6 (Tinh Anh)"; color = "#00fa9a"; } // 500 Ngàn USD
    else if (vol >= 100000) { vip = "VIP 5 (Kim Cương)"; color = "#00ffff"; } // 100 Ngàn USD
    else if (vol >= 50000) { vip = "VIP 4 (Bạch Kim)"; color = "#dda0dd"; } // 50 Ngàn USD
    else if (vol >= 20000) { vip = "VIP 3 (Vàng)"; color = "var(--accent)"; } // 20 Ngàn USD
    else if (vol >= 10000) { vip = "VIP 2 (Bạc)"; color = "#c0c0c0"; } // 5 Ngàn USD
    else if (vol >= 1000) { vip = "VIP 1 (Đồng)"; color = "#cd7f32"; } // 1 Ngàn USD

    // Cập nhật lên Logo góc trái (Thêm in đậm font-weight:bold cho đẹp)
    document.querySelector('.logo').innerHTML = `💎 NMT BO - <span style="color:${color}; font-size:12px; font-weight:bold;">${vip}</span>`;
    // --- KẾT THÚC CẬP NHẬT LOGIC VIP ---

    document.getElementById('dot-history').innerHTML = state.dotHistory.map(d => `<div class="dot ${d}"></div>`).join('');
    document.getElementById('history-body').innerHTML = state.history.slice(0, 15).map(h => `
        <div class="hist-item ${h.result === 'THẮNG' ? 'win' : (h.result === 'THUA' ? 'loss' : '')}">
            <div class="hist-left"><strong>${h.action}</strong><small>${h.time}</small></div>
            <div class="hist-right">${h.amount >= 0 ? '+' : ''}${h.amount.toFixed(2)}</div>
        </div>
    `).join('');
}

function showFloatingText(text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.color = color; el.innerText = text;
    document.getElementById('floating-container').appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// --- 7. NẠP TIỀN (FIXED LOGIC) ---

function openDepositModal() {
    document.getElementById('deposit-modal').style.display = 'flex';
    backToStep1(); // Luôn bắt đầu từ bước 1
}

function closeDepositModal() {
    document.getElementById('deposit-modal').style.display = 'none';
}

function calculateVND() {
    const usd = document.getElementById('deposit-amount').value;
    const vnd = usd * EXCHANGE_RATE;
    document.getElementById('vnd-preview').innerText = vnd.toLocaleString() + " ₫";
}

function goToDepositStep2() {
    const usd = parseFloat(document.getElementById('deposit-amount').value);
    if (isNaN(usd) || usd < 10) return alert("Vui lòng nạp tối thiểu $10");

    const vndAmount = usd * EXCHANGE_RATE;
    const memo = "NAPUSD" + Math.floor(1000 + Math.random() * 9000);

    // Cập nhật thông tin QR
    document.getElementById('qr-vnd-amount').innerText = vndAmount.toLocaleString() + " ₫";
    document.getElementById('qr-memo').innerText = memo;

    // Sử dụng API tạo QR động (Ví dụ VietQR giả lập)
    document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=STK:123456789|Amount:${vndAmount}|Memo:${memo}`;

    document.getElementById('deposit-step-1').style.display = 'none';
    document.getElementById('deposit-step-2').style.display = 'block';
}

function backToStep1() {
    document.getElementById('deposit-step-1').style.display = 'block';
    document.getElementById('deposit-step-2').style.display = 'none';
    document.getElementById('deposit-loader').style.display = 'none';
}

function processDeposit() {
    const usd = parseFloat(document.getElementById('deposit-amount').value);
    const btnConfirm = document.getElementById('btn-confirm-deposit');
    const loader = document.getElementById('deposit-loader');

    btnConfirm.disabled = true;
    loader.style.display = 'block';

    // Giả lập quét giao dịch trong 2 giây
    setTimeout(() => {
        state.usdBalance += usd;
        state.history.unshift({
            action: 'NẠP',
            amount: usd,
            price: '-',
            result: 'THẮNG',
            time: new Date().toLocaleTimeString()
        });

        sendToGoogleSheets('NẠP TIỀN', usd, 'THÀNH CÔNG', `+${usd}`, state.usdBalance.toFixed(2), "Nạp qua QR");

        saveData();
        updateUI();
        closeDepositModal();
        showFloatingText(`+$${usd}`, 'var(--green)');

        btnConfirm.disabled = false;
        loader.style.display = 'none';
        document.getElementById('deposit-amount').value = '';
    }, 2000);
}

function resetAccount() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và khôi phục về $10,000?")) {
        state = {
            usdBalance: 0.00,
            realizedPnL: 0,
            history: [],
            dotHistory: [],
            winStreak: 0,
            currentStreakType: null,
            totalVolume: 0
        };
        saveData();
        updateUI();
        alert("Đã khôi phục dữ liệu gốc.");
    }
}

function setQuickBet(amt) {
    document.getElementById('bo-amount').value = (amt === 'ALL') ? Math.floor(state.usdBalance) : amt;
    updateExpectedProfit();
}

function updateExpectedProfit() {
    const amt = parseFloat(document.getElementById('bo-amount').value) || 0;
    const profit = amt * 1.95;
    document.getElementById('expected-profit-text').innerText = "$" + profit.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function switchSidebarTab(tabId) {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

// KHỞI ĐỘNG
loadData();
setInterval(simulateMarket, 1000);
setInterval(generateFakeBet, 2500);
// --- HỆ THỐNG ĐĂNG NHẬP & BẢO MẬT ---
function logOut() {
    localStorage.removeItem('nmt_session');
    window.location.href = 'login.html';
}

// Khởi tạo tên người dùng lên Header
if (document.getElementById('user-display')) {
    const session = JSON.parse(localStorage.getItem('nmt_session'));
    document.getElementById('user-display').innerText = session ? session.name : "Khách";
}

// Logic Khóa mật khẩu tính năng nạp tiền
function checkAdminBeforeDeposit() {
    const session = JSON.parse(localStorage.getItem('nmt_session'));
    // Nếu là Admin thì cho mở luôn
    if (session && session.role === 'admin') {
        openDepositModal();
    } else {
        // Nếu không phải admin, hiện bảng yêu cầu nhập pass phụ
        document.getElementById('admin-secret-key').value = '';
        document.getElementById('admin-auth-modal').style.display = 'flex';
    }
}

function verifyAdminKey() {
    const key = document.getElementById('admin-secret-key').value;
    if (key === "adminnạp") { // MẬT KHẨU BÍ MẬT ĐỂ MỞ TÍNH NĂNG NẠP (Có thể tự đổi)
        document.getElementById('admin-auth-modal').style.display = 'none';
        openDepositModal();
    } else {
        alert("❌ Mật khẩu quản trị sai! Bạn không có quyền nạp tiền.");
    }
}
// --- LOGIC KHÓA BOT AI ---
function checkBotAIAccess() {
    const session = JSON.parse(localStorage.getItem('nmt_session'));

    // Admin được vào thẳng
    if (session && session.role === 'admin') {
        window.open('bot.html', '_blank');
    } else {
        // Người chơi thường bị bật bảng hỏi mật khẩu
        document.getElementById('ai-secret-key').value = '';
        document.getElementById('ai-auth-modal').style.display = 'flex';
    }
}

function verifyAIPassword() {
    const key = document.getElementById('ai-secret-key').value;
    // Mật khẩu kích hoạt Bot AI cho User (bạn có thể tự đổi)
    if (key === "botvip2026") {
        document.getElementById('ai-auth-modal').style.display = 'none';
        window.open('bot.html', '_blank');
    } else {
        alert("❌ Mã kích hoạt không hợp lệ!");
    }
}