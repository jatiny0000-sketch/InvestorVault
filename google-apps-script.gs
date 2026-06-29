/**
 * DataVault — backend (Google Apps Script)
 * ---------------------------------------------------------
 * Two jobs:
 *  1. LEADS  — receives a data request from the form, appends a
 *              row to the Sheet and emails the owner.
 *  2. CONFIG — stores the *shared* site settings the admin edits
 *              (contact, catalog cards, reviews, screenshots,
 *              offer banner, theme) so that EVERY visitor on EVERY
 *              device sees the same live website — not just the
 *              admin's own browser.
 *
 * SETUP (one time):
 *  1. Create a new Google Sheet.
 *  2. Extensions ▸ Apps Script. Delete the default code, paste this in.
 *  3. Set NOTIFY_EMAIL + ADMIN_PASSWORD below (password MUST match
 *     the ADMIN_PASSWORD in script.js).
 *  4. Deploy ▸ New deployment ▸ type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  5. Copy the Web app URL → paste into script.js as CONFIG_ENDPOINT.
 *  6. (Optional) Run setupHeaders() once to write the leads header row.
 * ---------------------------------------------------------
 */

var NOTIFY_EMAIL   = "kanishkamps11c@gmail.com";
// MUST be identical to ADMIN_PASSWORD in script.js, or saving config fails.
var ADMIN_PASSWORD = "Fundo@987654";

var SHEET_NAME  = "Requests";   // leads tab
var CONFIG_SHEET = "Config";    // shared-settings tab (managed automatically)
var CONFIG_CHUNK = 45000;       // chars per cell (cells cap at 50k)

var HEADERS = [
  "Timestamp", "Request ID", "Full Name", "Phone", "Email",
  "Occupation / Company", "Data Category", "Quantity",
  "Target Region", "Budget", "Specific Requirement", "Source Page", "Status"
];

/* =========================================================
   ROUTING
   ========================================================= */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "";
    if (action === "saveConfig") return handleSaveConfig(data);
    if (action === "addReview")  return handleAddReview(data);
    return handleRequest(data);            // default: a lead from the form
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "config") {
    return json({ ok: true, config: readConfig() });
  }
  return ContentService.createTextOutput("DataVault endpoint is live.");
}

/* =========================================================
   CONFIG — shared site settings
   ========================================================= */
function getConfigSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG_SHEET);
  if (!sh) sh = ss.insertSheet(CONFIG_SHEET);
  return sh;
}

/** Read the stored config object (parsed). Returns {} if none/invalid. */
function readConfig() {
  var sh = getConfigSheet();
  var last = sh.getLastRow();
  if (last < 1) return {};
  var vals = sh.getRange(1, 1, last, 1).getValues();
  var s = "";
  for (var i = 0; i < vals.length; i++) s += vals[i][0];
  if (!s) return {};
  try { return JSON.parse(s); } catch (e) { return {}; }
}

/** Persist a config object, chunked down column A so big images fit. */
function writeConfig(cfg) {
  var sh = getConfigSheet();
  var str = JSON.stringify(cfg || {});
  sh.clearContents();
  var chunks = [];
  for (var i = 0; i < str.length; i += CONFIG_CHUNK) {
    chunks.push([str.substr(i, CONFIG_CHUNK)]);
  }
  if (chunks.length) sh.getRange(1, 1, chunks.length, 1).setValues(chunks);
}

/** Admin overwrites the whole settings blob (password-gated). */
function handleSaveConfig(data) {
  if (data.password !== ADMIN_PASSWORD) {
    return json({ ok: false, error: "unauthorized" });
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    writeConfig(data.config || {});
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

/** Public, append-only: a visitor submits a review (awaits approval). */
function handleAddReview(data) {
  var r = data.review || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cfg = readConfig();
    if (!cfg.reviews || cfg.reviews.constructor !== Array) cfg.reviews = [];
    cfg.reviews.push({
      id: "r-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000),
      name: String(r.name || "").slice(0, 80),
      role: String(r.role || "").slice(0, 80),
      rating: Math.max(1, Math.min(5, parseInt(r.rating, 10) || 0)),
      text: String(r.text || "").slice(0, 1000),
      approved: false
    });
    writeConfig(cfg);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true });
}

/* =========================================================
   LEADS — request form (kept from the original backend)
   ========================================================= */
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

function handleRequest(data) {
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
  return json({ ok: true, id: requestId });
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

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
