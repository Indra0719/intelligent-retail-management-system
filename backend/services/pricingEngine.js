const Product = require('../models/Product');
const PricingLog = require('../models/PricingLog');

const CATEGORY_MULTIPLIERS = {
  Electronics: 1.5,
  Food: 2.0,
  Clothing: 1.2,
  Sports: 1.0,
  Home: 0.8,
  Other: 1.0,
};

const MAX_MARKDOWN = 40;
const PRICE_FLOOR = 50;
const AGE_HORIZON = 90;
const STOCK_HORIZON = 200;

function calcUrgencyScore(daysOld, stock) {
  const ageFactor = Math.min(daysOld / AGE_HORIZON, 1);
  const stockFactor = Math.min(stock / STOCK_HORIZON, 1);
  return parseFloat(((0.7 * ageFactor) + (0.3 * stockFactor)).toFixed(4));
}

function calcMarkdown(daysOld, stock, category) {
  const urgency = calcUrgencyScore(daysOld, stock);
  const multiplier = CATEGORY_MULTIPLIERS[category] ?? 1.0;
  const markdown = urgency * MAX_MARKDOWN * multiplier;
  return Math.min(parseFloat(markdown.toFixed(2)), 100 - PRICE_FLOOR);
}

async function runPricingEngine() {
  const products = await Product.find();
  const now = new Date();
  let updated = 0;
  const logs = [];

  for (const product of products) {
    const daysOld = Math.floor((now - product.catalogDate) / (1000 * 60 * 60 * 24));
    const markdown = calcMarkdown(daysOld, product.stock, product.category);
    const urgency = calcUrgencyScore(daysOld, product.stock);
    const newPrice = parseFloat((product.basePrice * (1 - markdown / 100)).toFixed(2));

    if (newPrice !== product.currentPrice) {
      const multiplier = CATEGORY_MULTIPLIERS[product.category] ?? 1.0;
      const reason = `Age: ${daysOld}d, Stock: ${product.stock} units, Urgency: ${Math.round(urgency * 100)}/100 → -${markdown}% (${product.category} ×${multiplier})`;

      product.priceHistory.push({ price: product.currentPrice, reason });

      // record to dedicated log collection for dashboard queries
      logs.push({
        productId: product._id,
        productName: product.name,
        category: product.category,
        oldPrice: product.currentPrice,
        newPrice,
        markdownPercent: markdown,
        urgencyScore: urgency,
        daysOld,
        stock: product.stock,
        runDate: now,
      });

      product.currentPrice = newPrice;
      product.lastPricingRun = now;
      await product.save();
      updated++;
    }
  }

  if (logs.length > 0) await PricingLog.insertMany(logs);

  return { total: products.length, updated };
}

module.exports = { runPricingEngine, calcMarkdown, calcUrgencyScore, CATEGORY_MULTIPLIERS };
