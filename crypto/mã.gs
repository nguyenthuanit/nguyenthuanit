/**
 * NMT VIP BO - BACKEND GOOGLE APPS SCRIPT (VERSION FULL)
 * Hỗ trợ: Đăng ký, Đăng nhập, Giao dịch, Bot AI, Ngân hàng trung tâm.
 */

function doPost(e) {
  // 1. Kiểm tra dữ liệu đầu vào
  if (!e || !e.postData || !e.postData.contents) {
    return respond({status: "error", message: "Không có dữ liệu gửi lên"});
  }

  // 2. KÍCH HOẠT LOCK SERVICE để bảo vệ dữ liệu khi nhiều người dùng cùng lúc
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Đợi tối đa 10 giây
  } catch (e) {
    return respond({status: "error", message: "Hệ thống bận, thử lại sau!"});
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetTaiKhoan = ss.getSheetByName("taikhoan");
    var sheetData = ss.getSheetByName("data");
    
    // Kiểm tra xem các sheet đã tồn tại chưa
    if (!sheetTaiKhoan || !sheetData) {
      return respond({status: "error", message: "Thiếu Sheet 'taikhoan' hoặc 'data'!"});
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var id = data.id;

    // --- CHỨC NĂNG ĐĂNG KÝ (REGISTER) ---
    if (action === "REGISTER") {
      var tkRows = sheetTaiKhoan.getDataRange().getValues();
      for (var i = 1; i < tkRows.length; i++) {
        if (tkRows[i][0] == id) return respond({status: "error", message: "ID này đã tồn tại!"});
      }
      // Lưu: ID (A), Pass (B), Recovery (C), Giọt nước (D)
      sheetTaiKhoan.appendRow([id, data.pass, data.recovery, "[]"]);
      // Khởi tạo dòng tiền $0 để hệ thống nhận diện số dư ban đầu
      sheetData.appendRow([new Date().toLocaleString("vi-VN"), "ĐĂNG KÝ", 0, "THÀNH CÔNG", 0, 0, "Khởi tạo TK", id]);
      return respond({status: "success"});
    }

    // --- CHỨC NĂNG ĐĂNG NHẬP (LOGIN) ---
    if (action === "LOGIN") {
      var tkRows = sheetTaiKhoan.getDataRange().getValues();
      for (var i = 1; i < tkRows.length; i++) {
        if (tkRows[i][0] == id && tkRows[i][1] == data.pass) {
          return respond({status: "success"});
        }
      }
      return respond({status: "error", message: "ID hoặc Mật khẩu không đúng!"});
    }

    // --- LẤY LẠI MẬT KHẨU (RESET_PASS) ---
    if (action === "RESET_PASS") {
      var tkRows = sheetTaiKhoan.getDataRange().getValues();
      for (var i = 1; i < tkRows.length; i++) {
        if (tkRows[i][0] == id && tkRows[i][2] == data.recovery) {
          sheetTaiKhoan.getRange(i + 1, 2).setValue(data.newPass);
          return respond({status: "success"});
        }
      }
      return respond({status: "error", message: "Mã bí mật không chính xác!"});
    }

    // --- LẤY SỐ DƯ VÀ LỊCH SỬ (GET_BALANCE) ---
    if (action === "GET_BALANCE") {
      var dataRows = sheetData.getDataRange().getValues();
      var currentBalance = 0; 
      var userHistory = [];
      var foundBalance = false;

      // Quét từ dưới lên để lấy số dư mới nhất
      for (var j = dataRows.length - 1; j > 0; j--) {
        if (dataRows[j][7] == id) {
          if (!foundBalance) {
            currentBalance = parseFloat(dataRows[j][5]) || 0; 
            foundBalance = true;
          }
          if (userHistory.length < 15) {
            userHistory.push({
              time: dataRows[j][0],
              action: dataRows[j][1],
              amount: parseFloat(dataRows[j][4]) || parseFloat(dataRows[j][2]) || 0,
              result: dataRows[j][3]
            });
          }
        }
      }

      // Lấy mảng giọt nước
      var savedDots = [];
      var tkRows = sheetTaiKhoan.getDataRange().getValues();
      for (var i = 1; i < tkRows.length; i++) {
        if (tkRows[i][0] == id) {
          var dotData = tkRows[i][3];
          if (dotData) try { savedDots = JSON.parse(dotData); } catch(e) {}
          break;
        }
      }
      return respond({status: "success", balance: currentBalance, history: userHistory, dotHistory: savedDots});
    }

    // --- LƯU GIAO DỊCH (SAVE_TRANSACTION) ---
    if (action === "SAVE_TRANSACTION") {
      sheetData.appendRow([
        data.time, data.tradeAction, data.amount, data.result, 
        data.pnl, data.balance, data.note, data.id
      ]);
      // Cập nhật giọt nước nếu có gửi kèm
      if (data.dots) {
        var tkRows = sheetTaiKhoan.getDataRange().getValues();
        for (var i = 1; i < tkRows.length; i++) {
          if (tkRows[i][0] == data.id) {
            sheetTaiKhoan.getRange(i + 1, 4).setValue(JSON.stringify(data.dots));
            break;
          }
        }
      }
      return respond({status: "success"});
    }

    // --- BOT AI TOÀN CẦU (GET_BOT_SIGNAL) ---
    if (action === "GET_BOT_SIGNAL") {
      var now = new Date().getTime();
      var lastTime = sheetTaiKhoan.getRange("F1").getValue();
      var currentSignal = sheetTaiKhoan.getRange("E1").getValue();
      if (!lastTime || (now - lastTime > 30000)) {
        currentSignal = Math.random() > 0.5 ? "UP" : "DOWN";
        sheetTaiKhoan.getRange("E1").setValue(currentSignal); 
        sheetTaiKhoan.getRange("F1").setValue(now); 
      }
      return respond({status: "success", signal: currentSignal});
    }

    // --- THỐNG KÊ NGÂN HÀNG (GET_BANK_STATS) ---
    if (action === "GET_BANK_STATS") {
      var dataRows = sheetData.getDataRange().getValues();
      var tkRows = sheetTaiKhoan.getDataRange().getValues();
      var s_in = 0, s_out = 0, s_dep = 0;
      var historyList = [];

      for (var k = dataRows.length - 1; k > 0; k--) {
        var act = dataRows[k][1];
        var amt = parseFloat(dataRows[k][2]) || 0;
        var res = dataRows[k][3];
        var pnl = parseFloat(dataRows[k][4]) || 0;
        
        if (act.indexOf("Cược") > -1) {
          if (res === "THẮNG") s_out += Math.abs(pnl);
          else if (res === "THUA") s_in += amt;
        } else if (act === "NẠP TIỀN") s_dep += amt;
        else if (act === "RÚT TIỀN") s_out += Math.abs(amt);

        if (historyList.length < 50) {
          historyList.push({ time: dataRows[k][0], action: act, amount: amt, result: res, pnl: pnl, id: dataRows[k][7] });
        }
      }
      return respond({
        status: "success", 
        stats: { totalIn: s_in, totalOut: s_out, totalDeposit: s_dep, totalUsers: tkRows.length - 1 },
        history: historyList
      });
    }

    // --- XÓA TÀI KHOẢN (DELETE_ACCOUNT) ---
    if (action === "DELETE_ACCOUNT") {
      var tkRows = sheetTaiKhoan.getDataRange().getValues();
      var userRowIndex = -1;
      for (var i = 1; i < tkRows.length; i++) {
        if (tkRows[i][0] == id) { userRowIndex = i; break; }
      }
      if (userRowIndex === -1) return respond({status: "error", message: "Không tìm thấy tài khoản!"});
      if (tkRows[userRowIndex][1] !== data.pass) return respond({status: "error", message: "Mật khẩu sai!"});
      
      sheetTaiKhoan.deleteRow(userRowIndex + 1);
      var dataRows = sheetData.getDataRange().getValues();
      for (var k = dataRows.length - 1; k > 0; k--) {
        if (dataRows[k][7] == id) sheetData.deleteRow(k + 1);
      }
      return respond({status: "success"});
    }

    return respond({status: "error", message: "Lệnh không hợp lệ"});
  } catch (error) {
    return respond({status: "error", message: "Lỗi hệ thống: " + error.message});
  } finally {
    lock.releaseLock();
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}