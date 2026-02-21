function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTaiKhoan = ss.getSheetByName("taikhoan");
  var sheetData = ss.getSheetByName("data");
  
  if (!e || !e.postData || !e.postData.contents) {
    return respond({status: "error", message: "Không có dữ liệu gửi lên"});
  }

  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var id = data.id;
  
  // 1. XỬ LÝ ĐĂNG KÝ/ĐĂNG NHẬP (Sheet taikhoan)
  if (action === "REGISTER" || action === "LOGIN" || action === "RESET_PASS") {
    var tkRows = sheetTaiKhoan.getDataRange().getValues();
    var userRowIndex = -1;
    for (var i = 1; i < tkRows.length; i++) { 
      if (tkRows[i][0] == id) { userRowIndex = i; break; }
    }

    if (action === "REGISTER") {
      if (userRowIndex !== -1) return respond({status: "error", message: "ID này đã có người sử dụng!"});
      sheetTaiKhoan.appendRow([id, data.pass, data.recovery]);
      return respond({status: "success"});
    }
    
    if (action === "LOGIN") {
      if (userRowIndex === -1) return respond({status: "error", message: "Không tìm thấy ID này!"});
      if (tkRows[userRowIndex][1] === data.pass) return respond({status: "success"});
      return respond({status: "error", message: "Sai mật khẩu!"});
    }

    if (action === "RESET_PASS") {
      if (userRowIndex === -1) return respond({status: "error", message: "Không tìm thấy ID này!"});
      if (tkRows[userRowIndex][2] == data.recovery) { 
        sheetTaiKhoan.getRange(userRowIndex + 1, 2).setValue(data.newPass); 
        return respond({status: "success"});
      }
      return respond({status: "error", message: "Mã bí mật không chính xác!"});
    }
  }

  // 2. LẤY SỐ DƯ CÁ NHÂN VÀ LỊCH SỬ (Sheet data)
  if (action === "GET_BALANCE") {
    var dataRows = sheetData.getDataRange().getValues();
    var currentBalance = 0; 
    var userHistory = [];
    var foundBalance = false;

    // Quét từ dưới lên trên để lấy dữ liệu mới nhất
    for (var j = dataRows.length - 1; j > 0; j--) {
      if (dataRows[j][7] == id) { // Cột H là ID người chơi
        
        // Cập nhật số dư dòng cuối cùng tìm thấy
        if (!foundBalance) {
          currentBalance = parseFloat(dataRows[j][5]) || 0; 
          foundBalance = true;
        }

        // Kéo 15 lịch sử gần nhất về web
        if (userHistory.length < 15) {
          var act = dataRows[j][1]; // Tên lệnh (Cược UP, Nạp tiền...)
          var res = dataRows[j][3]; // Kết quả (THẮNG/THUA)
          var pnl = parseFloat(dataRows[j][4]) || parseFloat(dataRows[j][2]) || 0; // Số tiền Lời/Lỗ

          userHistory.push({
            time: dataRows[j][0], // Thời gian
            action: act,
            amount: pnl,
            result: res
          });
        }
      }
    }
    return respond({status: "success", balance: currentBalance, history: userHistory});
  }

  // 3. LƯU LỊCH SỬ GIAO DỊCH (Sheet data)
  if (action === "SAVE_TRANSACTION") {
    sheetData.appendRow([
      data.time, data.tradeAction, data.amount, data.result, 
      data.pnl, data.balance, data.note, data.id
    ]);
    return respond({status: "success"});
  }

  // 4. BOT AI TOÀN CẦU (GLOBAL SIGNAL) (Sheet taikhoan)
  if (action === "GET_BOT_SIGNAL") {
    var now = new Date().getTime();
    var lastTime = sheetTaiKhoan.getRange("F1").getValue();
    var currentSignal = sheetTaiKhoan.getRange("E1").getValue();

    // Cứ 30 giây thay đổi tín hiệu 1 lần
    if (!lastTime || lastTime === "" || (now - lastTime > 30000)) {
      currentSignal = Math.random() > 0.5 ? "UP" : "DOWN";
      sheetTaiKhoan.getRange("E1").setValue(currentSignal); 
      sheetTaiKhoan.getRange("F1").setValue(now); 
    }
    
    return respond({status: "success", signal: currentSignal});
  }

  // 5. LẤY THỐNG KÊ NGÂN HÀNG TRUNG TÂM (Sheet data & taikhoan)
  if (action === "GET_BANK_STATS") {
    var dataRows = sheetData.getDataRange().getValues();
    var tkRows = sheetTaiKhoan.getDataRange().getValues();
    
    var s_in = 0;  var s_out = 0; var s_dep = 0;
    var historyList = [];
    var count = 0;

    for (var k = dataRows.length - 1; k > 0; k--) {
      var act = dataRows[k][1];
      var amt = parseFloat(dataRows[k][2]) || 0;
      var res = dataRows[k][3];
      var pnl = parseFloat(dataRows[k][4]) || 0;
      var pID = dataRows[k][7] || "Ẩn danh";
      var time = dataRows[k][0];

      if (act.indexOf("Cược") > -1) {
        if (res === "THẮNG") { s_out += Math.abs(pnl); }
        else if (res === "THUA") { s_in += amt; }
      } else if (act === "NẠP TIỀN") {
        s_dep += amt;
      } else if (act === "RÚT TIỀN") {
        s_out += Math.abs(amt);
      }

      if (count < 50) {
        historyList.push({ time: time, action: act, amount: amt, result: res, pnl: pnl, id: pID });
        count++;
      }
    }

    return respond({
      status: "success", 
      stats: { totalIn: s_in, totalOut: s_out, totalDeposit: s_dep, totalUsers: tkRows.length - 1 },
      history: historyList
    });
  }

  return respond({status: "error", message: "Lệnh không hợp lệ"});
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}