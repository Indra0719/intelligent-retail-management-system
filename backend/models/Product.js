const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  price: Number,
  reason: String,
  date: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  basePrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  stock: { type: Number, required: true, min: 0 },
  images: { type: [String], default: [] },
  catalogDate: { type: Date, default: Date.now }, // used to calculate inventory age
  priceHistory: [priceHistorySchema],
  lastPricingRun: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
