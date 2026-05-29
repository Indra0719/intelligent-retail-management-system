const mongoose = require("mongoose");

// One document per price change event — gives us clean queryable history
const pricingLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  oldPrice: { type: Number, required: true },
  newPrice: { type: Number, required: true },
  markdownPercent: { type: Number, required: true },
  urgencyScore: { type: Number, required: true }, // 0–1
  daysOld: { type: Number, required: true },
  stock: { type: Number, required: true },
  runDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PricingLog", pricingLogSchema);
