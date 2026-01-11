
<img width="981" height="878" alt="Screenshot 2026-01-11 at 10 26 31 AM" src="https://github.com/user-attachments/assets/6275ca1e-0c06-4fe3-a3f9-735528c54ff0" />

COMPLETE PROJECT FLOW (SIMPLE POINTS)
1️⃣ Customer Places an Order

A customer order is entered into Order_Entry sheet

Order contains:

Order ID

Customer region

Product

Quantity

Selling price

At this point:

Nothing is processed

No stock is touched

👉 This is like orders written in a sales register

2️⃣ Order Processing Script Runs

Script scans Order_Entry

Picks only orders where:

Processed is empty

Already processed orders are skipped

👉 Prevents double processing

3️⃣ System Locks Inventory

Script takes a lock

Ensures:

Only one script can update stock at a time

👉 Like one person holding the warehouse keys

4️⃣ Product Validation

For each order:

Checks if product exists in Inventory

If product does not exist:

Order is Rejected

Reason logged

👉 No fake or invalid products allowed

5️⃣ Region-Based Warehouse Selection

System checks customer region

Picks warehouses in priority order for that region

Example:

NORTH → WH-N1 → WH-C1 → WH-S1

👉 Closest warehouse first

6️⃣ Stock Availability Check

System checks:

Available stock in selected warehouses

Total available stock is calculated

Cases:

Stock ≥ order qty → Full fulfillment

Stock < order qty → Partial fulfillment

Stock = 0 → Order rejected

👉 No overselling

7️⃣ Inventory Deduction

Stock is deducted:

Warehouse by warehouse

In priority order

Inventory sheet is updated immediately

👉 Like crossing numbers in stock register

8️⃣ Fulfillment Record Created

System records:

Which warehouse supplied how much

Stored in Fulfillment / Movement Log

👉 Complete traceability

9️⃣ Order Status Update

Order marked as:

COMPLETED

PARTIAL

REJECTED

Processed = YES

👉 Order lifecycle is closed

🔟 Profit Calculation

Revenue = Quantity × Selling Price

Cost = Quantity × Product Cost

Profit = Revenue − Cost

Stored in reports/logs

👉 Business visibility

1️⃣1️⃣ Inventory Monitoring Starts

After order processing:

System reviews stock levels

Checks:

Minimum stock

Maximum stock

👉 Continuous supervision

1️⃣2️⃣ Auto Stock Transfer Engine Runs

If one warehouse is below minimum

And another is above maximum:

Stock is transferred automatically

Transfer happens in batches

👉 Internal logistics automation

1️⃣3️⃣ Procurement Check Starts

System calculates:

Total stock across all warehouses

Compares with reorder level

👉 Company-wide view (not warehouse-wise)

1️⃣4️⃣ Purchase Order Creation

If stock is below reorder point:

Supplier PO is created

System respects:

MOQ

Lead time

Existing open POs

👉 Smart purchasing, no duplicates

1️⃣5️⃣ Purchase Order Status = OPEN

PO is stored in Purchase_Order sheet

ETA calculated automatically

👉 Supplier commitment recorded

1️⃣6️⃣ Supplier Delivers Goods

Warehouse team enters received quantity

Entry is made in GRN / PO sheet

👉 Goods physically arrive

1️⃣7️⃣ GRN Trigger Fires

On edit:

Inventory is increased

PO received quantity updated

👉 Stock is officially added

1️⃣8️⃣ PO Closure Check

If:

Received Qty = Ordered Qty

Then:

PO status changed to CLOSED

👉 Procurement cycle completed

1️⃣9️⃣ Finance Email Triggered

When PO is fully closed:

Email sent to finance

Contains:

PO ID

Amount payable

Supplier details

👉 Finance pays only after delivery

2️⃣0️⃣ Audit Logging (Always Running)

Every important action is logged:

Order processing

Stock movement

PO creation

PO closure

Errors

👉 Full traceability

2️⃣1️⃣ Alert System (Only When Needed)

Critical issues only:

Script errors

PO closure

Email alerts are sent selectively

👉 No alert fatigue

🏁 FINAL SUMMARY (ONE LINE)

Customer order → smart stock allocation → inventory update → auto rebalancing → auto procurement → GRN → finance notification → full audit.
