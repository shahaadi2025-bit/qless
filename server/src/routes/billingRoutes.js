import express from 'express';
import {
  listPlans,
  createCheckout,
  verifyRazorpay,
  submitUtr,
  demoComplete,
  myPayments,
  adminReview,
  adminApprove,
  adminReject,
  applyBoost
} from '../controllers/billingController.js';

const router = express.Router();

router.get('/plans', listPlans);
router.post('/checkout', createCheckout);
router.post('/razorpay/verify', verifyRazorpay);
router.post('/upi/submit', submitUtr);
router.post('/demo/complete', demoComplete);
router.get('/payments', myPayments);
router.get('/admin/review', adminReview);
router.post('/admin/:id/approve', adminApprove);
router.post('/admin/:id/reject', adminReject);
router.post('/boost', applyBoost);

export default router;