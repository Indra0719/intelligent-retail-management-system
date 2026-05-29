const mongoose = require('mongoose');

// Singleton settings document for store configuration
const settingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'store' },

  // Global coupon issuance toggles
  issueThankYou: { type: Boolean, default: true },
  issueLoyalty: { type: Boolean, default: true },
  issueClearance: { type: Boolean, default: true },

  // Loyalty coupon algorithm
  loyaltyAlgorithm: {
    type: { type: String, enum: ['milestones', 'every_nth', 'spend_threshold'], default: 'milestones' },
    // milestones: issue at specific order numbers (e.g. [3, 5, 10])
    milestones: { type: [Number], default: [3, 5, 10] },
    milestoneValues: { type: [Number], default: [20, 25, 30] }, // % off at each milestone
    // every_nth: issue every N orders (e.g. every 3rd)
    nthOrder: { type: Number, default: 5 },
    nthValue: { type: Number, default: 20 }, // % off
    // spend_threshold: issue when cumulative spend exceeds a threshold
    spendThreshold: { type: Number, default: 500 }, // dollars
    spendValue: { type: Number, default: 25 }, // % off
  },

  // Clearance coupon trigger config
  clearanceConfig: {
    stockThreshold: { type: Number, default: 20 }, // trigger when stock drops below this
    minDaysInStore: { type: Number, default: 30 }, // only trigger if product has been in store this many days (slow-moving)
    discountValue: { type: Number, default: 15 }, // % off
    durationDays: { type: Number, default: 7 },
    usageLimit: { type: Number, default: 100 },
  },
}, { _id: false });

module.exports = mongoose.model('Settings', settingsSchema);
