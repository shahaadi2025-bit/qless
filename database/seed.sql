-- ==============================================================================
-- QLESS SEED DATA (Universal Multi-Industry Real-World Dataset)
-- "JOIN THE QUEUE. NOT THE CROWD."
--
-- This script populates organizations across 6 core industries:
-- Healthcare, Dining, Temples, Banking, Salons, and Diagnostic Labs.
--
-- Usage in MySQL Workbench:
-- 1. Run schema.sql first.
-- 2. Open this file (File -> Open SQL Script...)
-- 3. Click the yellow lightning bolt icon (Execute).
-- ==============================================================================

USE qless_db;

-- ------------------------------------------------------------------------------
-- 1. INSERT ORGANIZATIONS
-- ------------------------------------------------------------------------------
INSERT INTO organizations (id, name, slug, legal_name, business_type, tax_id, is_verified, platform_commission_rate, contact_email, contact_phone, brand_color) VALUES
('org-hosp-01', 'City Care Multispeciality Hospital', 'city-care-hospital', 'City Care Health Foundation Ltd', 'HEALTHCARE', 'GSTIN27AAACH1234F1Z5', TRUE, 2.50, 'care@citycare.org', '+91 98765 43210', '#0284C7'),
('org-rest-02', 'Trattoria Bella Milano', 'trattoria-bella-milano', 'Milano Hospitality Pvt Ltd', 'RESTAURANT', 'GSTIN27AAATM5678B1Z2', TRUE, 4.00, 'host@trattoriabel.com', '+91 98234 56789', '#EA580C'),
('org-temp-03', 'Kashi Heritage Mandir Trust', 'kashi-heritage-mandir', 'Kashi Temple Religious Trust', 'RELIGIOUS', 'TRUST-REG-98124', TRUE, 1.50, 'darshan@kashimandir.org', '+91 98450 11223', '#D97706'),
('org-bank-04', 'Apex National Bank', 'apex-national-bank', 'Apex Financial Services Banking Corp', 'BANKING', 'RBI-LIC-774411', TRUE, 3.00, 'support@apexbank.com', '+91 98111 22334', '#2563EB'),
('org-saln-05', 'Luxe & Glow Wellness Salon', 'luxe-glow-salon', 'Luxe Beauty & Aesthetic Studios', 'SALON', 'GSTIN27AAALB9988C1Z9', TRUE, 5.00, 'appointments@luxeglow.in', '+91 98999 88776', '#DB2777'),
('org-diag-06', 'Metro Precision PathLabs', 'metro-precision-pathlabs', 'Metro Precision Diagnostics Ltd', 'HEALTHCARE', 'GSTIN27AAAMP4433D1Z1', TRUE, 3.50, 'reports@metrolabs.in', '+91 98700 99881', '#0D9488');

-- ------------------------------------------------------------------------------
-- 2. INSERT USERS (Demo Credentials for Testing & College Presentation)
-- Passwords are set for testing (e.g. hashed 'password123')
-- ------------------------------------------------------------------------------
INSERT INTO users (id, org_id, email, password_hash, full_name, phone, role) VALUES
('user-admin-01', NULL, 'admin@qless.io', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'QLESS System Administrator', '+91 90000 00001', 'SUPER_ADMIN'),
('user-cust-01', NULL, 'aadi@example.com', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'Aadi Shah (Customer)', '+91 98765 00001', 'CUSTOMER'),
('user-cust-02', NULL, 'priya.sharma@example.com', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'Priya Sharma', '+91 98765 00002', 'CUSTOMER'),
('user-staff-01', 'org-hosp-01', 'nurse.sarah@citycare.org', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'Sister Sarah Jenkins (Triage)', '+91 98765 11111', 'STAFF'),
('user-staff-02', 'org-rest-02', 'marco.rossi@trattoria.com', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'Marco Rossi (Maitre D)', '+91 98765 22222', 'STAFF'),
('user-staff-03', 'org-bank-04', 'vikram.teller@apexbank.com', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'Vikram Malhotra (Head Teller)', '+91 98765 33333', 'STAFF'),
('user-staff-04', 'org-temp-03', 'shastri.pandit@kashimandir.org', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'Pandit Devrat (Darshan Coord)', '+91 98765 44444', 'STAFF'),
('user-admin-biz', 'org-hosp-01', 'dr.mehta@citycare.org', '$2a$10$wEkgz8Vl9g4z3X9lR4Q0u.n1O3iL/6r7v9.qO.kXQ4F5zR3/W9kOm', 'Dr. Ramesh Mehta (Chief Medical Off)', '+91 98765 55555', 'BUSINESS_ADMIN');

-- ------------------------------------------------------------------------------
-- 3. INSERT LOCATIONS (Physical Sites with Geospatial Coordinates)
-- Note: google_place_id is strictly external discovery/navigation metadata
-- ------------------------------------------------------------------------------
INSERT INTO locations (id, org_id, name, address, city, state, postal_code, latitude, longitude, google_place_id, travel_buffer_minutes, banner_url) VALUES
('loc-hosp-01', 'org-hosp-01', 'City Care Hospital - Central Wing', 'Plot 42, Health City Avenue, Medical Enclave', 'Mumbai', 'Maharashtra', '400001', 18.9220, 72.8347, 'ChIJbU60yXA_5zsR4nNsbv2N_UY', 20, 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80'),
('loc-rest-02', 'org-rest-02', 'Trattoria Bella Milano - Downtown', '14 Heritage Promenade, Colaba Causeway', 'Mumbai', 'Maharashtra', '400005', 18.9150, 72.8280, 'ChIJ8711h0M_5zsR0g9j_qW9Tew', 15, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'),
('loc-temp-03', 'org-temp-03', 'Kashi Heritage Mandir - Sacred Complex', 'Ghat Road, Spiritual Promenade', 'Varanasi', 'Uttar Pradesh', '221001', 25.3109, 83.0107, 'ChIJ3-d4Q_J5jjkR8bJ_3L12Tyk', 30, 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80'),
('loc-bank-04', 'org-bank-04', 'Apex National Bank - Financial Hub', '55 Nariman Point Tower, Floor 1', 'Mumbai', 'Maharashtra', '400021', 18.9256, 72.8242, 'ChIJl7x2hEQ_5zsRO2pBv6sH_W4', 10, 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&w=1200&q=80'),
('loc-saln-05', 'org-saln-05', 'Luxe & Glow - Bandra Studio', '88 Linking Road, Bandra West', 'Mumbai', 'Maharashtra', '400050', 19.0607, 72.8362, 'ChIJ0911rVq_5zsR9qW_q8y2B1A', 15, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80'),
('loc-diag-06', 'org-diag-06', 'Metro Precision Diagnostics - Andheri Hub', 'Unit 12, Technopolis, Andheri East', 'Mumbai', 'Maharashtra', '400069', 19.1136, 72.8697, 'ChIJ7412hZa_5zsR5eE_r4w2K8Z', 10, 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80');

-- ------------------------------------------------------------------------------
-- 4. INSERT SERVICES (Universal Queue Categories)
-- ------------------------------------------------------------------------------
INSERT INTO services (id, location_id, name, service_code, description, avg_duration_minutes, base_price, is_paid, max_daily_capacity) VALUES
-- Hospital Services
('srv-hosp-opd', 'loc-hosp-01', 'General Medicine OPD', 'OPD', 'Physician consultation, vitals triage, prescriptions', 12, 500.00, TRUE, 150),
('srv-hosp-ped', 'loc-hosp-01', 'Pediatric Care', 'PED', 'Child health specialists & vaccine clinic', 15, 600.00, TRUE, 80),
('srv-hosp-emg', 'loc-hosp-01', 'Emergency Walk-in Triage', 'EMG', 'Rapid triage assessment for acute care', 8, 0.00, FALSE, 300),

-- Restaurant Services
('srv-rest-t2', 'loc-rest-02', 'Table for 2 Guests', 'T2', 'Intimate indoor or patio dining table', 45, 0.00, FALSE, 60),
('srv-rest-t4', 'loc-rest-02', 'Table for 3-5 Guests', 'T4', 'Standard dining table for family or groups', 55, 0.00, FALSE, 40),
('srv-rest-bar', 'loc-rest-02', 'Cocktail Lounge Bar Seating', 'BAR', 'Express walk-in bar counter seating', 25, 0.00, FALSE, 25),

-- Temple Services
('srv-temp-gen', 'loc-temp-03', 'General Darshan Line', 'DAR', 'Standard orderly queue for temple sanctum sanctorum', 20, 0.00, FALSE, 1000),
('srv-temp-vip', 'loc-temp-03', 'Special Sugam VIP Darshan', 'VIP', 'Expedited special darshan with complimentary prasadam pass', 10, 300.00, TRUE, 200),

-- Bank Services
('srv-bank-csh', 'loc-bank-04', 'Cash & Cheque Deposits', 'CSH', 'Fast teller transactions, deposits, drafts', 7, 0.00, FALSE, 200),
('srv-bank-adv', 'loc-bank-04', 'Loans & Wealth Advisory', 'ADV', 'Home loans, investments, account management', 25, 0.00, FALSE, 30),

-- Salon Services
('srv-saln-hair', 'loc-saln-05', 'Designer Haircut & Styling', 'CUT', 'Hair wash, luxury cut, styling, blow dry', 35, 1200.00, TRUE, 40),

-- Diagnostic Lab Services
('srv-diag-bld', 'loc-diag-06', 'Blood Sample Collection', 'LAB', 'Phlebotomy blood drawing & biometric profiling', 6, 250.00, TRUE, 250);

-- ------------------------------------------------------------------------------
-- 5. INSERT COUNTERS (Desks / Booths)
-- ------------------------------------------------------------------------------
INSERT INTO counters (id, location_id, counter_number, name, status, current_staff_id) VALUES
-- Hospital Counters
('cnt-hosp-01', 'loc-hosp-01', 'Desk 01', 'OPD Room 101 - Dr. Sharma', 'OPEN', 'user-staff-01'),
('cnt-hosp-02', 'loc-hosp-01', 'Desk 02', 'OPD Room 102 - Dr. Roy', 'OPEN', NULL),
('cnt-hosp-03', 'loc-hosp-01', 'Desk 03', 'Emergency Triage Bay A', 'BUSY', NULL),

-- Restaurant Counters
('cnt-rest-01', 'loc-rest-02', 'Host Station', 'Main Maitre D Desk', 'OPEN', 'user-staff-02'),
('cnt-rest-02', 'loc-rest-02', 'Patio Podium', 'Outdoor Seating Desk', 'OPEN', NULL),

-- Temple Counters
('cnt-temp-01', 'loc-temp-03', 'Gate 01', 'Main Sanctum North Gate', 'OPEN', 'user-staff-04'),
('cnt-temp-02', 'loc-temp-03', 'Gate 02 - VIP', 'Sugam Darshan East Portal', 'OPEN', NULL),

-- Bank Counters
('cnt-bank-01', 'loc-bank-04', 'Counter 01', 'Cash & Cheque Teller Station', 'OPEN', 'user-staff-03'),
('cnt-bank-02', 'loc-bank-04', 'Counter 02', 'Senior Citizen & Quick Cash', 'OPEN', NULL),
('cnt-bank-03', 'loc-bank-04', 'Desk 04', 'Relationship Manager Cabin', 'OPEN', NULL);

-- ------------------------------------------------------------------------------
-- 6. MAP COUNTERS TO SERVICES
-- ------------------------------------------------------------------------------
INSERT INTO counter_services (counter_id, service_id, priority) VALUES
('cnt-hosp-01', 'srv-hosp-opd', 1),
('cnt-hosp-02', 'srv-hosp-opd', 1),
('cnt-hosp-02', 'srv-hosp-ped', 2),
('cnt-hosp-03', 'srv-hosp-emg', 1),
('cnt-rest-01', 'srv-rest-t2', 1),
('cnt-rest-01', 'srv-rest-t4', 2),
('cnt-rest-02', 'srv-rest-bar', 1),
('cnt-temp-01', 'srv-temp-gen', 1),
('cnt-temp-02', 'srv-temp-vip', 1),
('cnt-bank-01', 'srv-bank-csh', 1),
('cnt-bank-02', 'srv-bank-csh', 1),
('cnt-bank-03', 'srv-bank-adv', 1);

-- ------------------------------------------------------------------------------
-- 7. INSERT LIVE TOKENS (Vibrant Initial Queue State)
-- ------------------------------------------------------------------------------
INSERT INTO tokens (id, service_id, location_id, counter_id, user_id, token_number, token_display, customer_name, customer_phone, party_size, source, priority_level, status, estimated_wait_minutes, qr_code_hash, check_in_time) VALUES
-- Hospital OPD Tokens
('tok-001', 'srv-hosp-opd', 'loc-hosp-01', 'cnt-hosp-01', 'user-cust-01', 14, 'OPD-014', 'Aadi Shah', '+91 98765 00001', 1, 'APP', 'STANDARD', 'WAITING', 18, 'QL-HASH-OPD014-9812A', DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
('tok-002', 'srv-hosp-opd', 'loc-hosp-01', NULL, 'user-cust-02', 15, 'OPD-015', 'Priya Sharma', '+91 98765 00002', 1, 'WEB', 'STANDARD', 'WAITING', 30, 'QL-HASH-OPD015-4421B', DATE_SUB(NOW(), INTERVAL 18 MINUTE)),
('tok-003', 'srv-hosp-opd', 'loc-hosp-01', NULL, NULL, 16, 'OPD-016', 'Sunil Deshmukh', '+91 98765 00003', 1, 'KIOSK', 'STANDARD', 'WAITING', 42, 'QL-HASH-OPD016-7781C', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('tok-004', 'srv-hosp-opd', 'loc-hosp-01', 'cnt-hosp-01', NULL, 13, 'OPD-013', 'Rajesh Kulkarni', '+91 98765 00004', 1, 'KIOSK', 'STANDARD', 'SERVING', 0, 'QL-HASH-OPD013-1122D', DATE_SUB(NOW(), INTERVAL 35 MINUTE)),

-- Restaurant Table Tokens
('tok-005', 'srv-rest-t2', 'loc-rest-02', 'cnt-rest-01', NULL, 22, 'T2-022', 'Arjun Kapoor', '+91 98111 55667', 2, 'APP', 'STANDARD', 'WAITING', 24, 'QL-HASH-T2022-8871E', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('tok-006', 'srv-rest-t2', 'loc-rest-02', NULL, NULL, 23, 'T2-023', 'Ananya Roy', '+91 98222 44332', 2, 'WALK_IN', 'STANDARD', 'WAITING', 45, 'QL-HASH-T2023-3321F', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
('tok-007', 'srv-rest-t4', 'loc-rest-02', 'cnt-rest-01', NULL, 8, 'T4-008', 'Dr. Verma Family', '+91 98333 11229', 4, 'APP', 'PRIORITY', 'CALLED', 0, 'QL-HASH-T4008-9901G', DATE_SUB(NOW(), INTERVAL 40 MINUTE)),

-- Temple VIP Darshan Tokens
('tok-008', 'srv-temp-vip', 'loc-temp-03', 'cnt-temp-02', NULL, 401, 'VIP-401', 'Mohanlal Agarwal', '+91 98444 88771', 3, 'APP', 'PRIORITY', 'WAITING', 12, 'QL-HASH-VIP401-4451H', DATE_SUB(NOW(), INTERVAL 12 MINUTE)),
('tok-009', 'srv-temp-gen', 'loc-temp-03', 'cnt-temp-01', NULL, 1205, 'DAR-1205', 'Ramesh Yadav', '+91 98555 77662', 1, 'KIOSK', 'STANDARD', 'WAITING', 35, 'QL-HASH-DAR1205-6671J', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),

-- Bank Teller Tokens
('tok-010', 'srv-bank-csh', 'loc-bank-04', 'cnt-bank-01', NULL, 88, 'CSH-088', 'Deepak Joshi', '+91 98666 44331', 1, 'KIOSK', 'STANDARD', 'WAITING', 8, 'QL-HASH-CSH088-2231K', DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- Set active token references on counters
UPDATE counters SET active_token_id = 'tok-004', status = 'BUSY' WHERE id = 'cnt-hosp-01';
UPDATE counters SET active_token_id = 'tok-007', status = 'OPEN' WHERE id = 'cnt-rest-01';

-- ------------------------------------------------------------------------------
-- 8. INSERT PAYMENTS & COMMISSION LEDGERS (Financial Verification)
-- ------------------------------------------------------------------------------
INSERT INTO payments (id, token_id, user_id, amount, currency, status, gateway_provider, transaction_reference, payment_method) VALUES
('pay-001', 'tok-001', 'user-cust-01', 500.00, 'INR', 'COMPLETED', 'RAZORPAY', 'pay_NX92Ka87fK10', 'UPI'),
('pay-002', 'tok-008', NULL, 900.00, 'INR', 'COMPLETED', 'STRIPE', 'ch_3M4k92Kdf810', 'CARD');

INSERT INTO commission_ledgers (id, org_id, payment_id, gross_amount, platform_fee_percent, platform_fee_amount, net_vendor_payout, settlement_status) VALUES
('com-001', 'org-hosp-01', 'pay-001', 500.00, 2.50, 12.50, 487.50, 'ACCRUED'),
('com-002', 'org-temp-03', 'pay-002', 900.00, 1.50, 13.50, 886.50, 'ACCRUED');

-- ------------------------------------------------------------------------------
-- 9. AUDIT LOG INITIALIZATION
-- ------------------------------------------------------------------------------
INSERT INTO audit_logs (id, location_id, user_id, event_type, description, metadata) VALUES
('aud-001', 'loc-hosp-01', 'user-staff-01', 'COUNTER_OPENED', 'Counter Desk 01 opened by Sister Sarah', '{"counter_number": "Desk 01"}'),
('aud-002', 'loc-hosp-01', 'user-cust-01', 'TOKEN_ISSUED', 'Token OPD-014 issued to Aadi Shah via Mobile Web', '{"service": "OPD", "source": "APP"}'),
('aud-003', 'loc-rest-02', 'user-staff-02', 'TOKEN_CALLED', 'Table T4-008 called to Host Station', '{"service": "T4", "party_size": 4}');
