const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect, adminOnly } = require('../middleware/auth');
const { validateCoupon, generateCode, addDays } = require('../services/couponService');

// GET /api/coupons/my — customer's coupons (personal + global)
router.get('/my', protect, async (req, res) => {
  try {
    const now = new Date();
    const userId = req.user._id;

    const coupons = await Coupon.find({
      $or: [
        { issuedTo: userId },
        { issuedTo: null, trigger: 'stock_alert' }, // clearance coupons only, not campaigns
      ],
    }).sort({ createdAt: -1 });

    const active = [];
    const expiringSoon = [];
    const used = [];
    const expired = [];

    for (const c of coupons) {
      const isExpired = c.expiresAt < now;
      const isUsed = c.issuedTo && c.usedCount >= c.usageLimit;
      const hoursLeft = (c.expiresAt - now) / (1000 * 60 * 60);

      if (isUsed) {
        used.push(c);
      } else if (isExpired) {
        expired.push(c);
      } else if (hoursLeft <= 72) { // 3 days = expiring soon
        expiringSoon.push(c);
      } else {
        active.push(c);
      }
    }

    res.json({ active, expiringSoon, used, expired });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/coupons/validate
router.post('/validate', protect, async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    if (!code || cartTotal == null) {
      return res.status(400).json({ message: 'code and cartTotal required.' });
    }
    const result = await validateCoupon(code, cartTotal, cartItems || [], req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/coupons/recommend — smart recommendation with nudges
router.post('/recommend', protect, async (req, res) => {
  try {
    const { cartTotal, cartItems } = req.body;
    const userId = req.user._id;
    const now = new Date();

    const candidates = await Coupon.find({
      isActive: true,
      expiresAt: { $gt: now },
      $expr: { $lt: ['$usedCount', '$usageLimit'] },
      $or: [{ issuedTo: userId }, { issuedTo: null }],
    });

    const results = [];
    const nudges = [];

    for (const coupon of candidates) {
      if (cartTotal < coupon.minCartValue) {
        const gap = parseFloat((coupon.minCartValue - cartTotal).toFixed(2));
        const label = coupon.type === 'percent' ? `${coupon.value}% off` : `$${coupon.value} off`;
        nudges.push({
          code: coupon.code,
          message: `Add $${gap.toFixed(2)} more to unlock ${label} (${coupon.code})`,
        });
        continue;
      }

      const validation = await validateCoupon(coupon.code, cartTotal, cartItems || [], userId);
      if (validation.valid) {
        results.push({
          code: coupon.code,
          savings: validation.savings,
          type: coupon.type,
          value: coupon.value,
          trigger: coupon.trigger,
          categoryRestriction: coupon.categoryRestriction,
          expiresAt: coupon.expiresAt,
          usedCount: coupon.usedCount,
          usageLimit: coupon.usageLimit,
        });
      }
    }

    results.sort((a, b) => b.savings - a.savings);
    res.json({ best: results[0] || null, alternatives: results.slice(1), nudges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/coupons/personal — filtered by trigger type
router.get('/personal', protect, adminOnly, async (req, res) => {
  try {
    const { trigger } = req.query; // 'purchase' | 'loyalty' | 'stock_alert'
    const query = trigger ? { trigger } : { trigger: { $in: ['purchase', 'loyalty', 'stock_alert'] } };
    const coupons = await Coupon.find(query).sort({ createdAt: -1 }).limit(200);
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/coupons/:id/toggle — pause or resume any coupon (admin)
router.patch('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/coupons/:id — delete any coupon (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/coupons/all — admin: every coupon in the system
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/coupons/campaigns — all campaign coupons with stats
router.get('/campaigns', protect, adminOnly, async (req, res) => {
  try {
    const campaigns = await Coupon.find({ trigger: 'campaign' }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/coupons/campaigns — create a new campaign
router.post('/campaigns', protect, adminOnly, async (req, res) => {
  try {
    const { name, type, value, minCartValue, categoryRestriction, durationDays, usageLimit, perUserLimit } = req.body;

    if (!name || !type || value == null || !durationDays || !usageLimit) {
      return res.status(400).json({ message: 'Missing required campaign fields.' });
    }

    const code = await generateCode('campaign');

    const coupon = await Coupon.create({
      code,
      type,
      value,
      minCartValue: minCartValue || 0,
      categoryRestriction: categoryRestriction || null,
      expiresAt: addDays(Number(durationDays)),
      usageLimit: Number(usageLimit),
      perUserLimit: perUserLimit ? Number(perUserLimit) : null,
      issuedTo: null, // campaigns are always global
      trigger: 'campaign',
      isActive: true,
      campaignName: name,
    });

    res.status(201).json(coupon);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/coupons/campaigns/:id/toggle — pause or resume
router.patch('/campaigns/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, trigger: 'campaign' });
    if (!coupon) return res.status(404).json({ message: 'Campaign not found.' });

    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/coupons/campaigns/:id
router.delete('/campaigns/:id', protect, adminOnly, async (req, res) => {
  try {
    await Coupon.findOneAndDelete({ _id: req.params.id, trigger: 'campaign' });
    res.json({ message: 'Campaign deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/coupons/active-campaign — public, returns the latest active campaign for banner
router.get('/active-campaign', async (req, res) => {
  try {
    const campaign = await Coupon.findOne({
      trigger: 'campaign',
      isActive: true,
      expiresAt: { $gt: new Date() },
      $expr: { $lt: ['$usedCount', '$usageLimit'] },
    }).sort({ createdAt: -1 });

    res.json(campaign || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
