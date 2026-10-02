# QLESS — MySQL Workbench College Presentation Guide

This guide gives you the exact steps to open, run, and demonstrate the **QLESS** database in **MySQL Workbench 8.0** in front of your professors and evaluators.

---

## 1. Quick Setup in MySQL Workbench (1-Click)

1. Open **MySQL Workbench 8.0** on your computer.
2. Under **MySQL Connections**, click **Local instance MySQL80** (or your active local connection) and enter your MySQL password.
3. In the top menu, go to **File -> Open SQL Script...** (or press `Ctrl + Shift + O`).
4. Select `qless\database\schema.sql`:
   - Click the **Yellow Lightning Bolt ⚡ icon** on the toolbar to execute.
   - This creates `qless_db` with all 10 relational tables, foreign key constraints, indexes, and 3 analytical views.
5. In the top menu, go to **File -> Open SQL Script...** again.
6. Select `qless\database\seed.sql`:
   - Click the **Yellow Lightning Bolt ⚡ icon** to execute.
   - This populates real-world data across **6 industries** (Hospital, Restaurant, Temple, Bank, Salon, Diagnostic Lab).
7. In the left sidebar under **Schemas**, right-click and click **Refresh All**. You will see `qless_db` with all tables and views!

---

## 2. Generating the Visual ER Diagram (Impresses Professors!)

In MySQL Workbench, you can generate a professional visual Entity-Relationship (EER) diagram in 10 seconds:

1. Click **Database** in the top menu -> **Reverse Engineer...** (or press `Ctrl + R`).
2. Click **Next** -> **Next**.
3. Select `qless_db` from the database list -> Click **Next** -> **Execute**.
4. Click **Next** -> **Finish**.
5. **Boom!** A full relational EER diagram with foreign key relationship lines connecting `organizations`, `locations`, `services`, `counters`, `tokens`, and `payments` will appear on your screen!

---

## 3. Demo Queries to Run During Your Presentation

Keep these queries handy in a query tab in MySQL Workbench during your demo:

### Query 1: Show Live Universal Queue Status
Shows the live waiting count and dynamic wait times calculated per service across industries:
```sql
USE qless_db;
SELECT 
    organization_name, 
    business_type, 
    service_name, 
    waiting_count, 
    called_count, 
    serving_count, 
    estimated_wait_minutes, 
    active_counters_count
FROM v_live_queue_metrics;
```

### Query 2: Show Real-Time Token Movement
When you click "Call Next" on the web app, run this query in Workbench to show the row changing to `CALLED` and `called_time` populated:
```sql
SELECT 
    token_display, 
    customer_name, 
    status, 
    priority_level, 
    check_in_time, 
    called_time, 
    qr_code_hash
FROM tokens
ORDER BY check_in_time DESC;
```

### Query 3: Startup Financial Ledger & Commission Engine
Demonstrates startup monetization: shows gross fees, QLESS platform commission (e.g. 2.5% to 5.0%), and net vendor payouts:
```sql
SELECT * FROM v_financial_commission_summary;
```

### Query 4: Counter Operator Speed Metrics
Shows how staff operators are performing and average service minutes:
```sql
SELECT * FROM v_counter_productivity;
```
