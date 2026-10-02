import { getDbPool, isDbConnected, mockStore } from '../db.js';

export async function getDashboardAnalytics(req, res) {
  try {
    const totalOrganizations = mockStore.organizations.length;
    const totalLocations = mockStore.locations.length;
    const totalServices = mockStore.services.length;
    
    const activeTokens = mockStore.tokens.filter(t => ['WAITING', 'CALLED', 'SERVING'].includes(t.status));
    const completedToday = mockStore.tokens.filter(t => t.status === 'COMPLETED').length + 48; // baseline demo count
    const totalWaiting = activeTokens.filter(t => t.status === 'WAITING').length;
    const activeCounters = mockStore.counters.filter(c => ['OPEN', 'BUSY'].includes(c.status)).length;

    // Financial commission metrics
    const grossRevenue = 14250.00;
    const platformCommission = 498.75;
    const vendorPayouts = grossRevenue - platformCommission;

    // Hourly traffic curve for presentation charts
    const hourlySurge = [
      { hour: '09:00', tokens: 12, avgWait: 8 },
      { hour: '10:00', tokens: 28, avgWait: 14 },
      { hour: '11:00', tokens: 45, avgWait: 22 },
      { hour: '12:00', tokens: 62, avgWait: 31 },
      { hour: '13:00', tokens: 58, avgWait: 27 },
      { hour: '14:00', tokens: 34, avgWait: 16 },
      { hour: '15:00', tokens: 49, avgWait: 24 },
      { hour: '16:00', tokens: 66, avgWait: 34 },
      { hour: '17:00', tokens: 71, avgWait: 38 },
      { hour: '18:00', tokens: 54, avgWait: 29 }
    ];

    // Industry distribution
    const categoryDistribution = [
      { category: 'HEALTHCARE', count: 184, share: '34%' },
      { category: 'RESTAURANT', count: 142, share: '26%' },
      { category: 'RELIGIOUS', count: 98, share: '18%' },
      { category: 'BANKING', count: 65, share: '12%' },
      { category: 'SALON', count: 32, share: '6%' },
      { category: 'OTHER', count: 21, share: '4%' }
    ];

    // Commission Ledger Entries
    const commissionLedger = [
      {
        id: 'com-001',
        org_name: 'City Care Multispeciality Hospital',
        service: 'General Medicine OPD',
        gross: '₹ 500.00',
        fee_rate: '2.50%',
        platform_fee: '₹ 12.50',
        vendor_net: '₹ 487.50',
        status: 'SETTLED',
        date: 'Today, 11:20 AM'
      },
      {
        id: 'com-002',
        org_name: 'Kashi Heritage Mandir Trust',
        service: 'Special Sugam VIP Darshan',
        gross: '₹ 900.00',
        fee_rate: '1.50%',
        platform_fee: '₹ 13.50',
        vendor_net: '₹ 886.50',
        status: 'ACCRUED',
        date: 'Today, 11:45 AM'
      },
      {
        id: 'com-003',
        org_name: 'Luxe & Glow Wellness Salon',
        service: 'Designer Haircut & Styling',
        gross: '₹ 1,200.00',
        fee_rate: '5.00%',
        platform_fee: '₹ 60.00',
        vendor_net: '₹ 1,140.00',
        status: 'ACCRUED',
        date: 'Today, 12:10 PM'
      },
      {
        id: 'com-004',
        org_name: 'Metro Precision PathLabs',
        service: 'Blood Sample Collection',
        gross: '₹ 250.00',
        fee_rate: '3.50%',
        platform_fee: '₹ 8.75',
        vendor_net: '₹ 241.25',
        status: 'SETTLED',
        date: 'Today, 12:30 PM'
      }
    ];

    return res.json({
      success: true,
      data: {
        summary: {
          totalOrganizations,
          totalLocations,
          totalServices,
          totalWaiting,
          completedToday,
          activeCounters,
          avgWaitTimeMinutes: 16,
          grossRevenue,
          platformCommission,
          vendorPayouts
        },
        hourlySurge,
        categoryDistribution,
        commissionLedger
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
}
