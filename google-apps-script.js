const RSVP_SHEET = "RSVPs";
const PRAYER_SHEET = "Blessings";

function getSpreadsheet_() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // Fallback if not container-bound
    return SpreadsheetApp.openById("1rw2WDAuwsyQFpg3oEFapb_Kr7T4e9Uv6RwpubyAraS4");
  }
}

function doPost(event) {
  const data = JSON.parse(event.postData.contents || "{}");
  const payload = data.payload || {};

  ensureSheets_();

  if (data.type === "rsvp") {
    appendRsvp_(payload);
  }

  if (data.type === "prayer") {
    appendPrayer_(payload);
  }

  return json_({ ok: true });
}

function doGet(event) {
  ensureSheets_();

  const type = event.parameter.type;
  const callback = event.parameter.callback;
  const rows = type === "prayers" ? readPrayers_() : [];
  const payload = { ok: true, rows };

  if (callback) {
    return ContentService.createTextOutput(
      `${callback}(${JSON.stringify(payload)});`,
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(payload);
}

function ensureSheets_() {
  const spreadsheet = getSpreadsheet_();
  const rsvpSheet = getOrCreateSheet_(spreadsheet, RSVP_SHEET);
  const prayerSheet = getOrCreateSheet_(spreadsheet, PRAYER_SHEET);

  setHeaders_(rsvpSheet, [
    "Timestamp",
    "Name",
    "Phone",
    "Guests",
    "Attendance",
    "Message",
  ]);
  setHeaders_(prayerSheet, ["Timestamp", "Name", "Prayer"]);
}

function appendRsvp_(payload) {
  const sheet = getSpreadsheet_().getSheetByName(RSVP_SHEET);
  sheet.appendRow([
    new Date(),
    payload.name || "",
    payload.phone || "",
    payload.guests || "",
    payload.attendance || "",
    payload.note || "",
  ]);
}

function appendPrayer_(payload) {
  const sheet = getSpreadsheet_().getSheetByName(PRAYER_SHEET);
  sheet.appendRow([new Date(), payload.name || "Guest", payload.text || ""]);
}

function readPrayers_() {
  const sheet = getSpreadsheet_().getSheetByName(PRAYER_SHEET);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, 3)
    .getValues()
    .reverse()
    .map((row, index) => ({
      id: `sheet-${index}-${row[0]}`,
      name: row[1] || "Guest",
      text: row[2] || "",
      createdAt: row[0],
    }))
    .filter((row) => row.text);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function setHeaders_(sheet, headers) {
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = headers.every((header, index) => current[index] === header);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
