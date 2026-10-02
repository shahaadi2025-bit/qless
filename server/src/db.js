import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

let pool = null;
let isConnected = false;

// Fallback in-memory store initialized with full seed dataset
// Ensures 100% testability even before DB password is confirmed in .env
export const mockStore = {
  organizations: [
    {
      id: 'org-hosp-01',
      name: 'City Care Multispeciality Hospital',
      slug: 'city-care-hospital',
      business_type: 'HEALTHCARE',
      is_verified: 1,
      platform_commission_rate: 2.50,
      contact_email: 'care@citycare.org',
      contact_phone: '+91 98765 43210',
      brand_color: '#0284C7'
    },
    {
      id: 'org-rest-02',
      name: 'Trattoria Bella Milano',
      slug: 'trattoria-bella-milano',
      business_type: 'RESTAURANT',
      is_verified: 1,
      platform_commission_rate: 4.00,
      contact_email: 'host@trattoriabel.com',
      contact_phone: '+91 98234 56789',
      brand_color: '#EA580C'
    },
    {
      id: 'org-temp-03',
      name: 'Kashi Heritage Mandir Trust',
      slug: 'kashi-heritage-mandir',
      business_type: 'RELIGIOUS',
      is_verified: 1,
      platform_commission_rate: 1.50,
      contact_email: 'darshan@kashimandir.org',
      contact_phone: '+91 98450 11223',
      brand_color: '#D97706'
    },
    {
      id: 'org-bank-04',
      name: 'Apex National Bank',
      slug: 'apex-national-bank',
      business_type: 'BANKING',
      is_verified: 1,
      platform_commission_rate: 3.00,
      contact_email: 'support@apexbank.com',
      contact_phone: '+91 98111 22334',
      brand_color: '#2563EB'
    },
    {
      id: 'org-saln-05',
      name: 'Luxe & Glow Wellness Salon',
      slug: 'luxe-glow-salon',
      business_type: 'SALON',
      is_verified: 1,
      platform_commission_rate: 5.00,
      contact_email: 'appointments@luxeglow.in',
      contact_phone: '+91 98999 88776',
      brand_color: '#DB2777'
    },
    {
      id: 'org-diag-06',
      name: 'Metro Precision PathLabs',
      slug: 'metro-precision-pathlabs',
      business_type: 'HEALTHCARE',
      is_verified: 1,
      platform_commission_rate: 3.50,
      contact_email: 'reports@metrolabs.in',
      contact_phone: '+91 98700 99881',
      brand_color: '#0D9488'
    }
  ],
  locations: [
    {
      id: 'loc-hosp-01',
      org_id: 'org-hosp-01',
      name: 'City Care Hospital - Central Wing',
      address: 'Plot 42, Health City Avenue, Medical Enclave',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 18.9220,
      longitude: 72.8347,
      google_place_id: 'ChIJbU60yXA_5zsR4nNsbv2N_UY',
      travel_buffer_minutes: 20,
      banner_url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'loc-rest-02',
      org_id: 'org-rest-02',
      name: 'Trattoria Bella Milano - Downtown',
      address: '14 Heritage Promenade, Colaba Causeway',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 18.9150,
      longitude: 72.8280,
      google_place_id: 'ChIJ8711h0M_5zsR0g9j_qW9Tew',
      travel_buffer_minutes: 15,
      banner_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'loc-temp-03',
      org_id: 'org-temp-03',
      name: 'Kashi Heritage Mandir - Sacred Complex',
      address: 'Ghat Road, Spiritual Promenade',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      latitude: 25.3109,
      longitude: 83.0107,
      google_place_id: 'ChIJ3-d4Q_J5jjkR8bJ_3L12Tyk',
      travel_buffer_minutes: 30,
      banner_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'loc-bank-04',
      org_id: 'org-bank-04',
      name: 'Apex National Bank - Financial Hub',
      address: '55 Nariman Point Tower, Floor 1',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 18.9256,
      longitude: 72.8242,
      google_place_id: 'ChIJl7x2hEQ_5zsRO2pBv6sH_W4',
      travel_buffer_minutes: 10,
      banner_url: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'loc-saln-05',
      org_id: 'org-saln-05',
      name: 'Luxe & Glow - Bandra Studio',
      address: '88 Linking Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 19.0607,
      longitude: 72.8362,
      google_place_id: 'ChIJ0911rVq_5zsR9qW_q8y2B1A',
      travel_buffer_minutes: 15,
      banner_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'loc-diag-06',
      org_id: 'org-diag-06',
      name: 'Metro Precision Diagnostics - Andheri Hub',
      address: 'Unit 12, Technopolis, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 19.1136,
      longitude: 72.8697,
      google_place_id: 'ChIJ7412hZa_5zsR5eE_r4w2K8Z',
      travel_buffer_minutes: 10,
      banner_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  services: [
    {
      id: 'srv-hosp-opd',
      location_id: 'loc-hosp-01',
      name: 'General Medicine OPD',
      service_code: 'OPD',
      description: 'Physician consultation, vitals triage, prescriptions',
      avg_duration_minutes: 12,
      base_price: 500.00,
      is_paid: 1,
      is_paused: 0
    },
    {
      id: 'srv-hosp-ped',
      location_id: 'loc-hosp-01',
      name: 'Pediatric Care',
      service_code: 'PED',
      description: 'Child health specialists & vaccine clinic',
      avg_duration_minutes: 15,
      base_price: 600.00,
      is_paid: 1,
      is_paused: 0
    },
    {
      id: 'srv-hosp-emg',
      location_id: 'loc-hosp-01',
      name: 'Emergency Walk-in Triage',
      service_code: 'EMG',
      description: 'Rapid triage assessment for acute care',
      avg_duration_minutes: 8,
      base_price: 0.00,
      is_paid: 0,
      is_paused: 0
    },
    {
      id: 'srv-rest-t2',
      location_id: 'loc-rest-02',
      name: 'Table for 2 Guests',
      service_code: 'T2',
      description: 'Intimate indoor or patio dining table',
      avg_duration_minutes: 45,
      base_price: 0.00,
      is_paid: 0,
      is_paused: 0
    },
    {
      id: 'srv-rest-t4',
      location_id: 'loc-rest-02',
      name: 'Table for 3-5 Guests',
      service_code: 'T4',
      description: 'Standard dining table for family or groups',
      avg_duration_minutes: 55,
      base_price: 0.00,
      is_paid: 0,
      is_paused: 0
    },
    {
      id: 'srv-rest-bar',
      location_id: 'loc-rest-02',
      name: 'Cocktail Lounge Bar Seating',
      service_code: 'BAR',
      description: 'Express walk-in bar counter seating',
      avg_duration_minutes: 25,
      base_price: 0.00,
      is_paid: 0,
      is_paused: 0
    },
    {
      id: 'srv-temp-gen',
      location_id: 'loc-temp-03',
      name: 'General Darshan Line',
      service_code: 'DAR',
      description: 'Standard orderly queue for temple sanctum sanctorum',
      avg_duration_minutes: 20,
      base_price: 0.00,
      is_paid: 0,
      is_paused: 0
    },
    {
      id: 'srv-temp-vip',
      location_id: 'loc-temp-03',
      name: 'Special Sugam VIP Darshan',
      service_code: 'VIP',
      description: 'Expedited special darshan with complimentary prasadam pass',
      avg_duration_minutes: 10,
      base_price: 300.00,
      is_paid: 1,
      is_paused: 0
    },
    {
      id: 'srv-bank-csh',
      location_id: 'loc-bank-04',
      name: 'Cash & Cheque Deposits',
      service_code: 'CSH',
      description: 'Fast teller transactions, deposits, drafts',
      avg_duration_minutes: 7,
      base_price: 0.00,
      is_paid: 0,
      is_paused: 0
    },
    {
      id: 'srv-bank-adv',
      location_id: 'loc-bank-04',
      name: 'Loans & Wealth Advisory',
      service_code: 'ADV',
      description: 'Home loans, investments, account management',
      avg_duration_minutes: 25,
      base_price: 0.00,
      is_paid: 0,
      is_paused: 0
    },
    {
      id: 'srv-saln-hair',
      location_id: 'loc-saln-05',
      name: 'Designer Haircut & Styling',
      service_code: 'CUT',
      description: 'Hair wash, luxury cut, styling, blow dry',
      avg_duration_minutes: 35,
      base_price: 1200.00,
      is_paid: 1,
      is_paused: 0
    },
    {
      id: 'srv-diag-bld',
      location_id: 'loc-diag-06',
      name: 'Blood Sample Collection',
      service_code: 'LAB',
      description: 'Phlebotomy blood drawing & biometric profiling',
      avg_duration_minutes: 6,
      base_price: 250.00,
      is_paid: 1,
      is_paused: 0
    }
  ],
  counters: [
    {
      id: 'cnt-hosp-01',
      location_id: 'loc-hosp-01',
      counter_number: 'Desk 01',
      name: 'OPD Room 101 - Dr. Sharma',
      status: 'BUSY',
      current_staff_id: 'user-staff-01',
      active_token_id: 'tok-004'
    },
    {
      id: 'cnt-hosp-02',
      location_id: 'loc-hosp-01',
      counter_number: 'Desk 02',
      name: 'OPD Room 102 - Dr. Roy',
      status: 'OPEN',
      current_staff_id: null,
      active_token_id: null
    },
    {
      id: 'cnt-hosp-03',
      location_id: 'loc-hosp-01',
      counter_number: 'Desk 03',
      name: 'Emergency Triage Bay A',
      status: 'BUSY',
      current_staff_id: null,
      active_token_id: null
    },
    {
      id: 'cnt-rest-01',
      location_id: 'loc-rest-02',
      counter_number: 'Host Station',
      name: 'Main Maitre D Desk',
      status: 'OPEN',
      current_staff_id: 'user-staff-02',
      active_token_id: 'tok-007'
    },
    {
      id: 'cnt-temp-01',
      location_id: 'loc-temp-03',
      counter_number: 'Gate 01',
      name: 'Main Sanctum North Gate',
      status: 'OPEN',
      current_staff_id: 'user-staff-04',
      active_token_id: null
    },
    {
      id: 'cnt-temp-02',
      location_id: 'loc-temp-03',
      counter_number: 'Gate 02 - VIP',
      name: 'Sugam Darshan East Portal',
      status: 'OPEN',
      current_staff_id: null,
      active_token_id: null
    },
    {
      id: 'cnt-bank-01',
      location_id: 'loc-bank-04',
      counter_number: 'Counter 01',
      name: 'Cash & Cheque Teller Station',
      status: 'OPEN',
      current_staff_id: 'user-staff-03',
      active_token_id: null
    }
  ],
  tokens: [
    {
      id: 'tok-001',
      service_id: 'srv-hosp-opd',
      location_id: 'loc-hosp-01',
      counter_id: 'cnt-hosp-01',
      user_id: 'user-cust-01',
      token_number: 14,
      token_display: 'OPD-014',
      customer_name: 'Aadi Shah',
      customer_phone: '+91 98765 00001',
      party_size: 1,
      source: 'APP',
      priority_level: 'STANDARD',
      status: 'WAITING',
      estimated_wait_minutes: 18,
      qr_code_hash: 'QL-HASH-OPD014-9812A',
      check_in_time: new Date(Date.now() - 25 * 60000).toISOString(),
      called_time: null,
      served_time: null,
      completed_time: null
    },
    {
      id: 'tok-002',
      service_id: 'srv-hosp-opd',
      location_id: 'loc-hosp-01',
      counter_id: null,
      user_id: 'user-cust-02',
      token_number: 15,
      token_display: 'OPD-015',
      customer_name: 'Priya Sharma',
      customer_phone: '+91 98765 00002',
      party_size: 1,
      source: 'WEB',
      priority_level: 'STANDARD',
      status: 'WAITING',
      estimated_wait_minutes: 30,
      qr_code_hash: 'QL-HASH-OPD015-4421B',
      check_in_time: new Date(Date.now() - 18 * 60000).toISOString(),
      called_time: null,
      served_time: null,
      completed_time: null
    },
    {
      id: 'tok-003',
      service_id: 'srv-hosp-opd',
      location_id: 'loc-hosp-01',
      counter_id: null,
      user_id: null,
      token_number: 16,
      token_display: 'OPD-016',
      customer_name: 'Sunil Deshmukh',
      customer_phone: '+91 98765 00003',
      party_size: 1,
      source: 'KIOSK',
      priority_level: 'STANDARD',
      status: 'WAITING',
      estimated_wait_minutes: 42,
      qr_code_hash: 'QL-HASH-OPD016-7781C',
      check_in_time: new Date(Date.now() - 10 * 60000).toISOString(),
      called_time: null,
      served_time: null,
      completed_time: null
    },
    {
      id: 'tok-004',
      service_id: 'srv-hosp-opd',
      location_id: 'loc-hosp-01',
      counter_id: 'cnt-hosp-01',
      user_id: null,
      token_number: 13,
      token_display: 'OPD-013',
      customer_name: 'Rajesh Kulkarni',
      customer_phone: '+91 98765 00004',
      party_size: 1,
      source: 'KIOSK',
      priority_level: 'STANDARD',
      status: 'SERVING',
      estimated_wait_minutes: 0,
      qr_code_hash: 'QL-HASH-OPD013-1122D',
      check_in_time: new Date(Date.now() - 35 * 60000).toISOString(),
      called_time: new Date(Date.now() - 10 * 60000).toISOString(),
      served_time: new Date(Date.now() - 8 * 60000).toISOString(),
      completed_time: null
    },
    {
      id: 'tok-007',
      service_id: 'srv-rest-t4',
      location_id: 'loc-rest-02',
      counter_id: 'cnt-rest-01',
      user_id: null,
      token_number: 8,
      token_display: 'T4-008',
      customer_name: 'Dr. Verma Family',
      customer_phone: '+91 98333 11229',
      party_size: 4,
      source: 'APP',
      priority_level: 'PRIORITY',
      status: 'CALLED',
      estimated_wait_minutes: 0,
      qr_code_hash: 'QL-HASH-T4008-9901G',
      check_in_time: new Date(Date.now() - 40 * 60000).toISOString(),
      called_time: new Date(Date.now() - 2 * 60000).toISOString(),
      served_time: null,
      completed_time: null
    }
  ],
  payments: [
    {
      id: 'pay-001',
      token_id: 'tok-001',
      user_id: 'user-cust-01',
      amount: 500.00,
      currency: 'INR',
      status: 'COMPLETED',
      gateway_provider: 'RAZORPAY',
      transaction_reference: 'pay_NX92Ka87fK10',
      payment_method: 'UPI',
      created_at: new Date(Date.now() - 25 * 60000).toISOString()
    }
  ],
  commission_ledgers: [
    {
      id: 'com-001',
      org_id: 'org-hosp-01',
      payment_id: 'pay-001',
      gross_amount: 500.00,
      platform_fee_percent: 2.50,
      platform_fee_amount: 12.50,
      net_vendor_payout: 487.50,
      settlement_status: 'ACCRUED',
      created_at: new Date(Date.now() - 25 * 60000).toISOString()
    }
  ],
  users: [
    {
      id: 'user-admin-01',
      email: 'admin@qless.io',
      full_name: 'QLESS System Administrator',
      role: 'SUPER_ADMIN',
      org_id: null
    },
    {
      id: 'user-cust-01',
      email: 'aadi@example.com',
      full_name: 'Aadi Shah (Customer)',
      role: 'CUSTOMER',
      org_id: null
    },
    {
      id: 'user-staff-01',
      email: 'nurse.sarah@citycare.org',
      full_name: 'Sister Sarah Jenkins (Triage)',
      role: 'STAFF',
      org_id: 'org-hosp-01'
    },
    {
      id: 'user-staff-02',
      email: 'marco.rossi@trattoria.com',
      full_name: 'Marco Rossi (Maitre D)',
      role: 'STAFF',
      org_id: 'org-rest-02'
    }
  ]
};

export async function initDbPool() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'qless_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isConnected = true;
    console.log('✅ [QLESS-DB] Connected successfully to MySQL Server (qless_db on port 3306)!');
    return pool;
  } catch (err) {
    isConnected = false;
    console.warn('⚠️ [QLESS-DB] MySQL direct connection notice:', err.message);
    console.log('⚡ [QLESS-DB] Operating with in-memory sync engine to guarantee 100% demo uptime.');
    console.log('💡 Tip: You can execute database/schema.sql & database/seed.sql in MySQL Workbench anytime!');
    return null;
  }
}

export function isDbConnected() {
  return isConnected;
}

export function getDbPool() {
  return pool;
}
