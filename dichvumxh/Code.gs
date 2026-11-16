// =========================================================================
// MÃ NGUỒN GOOGLE APPS SCRIPT HOÀN CHỈNH (DÁN VÀO FILE Code.gs)
// Tự động tạo cột, lưu đơn mới (POST) và tra cứu cô lập từng mã đơn (GET)
// =========================================================================

const SHEET_NAME = 'Orders';

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Mã Đơn (id)',
      'Thời Gian (time)',
      'Timestamp (createdAt)',
      'Platform Key',
      'Service Key',
      'Nền Tảng (platformName)',
      'Dịch Vụ (serviceName)',
      'Máy Chủ (serverName)',
      'Link / UID (uid)',
      'Số Lượng (quantity)',
      'Giá Gốc (cost)',
      'Tổng Thanh Toán (retailPrice)',
      'Ghi Chú (note)',
      'Trạng Thái (status)'
    ]);
    sheet.getRange('A1:N1').setFontWeight('bold').setBackground('#dbeafe');
    sheet.setFrozenRows(1);
    sheet.getRange('I:I').setNumberFormat('@');
    sheet.getRange('M:M').setNumberFormat('@');
  }
  return sheet;
}

function sanitizeCellText(val) {
  const str = String(val === undefined || val === null ? '' : val).trim();
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// 1. API TRA CỨU ĐƠN HÀNG BẢO MẬT (CHỈ TRẢ VỀ ĐÚNG MÃ ĐƠN ĐƯỢC HỎI)
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || 'getOrder').trim();
    const orderId = String(params.id || '').trim().replace(/^#/, '').toUpperCase();

    if (action === 'getOrder') {
      if (!orderId) {
        return jsonResponse({ success: false, message: 'Thiếu mã đơn hàng' });
      }

      const sheet = getOrCreateSheet();
      const rows = sheet.getDataRange().getValues();

      for (let i = rows.length - 1; i >= 1; i--) {
        const row = rows[i];
        if (String(row[0]).trim().toUpperCase() === orderId) {
          const orderObj = {
            id: String(row[0]).trim(),
            time: String(row[1]),
            createdAt: Number(row[2]) || Date.now(),
            platformKey: String(row[3]),
            serviceKey: String(row[4]),
            platformName: String(row[5]),
            serviceName: String(row[6]),
            serverName: String(row[7]),
            uid: String(row[8]),
            quantity: Number(row[9]) || 0,
            cost: Number(row[10]) || 0,
            retailPrice: Number(row[11]) || 0,
            note: String(row[12] || ''),
            status: String(row[13] || 'Chờ thanh toán').trim()
          };
          return jsonResponse({ success: true, order: orderObj });
        }
      }
      return jsonResponse({ success: false, message: 'Không tìm thấy mã đơn hàng' });
    }

    return jsonResponse({ success: false, message: 'Hành động không hợp lệ' });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

// 2. API LƯU ĐƠN HÀNG MỚI VÀO GOOGLE SHEETS (MẶC ĐỊNH: CHỜ THANH TOÁN)
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const payload = JSON.parse(rawBody);
    const o = payload.order || payload;

    if (!o || !o.id) {
      return jsonResponse({ success: false, message: 'Dữ liệu đơn hàng không hợp lệ' });
    }

    const sheet = getOrCreateSheet();
    const newRowIndex = sheet.getLastRow() + 1;

    const rowData = [
      sanitizeCellText(o.id).toUpperCase(),
      sanitizeCellText(o.time),
      Number(o.createdAt) || Date.now(),
      sanitizeCellText(o.platformKey),
      sanitizeCellText(o.serviceKey),
      sanitizeCellText(o.platformName),
      sanitizeCellText(o.serviceName),
      sanitizeCellText(o.serverName),
      sanitizeCellText(o.uid),
      Number(o.quantity) || 0,
      Number(o.cost) || 0,
      Number(o.retailPrice) || 0,
      sanitizeCellText(o.note),
      'Chờ thanh toán'
    ];

    sheet.getRange(newRowIndex, 9).setNumberFormat('@');
    sheet.getRange(newRowIndex, 13).setNumberFormat('@');
    sheet.getRange(newRowIndex, 1, 1, rowData.length).setValues([rowData]);

    return jsonResponse({ success: true, orderId: o.id });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}