# QLESS — Universal Real-Time Queue Infrastructure Platform

> **"JOIN THE QUEUE. NOT THE CROWD."**

QLESS is a universal, full-stack queue infrastructure platform connecting physical and digital queues, wait-time prediction, real-time counter operations, walk-in kiosks, geospatial discovery, and startup commission ledgers.

---

## 🚀 Quick Start (Run Locally for Your College Presentation)

You can run the entire platform with one single command:

```bash
# In the root 'qless' folder:
npm run dev
```

This starts:
1. **Backend Engine**: `http://localhost:5000` (Express + Socket.io + REST APIs)
2. **Frontend Website**: `http://localhost:5173` (Vite + React + Tailwind CSS)

Simply open **`http://localhost:5173`** in your browser!

---

## 🗄️ MySQL Workbench Database Setup (1-Click)

The database schema and seeds are located in the `database/` folder:

1. Open **MySQL Workbench 8.0** and connect to your local MySQL server (`Local instance MySQL80`).
2. Go to **File -> Open SQL Script...** and select `database/schema.sql`.
   - Click the **Yellow Lightning Bolt ⚡ icon** to execute and create `qless_db` with all tables, foreign keys, and analytical views.
3. Go to **File -> Open SQL Script...** and select `database/seed.sql`.
   - Click the **Yellow Lightning Bolt ⚡ icon** to populate real data across **6 industries** (Hospitals, Cafes, Temples, Banks, Salons, Diagnostic Labs).
4. In MySQL Workbench, go to **Database -> Reverse Engineer...** to view the relational EER diagram!

---

## 📱 Live Demonstration Script for College Faculty

### Step 1: Open Two Windows Side-by-Side
- **Window 1 (Customer View)**: Open `http://localhost:5173` -> Click **"Live Token Pass"** tab.
- **Window 2 (Staff Station)**: Open `http://localhost:5173` in an incognito window -> Click **"Staff Station"** tab.

### Step 2: 1-Click Real-Time Calling Demo
- In **Window 2 (Staff)**, click the big button: **CALL NEXT TOKEN**.
- **Listen**: A high-definition airport/hospital sound chime dings, followed by an announcement!
- **Watch**: Within `< 50ms`, **Window 1 (Customer)** instantly flashes **"YOU ARE BEING CALLED! Proceed to Desk 01"** via WebSockets!

### Step 3: Show Physical Kiosk Mode
- Click the **"Venue Kiosk"** tab on the navigation bar.
- Shows touch-screen ticket dispenser with instant QR generation and thermal ticket replica.

### Step 4: Show Startup Analytics & Monetization
- Click the **"Analytics & Payouts"** tab.
- Displays hourly queue surge curves, category volume breakdown, and ACID commission ledger showing how QLESS earns revenue per transaction.

### Step 5: Show MySQL Workbench Live Query
- Switch to MySQL Workbench and run:
  ```sql
  SELECT organization_name, service_name, waiting_count, estimated_wait_minutes
  FROM v_live_queue_metrics;
  ```
- Show your professors that the database updates in real time!
