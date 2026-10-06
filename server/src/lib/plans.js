// Plan catalog. Prices are in rupees and are ALWAYS taken from here, never from the browser.
// boosts.included: how many free priority boosts per month (null = unlimited); boosts.price: rupees per extra boost.
export const PLANS = [
  {
    id: 'free',
    audience: 'CUSTOMER',
    name: 'Free',
    tagline: 'Join any queue and track it live',
    monthly: 0,
    yearly: 0,
    boosts: { included: 0, price: 20 },
    features: ['Join unlimited queues', 'Live token tracking', 'Smart departure alerts', 'Pay-as-you-go priority boost (Rs 20)']
  },
  {
    id: 'plus',
    audience: 'CUSTOMER',
    name: 'Plus',
    tagline: 'For people who queue a lot',
    monthly: 49,
    yearly: 490,
    popular: true,
    boosts: { included: 5, price: 10 },
    features: ['Everything in Free', '5 free priority boosts every month', 'Extra boosts at Rs 10', 'Plus badge on your token']
  },
  {
    id: 'elite',
    audience: 'CUSTOMER',
    name: 'Elite',
    tagline: 'Never wait behind the crowd',
    monthly: 149,
    yearly: 1490,
    boosts: { included: null, price: 0 },
    features: ['Everything in Plus', 'Unlimited priority boosts', 'Early access to new features', 'Elite badge on your token']
  },
  {
    id: 'biz_starter',
    audience: 'BUSINESS',
    name: 'Starter',
    tagline: 'Try QLESS at one counter',
    monthly: 0,
    yearly: 0,
    commissionPercent: 4,
    counters: 1,
    features: ['1 counter', 'Live queue board', 'Basic analytics', '4% platform commission']
  },
  {
    id: 'biz_growth',
    audience: 'BUSINESS',
    name: 'Growth',
    tagline: 'For busy clinics, banks and salons',
    monthly: 999,
    yearly: 9990,
    popular: true,
    commissionPercent: 2.5,
    counters: 5,
    features: ['Up to 5 counters', 'Walk-in kiosk mode', 'Full analytics and payouts', '2.5% platform commission']
  },
  {
    id: 'biz_scale',
    audience: 'BUSINESS',
    name: 'Scale',
    tagline: 'For hospitals, temples and chains',
    monthly: 2999,
    yearly: 29990,
    commissionPercent: 1.5,
    counters: null,
    features: ['Unlimited counters', 'Priority support', 'Multi-branch dashboard', '1.5% platform commission']
  }
];

export const planById = id => PLANS.find(p => p.id === id) || null;
export const defaultPlanId = role => (role === 'BUSINESS' ? 'biz_starter' : 'free');
export const priceFor = (plan, interval) => (interval === 'year' ? plan.yearly : plan.monthly);

// Business accounts do not get boost allowances; they pay per boost like a free customer.
export function boostPolicy(planId) {
  const p = planById(planId);
  return p && p.boosts ? p.boosts : { included: 0, price: 20 };
}