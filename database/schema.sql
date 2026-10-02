-- ==============================================================================
-- QLESS DATABASE ARCHITECTURE (MySQL 8.0 / MySQL Workbench)
-- "JOIN THE QUEUE. NOT THE CROWD."
--
-- This script initializes the complete relational schema with ACID integrity,
-- foreign keys, performance indexes, analytical views, and stored procedures.
--
-- Usage in MySQL Workbench:
-- 1. Open MySQL Workbench and connect to your MySQL Server instance.
-- 2. Open this file (File -> Open SQL Script...)
-- 3. Click the yellow lightning bolt icon (Execute) to build the database.
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS qless_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE qless_db;

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATIONS (Business Tenants)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS commission_ledgers;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS counter_services;
DROP TABLE IF EXISTS counters;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

CREATE TABLE organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    legal_name VARCHAR(255),
    business_type ENUM(
        'RESTAURANT',
        'HEALTHCARE',
        'RELIGIOUS',
        'BANKING',
        'SALON',
        'GOVERNMENT',
        'RETAIL',
        'EDUCATION',
        'EVENT',
        'OTHER'
    ) NOT NULL DEFAULT 'OTHER',
    tax_id VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    platform_commission_rate DECIMAL(5, 2) DEFAULT 3.50 COMMENT 'Platform commission percentage, e.g. 3.50%',
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    logo_url VARCHAR(500),
    brand_color VARCHAR(20) DEFAULT '#0F172A',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_org_slug (slug),
    INDEX idx_org_verified (is_verified)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 2. USERS (Multi-Role Authentication)
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(36) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    role ENUM('CUSTOMER', 'STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 3. LOCATIONS (Physical Sites / Branches)
-- ------------------------------------------------------------------------------
CREATE TABLE locations (
    id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(30),
    country VARCHAR(100) DEFAULT 'India',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    google_place_id VARCHAR(255) COMMENT 'Used strictly for Google Maps discovery and navigation',
    travel_buffer_minutes INT DEFAULT 15 COMMENT 'Safe departure threshold for customers',
    is_active BOOLEAN DEFAULT TRUE,
    operating_hours JSON COMMENT 'Daily opening/closing schedule e.g. {"mon": {"open": "09:00", "close": "20:00"}}',
    banner_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_locations_geo (latitude, longitude),
    INDEX idx_locations_city (city)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 4. SERVICES (Queue Service Categories)
-- ------------------------------------------------------------------------------
CREATE TABLE services (
    id VARCHAR(36) PRIMARY KEY,
    location_id VARCHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    service_code VARCHAR(10) NOT NULL COMMENT 'Prefix for tokens e.g. OPD, TBL, VIP, CSH',
    description TEXT,
    avg_duration_minutes INT DEFAULT 15,
    base_price DECIMAL(10, 2) DEFAULT 0.00,
    is_paid BOOLEAN DEFAULT FALSE,
    max_daily_capacity INT DEFAULT 200,
    is_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    INDEX idx_services_location (location_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 5. COUNTERS (Physical Desks / Booths / Examination Rooms)
-- ------------------------------------------------------------------------------
CREATE TABLE counters (
    id VARCHAR(36) PRIMARY KEY,
    location_id VARCHAR(36) NOT NULL,
    counter_number VARCHAR(30) NOT NULL COMMENT 'e.g. Counter 01, Room 204, Table 8',
    name VARCHAR(100),
    status ENUM('OPEN', 'BUSY', 'PAUSED', 'CLOSED') DEFAULT 'CLOSED',
    current_staff_id VARCHAR(36) NULL,
    active_token_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (current_staff_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_counters_location (location_id),
    INDEX idx_counters_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 6. COUNTER_SERVICES (Many-to-Many Service Routing)
-- ------------------------------------------------------------------------------
CREATE TABLE counter_services (
    counter_id VARCHAR(36) NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    priority INT DEFAULT 1,
    PRIMARY KEY (counter_id, service_id),
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 7. TOKENS (Universal Queue Ticket Lifecycle)
-- ------------------------------------------------------------------------------
CREATE TABLE tokens (
    id VARCHAR(36) PRIMARY KEY,
    service_id VARCHAR(36) NOT NULL,
    location_id VARCHAR(36) NOT NULL,
    counter_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL COMMENT 'Optional: Null for walk-in guest tokens',
    token_number INT NOT NULL COMMENT 'Daily sequential number, e.g. 1, 2, 3...',
    token_display VARCHAR(30) NOT NULL COMMENT 'e.g. OPD-014, TBL-007, CSH-102',
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30),
    party_size INT DEFAULT 1,
    source ENUM('APP', 'KIOSK', 'WEB', 'WALK_IN') DEFAULT 'APP',
    priority_level ENUM('STANDARD', 'PRIORITY', 'EMERGENCY') DEFAULT 'STANDARD',
    status ENUM('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO_SHOW') DEFAULT 'WAITING',
    estimated_wait_minutes INT DEFAULT 0,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_time TIMESTAMP NULL,
    served_time TIMESTAMP NULL,
    completed_time TIMESTAMP NULL,
    qr_code_hash VARCHAR(64) NOT NULL UNIQUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tokens_status (status),
    INDEX idx_tokens_service (service_id, status),
    INDEX idx_tokens_qr (qr_code_hash)
) ENGINE=InnoDB;

-- Add foreign key constraint from counters.active_token_id to tokens.id
ALTER TABLE counters
  ADD CONSTRAINT fk_counter_active_token
  FOREIGN KEY (active_token_id) REFERENCES tokens(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 8. PAYMENTS (Queue Deposits / VIP Expedite / Service Fees)
-- ------------------------------------------------------------------------------
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    token_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    gateway_provider VARCHAR(50) DEFAULT 'MOCK_RAZORPAY',
    transaction_reference VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'UPI',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payments_token (token_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 9. COMMISSION_LEDGERS (Automated Startup Revenue Engine)
-- ------------------------------------------------------------------------------
CREATE TABLE commission_ledgers (
    id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    payment_id VARCHAR(36) NOT NULL,
    gross_amount DECIMAL(10, 2) NOT NULL,
    platform_fee_percent DECIMAL(5, 2) NOT NULL,
    platform_fee_amount DECIMAL(10, 2) NOT NULL,
    net_vendor_payout DECIMAL(10, 2) NOT NULL,
    settlement_status ENUM('ACCRUED', 'PENDING_TRANSFER', 'SETTLED') DEFAULT 'ACCRUED',
    settled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    INDEX idx_ledger_org (org_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 10. AUDIT_LOGS (System Operations & Analytics Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    location_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_event (event_type),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ==============================================================================
-- ANALYTICAL VIEWS FOR MYSQL WORKBENCH & EXECUTIVE REPORTS
-- ==============================================================================

-- View 1: Live Real-Time Queue Metrics Per Service
CREATE OR REPLACE VIEW v_live_queue_metrics AS
SELECT 
    s.id AS service_id,
    s.name AS service_name,
    s.service_code,
    l.id AS location_id,
    l.name AS location_name,
    o.name AS organization_name,
    o.business_type,
    COUNT(CASE WHEN t.status = 'WAITING' THEN 1 END) AS waiting_count,
    COUNT(CASE WHEN t.status = 'CALLED' THEN 1 END) AS called_count,
    COUNT(CASE WHEN t.status = 'SERVING' THEN 1 END) AS serving_count,
    COUNT(CASE WHEN t.status = 'COMPLETED' AND DATE(t.completed_time) = CURDATE() THEN 1 END) AS completed_today_count,
    COALESCE(
        COUNT(CASE WHEN t.status = 'WAITING' THEN 1 END) * s.avg_duration_minutes / 
        GREATEST(1, (SELECT COUNT(*) FROM counter_services cs JOIN counters c ON cs.counter_id = c.id WHERE cs.service_id = s.id AND c.status IN ('OPEN', 'BUSY'))),
        0
    ) AS estimated_wait_minutes,
    (SELECT COUNT(*) FROM counter_services cs JOIN counters c ON cs.counter_id = c.id WHERE cs.service_id = s.id AND c.status IN ('OPEN', 'BUSY')) AS active_counters_count,
    s.is_paused
FROM services s
JOIN locations l ON s.location_id = l.id
JOIN organizations o ON l.org_id = o.id
LEFT JOIN tokens t ON s.id = t.service_id AND t.status IN ('WAITING', 'CALLED', 'SERVING', 'COMPLETED')
GROUP BY s.id, s.name, s.service_code, l.id, l.name, o.name, o.business_type, s.avg_duration_minutes, s.is_paused;

-- View 2: Financial Commission & Vendor Settlement Summary
CREATE OR REPLACE VIEW v_financial_commission_summary AS
SELECT 
    o.id AS org_id,
    o.name AS organization_name,
    o.business_type,
    COUNT(cl.id) AS total_transactions,
    COALESCE(SUM(cl.gross_amount), 0.00) AS total_gross_revenue,
    COALESCE(SUM(cl.platform_fee_amount), 0.00) AS total_platform_commission_earned,
    COALESCE(SUM(cl.net_vendor_payout), 0.00) AS total_vendor_payout_due,
    COUNT(CASE WHEN cl.settlement_status = 'SETTLED' THEN 1 END) AS settled_payouts_count,
    COUNT(CASE WHEN cl.settlement_status = 'ACCRUED' THEN 1 END) AS pending_settlements_count
FROM organizations o
LEFT JOIN commission_ledgers cl ON o.id = cl.org_id
GROUP BY o.id, o.name, o.business_type;

-- View 3: Counter Productivity & Speed Metrics
CREATE OR REPLACE VIEW v_counter_productivity AS
SELECT 
    c.id AS counter_id,
    c.counter_number,
    l.name AS location_name,
    u.full_name AS current_operator,
    c.status AS counter_status,
    COUNT(t.id) AS tokens_served_today,
    ROUND(AVG(TIMESTAMPDIFF(MINUTE, t.served_time, t.completed_time)), 1) AS avg_serve_time_minutes
FROM counters c
JOIN locations l ON c.location_id = l.id
LEFT JOIN users u ON c.current_staff_id = u.id
LEFT JOIN tokens t ON c.id = t.counter_id AND t.status = 'COMPLETED' AND DATE(t.completed_time) = CURDATE()
GROUP BY c.id, c.counter_number, l.name, u.full_name, c.status;
