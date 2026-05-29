const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { runPricingEngine, calcUrgencyScore, CATEGORY_MULTIPLIERS } = require('../services/pricingEngine');
const PricingLog = require('../models/PricingLog');
const Product = require('../models/Product');

const router = express.Router();

router.post('/run', protect, adminOnly, async (req, res) => {
  try {
    const result = await runPricingEngine();
    res.json({ message: 'Pricing engine completed', ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Activity log — filterable by time period
router.get('/logs', protect, adminOnly, async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const filter = {};

    const periodMap = { '24h': 1, '7d': 7, '30d': 30 
    if (periodMap[period]) {
      const since = new Date();
      since.setDate(since.getDate() - periodMap[period]);
      filter.runDate = { $gte: since };
    }

    const logs = await PricingLog.find(filter).sort({ runDate: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Current urgency status for all products — powers the health table
router.get('/status', protect, adminOnly, async (req, res) => {
  try {
    const products = await Product.find().select('name category basePrice currentPrice stock catalogDate lastPricingRun images');
    const now = new Date();

    const status = products.map((p) => {
      const daysOld = Math.floor((now - p.catalogDate) / (1000 * 60 * 60 * 24));
      const urgencyScore = calcUrgencyScore(daysOld, p.stock);
      const multiplier = CATEGORY_MULTIPLIERS[p.category] ?? 1.0;
      const discounted = p.currentPrice < p.basePrice;
      const markdownPercent = discounted
        ? parseFloat((((p.basePrice - p.currentPrice) / p.basePrice) * 100).toFixed(2))
        : 0;

      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        basePrice: p.basePrice,
        currentPrice: p.currentPrice,
        stock: p.stock,
        daysOld,
        urgencyScore,
        urgencyDisplay: Math.round(urgencyScore * 100),
        multiplier,
        discounted,
        markdownPercent,
        lastPricingRun: p.lastPricingRun,
        images: p.images,
      };
    });

    // sort by urgency descending
    status.sort((a, b) => b.urgencyScore - a.urgencyScore);
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;