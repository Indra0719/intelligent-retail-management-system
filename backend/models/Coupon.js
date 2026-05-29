const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true },
  minCartValue: { type: Number, default: 0 },
  categoryRestriction: { type: String, default: null }, // null = applies to all
  expiresAt: { type: Date, required: true },
  usageLimit: { type: Number, required: true },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: null }, // null = no per-user cap; for campaigns only
  perUserUsage: { type: Map, of: Number, default: {} }, // userId -> redemption count
  issuedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = global
  trigger: { type: String, enum: ['purchase', 'stock_alert', 'loyalty', 'campaign'], required: true },
  campaignName: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.index({ issuedTo: 1, isActive: 1 });
couponSchema.index({ code: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
