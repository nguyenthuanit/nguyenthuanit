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

  // 2. LẤY SỐ DƯ CÁ NHÂN (Sheet data)
  if (action === "GET_BALANCE") {
    var dataRows = sheetData.getDataRange().getValues();
    var currentBalance = 0; 
    for (var j = dataRows.length - 1; j > 0; j--) {
      if (dataRows[j][7] == id) { 
        currentBalance = parseFloat(dataRows[j][5]) || 0; 
        break;
      }
    }
    return respond({status: "success", balance: currentBalance});
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