/**
 * DataVault — request handler
 * ---------------------------------------------------------
 * Receives a data request from the website form, appends a row
 * to the bound Google Sheet (your "Excel"), and emails a
 * notification to the owner.
 *
 * SETUP (one time):
 *  1. Create a new Google Sheet. Rename tab to "Requests" (optional).
 *  2. Extensions ▸ Apps Script. Delete the default code, paste this in.
 *  3. Set NOTIFY_EMAIL below (already set).
 *  4. Deploy ▸ New deployment ▸ type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Copy the Web app URL → paste into script.js as ENDPOINT_URL.
 *  6. Run setupHeaders() once (from the editor) to write column titles.
 * ---------------------------------------------------------
 */

var NOTIFY_EMAIL = "kanishkamps11c@gmail.com";
var SHEET_NAME   = "Requests";

var HEADERS = [
  "Timestamp", "Request ID", "Full Name", "Phone", "Email",
  "Occupation / Company", "Data Category", "Quantity",
  "Target Region", "Budget", "Specific Requirement", "Source Page", "Status"
];

/** Run once from the editor to create the header row. */
function setupHeaders() {
  var sheet = getSheet();
  sheet.clear();
  sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet();
    if (sheet.getLastRow() === 0) setupHeaders();

    var now = new Date();
    var requestId = "DV-" + Utilities.formatDate(now, "GMT+5:30", "yyyyMMdd") +
                    "-" + Math.floor(1000 + Math.random() * 9000);

    sheet.appendRow([
      Utilities.formatDate(now, "GMT+5:30", "yyyy-MM-dd HH:mm:ss"),
      requestId,
      data.name || "",
      data.phone || "",
      data.email || "",
      data.occupation || "",
      data.category || "",
      data.quantity || "",
      data.region || "",
      data.budget || "",
      data.requirement || "",
      data.page || "",
      "New"
    ]);

    sendNotification(requestId, data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: requestId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendNotification(requestId, d) {
  var subject = "🔔 New DataVault request — " + (d.category || "Data") + " (" + requestId + ")";

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e4dccd;border-radius:12px;overflow:hidden">' +
      '<div style="background:#101a2b;color:#fff;padding:18px 22px">' +
        '<h2 style="margin:0;font-size:18px">New data request</h2>' +
        '<p style="margin:4px 0 0;color:#d8b877;font-size:13px;letter-spacing:1px">' + requestId + '</p>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px;color:#101a2b">' +
        row("Name", d.name) +
        row("Phone", d.phone) +
        row("Email", d.email) +
        row("Occupation", d.occupation) +
        row("Category", d.category) +
        row("Quantity", d.quantity) +
        row("Region", d.region) +
        row("Budget", d.budget) +
        row("Requirement", d.requirement) +
      '</table>' +
      '<div style="padding:14px 22px;background:#f6f2ea;font-size:12px;color:#5d6473">' +
        'Logged to your DataVault sheet. Reply to the customer within one business day.' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: subject,
    htmlBody: html,
    replyTo: d.email || NOTIFY_EMAIL
  });
}

function row(label, value) {
  return '<tr>' +
    '<td style="padding:9px 22px;border-bottom:1px solid #eee;font-weight:bold;width:130px;vertical-align:top">' + label + '</td>' +
    '<td style="padding:9px 22px;border-bottom:1px solid #eee">' + (value || "—") + '</td>' +
  '</tr>';
}

/** Optional: lets you open the URL in a browser to confirm it's live. */
function doGet() {
  return ContentService.createTextOutput("DataVault endpoint is live.");
}
