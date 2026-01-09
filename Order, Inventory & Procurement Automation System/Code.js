function processOrders() {

  // ---------- LOCK (PREVENT CONCURRENT RUNS) ----------
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Process already running");
    return;
  }

  try {

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ---------- SHEETS ----------
    var orderSheet     = ss.getSheetByName("Order_Entry");
    var inventorySheet = ss.getSheetByName("Inventory_Master");
    var statusSheet    = ss.getSheetByName("Order_Status");
    var profitSheet    = ss.getSheetByName("Profit_Report");
    var logSheet       = ss.getSheetByName("Audit_Log");
    var configSheet    = ss.getSheetByName("Config");

    // ---------- READ DATA ----------
    var orders        = orderSheet.getDataRange().getValues();
    var inventoryData = inventorySheet.getDataRange().getValues();
    var statusData    = statusSheet.getDataRange().getValues();
    var configData    = configSheet.getDataRange().getValues();

    // ---------- LOAD CONFIG ----------
    var config = {};
    for (var i = 1; i < configData.length; i++) {
      config[configData[i][0]] = configData[i][1];
    }

    var LOW_STOCK_THRESHOLD   = Number(config.LOW_STOCK_THRESHOLD) || 5;
    var ALERT_EMAIL           = config.ALERT_EMAIL || Session.getActiveUser().getEmail();
    var ALERT_COOLDOWN_HOURS  = Number(config.ALERT_COOLDOWN_HOURS) || 12;

    // ---------- INVENTORY MAP ----------
    var inventoryMap = {};
    for (var i = 1; i < inventoryData.length; i++) {
      inventoryMap[inventoryData[i][0]] = {
        stock: Number(inventoryData[i][1]),
        cost:  Number(inventoryData[i][2]),
        row:   i + 1
      };
    }

    // ---------- PROCESSED ORDER IDS ----------
    var processedOrders = {};
    for (var i = 1; i < statusData.length; i++) {
      processedOrders[statusData[i][0]] = true;
    }

    // ---------- BATCH BUFFERS ----------
    var statusRows = [];
    var profitRows = [];
    var logRows = [];
    var inventoryUpdates = [];
    var processedMarks = [];

    // ---------- PROCESS ORDERS ----------
    for (var i = 1; i < orders.length; i++) {

      try {
        var orderId   = orders[i][0];
        var product   = orders[i][2];
        var quantity  = Number(orders[i][3]);
        var price     = Number(orders[i][4]);
        var processed = orders[i][5];

        if (!orderId || processed === "YES") continue;

        // Duplicate order
        if (processedOrders[orderId]) {
          statusRows.push([orderId, "REJECTED", "Duplicate Order ID", new Date()]);
          logRows.push([new Date(), "Duplicate Order", orderId]);
          continue;
        }

        // Product validation
        if (!inventoryMap[product]) {
          statusRows.push([orderId, "REJECTED", "Product Not Found", new Date()]);
          continue;
        }

        // Stock validation
        if (inventoryMap[product].stock < quantity) {
          statusRows.push([orderId, "REJECTED", "Insufficient Stock", new Date()]);
          continue;
        }

        // Financials
        var revenue = quantity * price;
        var cost    = quantity * inventoryMap[product].cost;
        var profit  = revenue - cost;

        // Inventory update
        var newStock = inventoryMap[product].stock - quantity;
        inventoryMap[product].stock = newStock;

        inventoryUpdates.push({
          row: inventoryMap[product].row,
          stock: newStock
        });

        // Outputs
        profitRows.push([orderId, revenue, cost, profit, new Date()]);
        statusRows.push([orderId, "COMPLETED", "Success", new Date()]);
        processedMarks.push(i + 1);

        logRows.push([new Date(), "Order Processed", orderId + " | Profit: " + profit]);

      } catch (err) {
        logRows.push([new Date(), "ERROR", "Row " + (i + 1) + ": " + err.message]);
      }
    }

    // ---------- WRITE RESULTS ----------
    if (statusRows.length)
      statusSheet.getRange(statusSheet.getLastRow() + 1, 1, statusRows.length, 4).setValues(statusRows);

    if (profitRows.length)
      profitSheet.getRange(profitSheet.getLastRow() + 1, 1, profitRows.length, 5).setValues(profitRows);

    if (logRows.length)
      logSheet.getRange(logSheet.getLastRow() + 1, 1, logRows.length, 3).setValues(logRows);

    inventoryUpdates.forEach(function(u) {
      inventorySheet.getRange(u.row, 2).setValue(u.stock);
    });

    processedMarks.forEach(function(r) {
      orderSheet.getRange(r, 6).setValue("YES");
    });

    // ---------- LOW STOCK ALERTS ----------
    checkLowStockAlerts(inventoryMap, {
      threshold: LOW_STOCK_THRESHOLD,
      email: ALERT_EMAIL,
      cooldownHours: ALERT_COOLDOWN_HOURS
    });

  } finally {
    lock.releaseLock();
  }
}

/******************************************************
 * LOW STOCK ALERT SYSTEM
 ******************************************************/
function checkLowStockAlerts(inventoryMap, config) {

  var ss = SpreadsheetApp.getActive();
  var alertSheet = ss.getSheetByName("Alert_Log");

  if (!alertSheet) {
    alertSheet = ss.insertSheet("Alert_Log");
    alertSheet.appendRow(["Timestamp", "Product", "Stock", "Type"]);
  }

  var alerts = alertSheet.getDataRange().getValues();
  var sentAlerts = {};

  for (var i = 1; i < alerts.length; i++) {
    sentAlerts[alerts[i][1]] = new Date(alerts[i][0]).getTime();
  }

  var now = Date.now();
  var cooldownMs = config.cooldownHours * 60 * 60 * 1000;

  for (var product in inventoryMap) {
    var stock = inventoryMap[product].stock;

    if (stock > config.threshold) continue;

    if (sentAlerts[product] && (now - sentAlerts[product]) < cooldownMs) continue;

    sendLowStockEmail(product, stock, config.email);

    alertSheet.appendRow([new Date(), product, stock, "LOW_STOCK"]);
  }
}

function sendLowStockEmail(product, stock, email) {

  MailApp.sendEmail({
    to: email,
    subject: "Low Stock Alert: " + product,
    body:
      "Product: " + product +
      "\nCurrent Stock: " + stock +
      "\n\nPlease replenish inventory."
  });
}

/******************************************************
 * TRIGGERS & UI
 ******************************************************/
function triggerProcessOrders(e) {
  if (e && e.range && e.range.getSheet().getName() !== "Order_Entry") return;
  processOrders();
}

function createOnEditTrigger() {
  ScriptApp.newTrigger("triggerProcessOrders")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
}

function createTimeTrigger() {
  ScriptApp.newTrigger("processOrders")
    .timeBased()
    .everyMinutes(15)
    .create();
}

function setupAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  createOnEditTrigger();
  createTimeTrigger();

  SpreadsheetApp.getUi().alert("Triggers created successfully.");
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🛠 Order Automation")
    .addItem("▶ Process Orders Now", "processOrders")
    .addSeparator()
    .addItem("🔁 Rebuild Triggers", "setupAllTriggers")
    .addToUi();
}
