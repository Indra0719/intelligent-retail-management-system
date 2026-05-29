const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect, adminOnly } = require('../middleware/auth');
const { validateCoupon, generatePostPurchaseCoupons } = require('../services/couponService');

// POST /api/orders — place a new order
router.post('/', protect, async (req, res) => {
  try {
    const { items, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item.' });
    }

    const orderItems = [];
    const stockUpdates = [];

    for (const clientItem of items) {
      const product = await Product.findById(clientItem.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${clientItem.productId}` });
      }
      if (product.stock < clientItem.quantity) {
        return res.status(400).json({ message: `Insufficient stock for "${product.name}".` });
      }

      // Price mismatch guard — reject if client price is off by more than 1%
      const priceDiff = Math.abs(clientItem.price - product.currentPrice) / product.currentPrice;
      if (priceDiff > 0.01) {
        return res.status(400).json({
          message: `Price changed for "${product.name}". Please refresh and try again.`,
          productId: product._id,
          currentPrice: product.currentPrice,
        });
      }

      const daysOld = Math.floor((Date.now() - new Date(product.catalogDate)) / (1000 * 60 * 60 * 24));
      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.currentPrice,
        quantity: clientItem.quantity,
        imageUrl: product.images?.[0] || '',
        category: product.category,
        newStock: product.stock - clientItem.quantity,
        daysOld,
      });

      stockUpdates.push({
        id: product._id,
        newStock: product.stock - clientItem.quantity,
      });
    }

    const subtotal = parseFloat(
      orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)
    );

    // Validate coupon if provided
    let couponApplied = { code: null, savings: 0 };
    let appliedCouponDoc = null;

    if (couponCode) {
      const result = await validateCoupon(couponCode, subtotal, orderItems, req.user._id);
      if (!result.valid) {
        return res.status(400).json({ message: result.reason });
      }
      couponApplied = { code: couponCode.toUpperCase(), savings: result.savings };
      appliedCouponDoc = result.coupon;
    }

    const total = parseFloat(Math.max(0, subtotal - couponApplied.savings).toFixed(2));

    // Create order (strip internal fields before saving)
    const savedItems = orderItems.map(({ productId, name, price, quantity, imageUrl }) => ({
      productId, name, price, quantity, imageUrl,
    }));

    const order = await Order.create({
      userId: req.user._id,
      items: savedItems,
      subtotal,
      couponApplied,
      total,
    });

    // Decrement stock
    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(update.id, { $inc: { stock: -update.quantity || 0 } });
      // Directly set to the computed value to be precise
      await Product.findByIdAndUpdate(update.id, { stock: update.newStock });
    }

    // Mark coupon as used + increment per-user usage if campaign coupon
    if (appliedCouponDoc) {
      const couponUpdate = { $inc: { usedCount: 1 } };
      if (appliedCouponDoc.perUserLimit != null) {
        const userKey = req.user._id.toString();
        couponUpdate.$inc[`perUserUsage.${userKey}`] = 1;
      }
      await Coupon.findByIdAndUpdate(appliedCouponDoc._id, couponUpdate);
    }

    // Count orders for loyalty milestones
    const orderCount = await Order.countDocuments({ userId: req.user._id });

    // Total spend for spend_threshold loyalty algorithm
    const allUserOrders = await Order.find({ userId: req.user._id });
    const totalSpend = parseFloat(allUserOrders.reduce((s, o) => s + o.total, 0).toFixed(2));

    // Generate post-purchase coupons
    const couponsGenerated = await generatePostPurchaseCoupons(
      req.user._id,
      orderItems,
      orderCount,
      totalSpend
    );

    res.status(201).json({ order, couponsGenerated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error placing order.' });
  }
});

// GET /api/orders/my — customer's own orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/orders/analytics — admin analytics data
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const orders = await Order.find({ createdAt: { $gte: since } }).sort({ createdAt: 1 });
    const allOrders = await Order.find({});
    const allCoupons = await Coupon.find({});

    // KPIs
    const totalOrders = orders.length;
    const totalRevenue = parseFloat(orders.reduce((s, o) => s + o.total, 0).toFixed(2));
    const avgOrderValue = totalOrders ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;
    const couponsIssued = allCoupons.length;
    const couponsUsed = allCoupons.filter((c) => c.usedCount > 0).length;
    const redemptionRate = couponsIssued
      ? parseFloat(((couponsUsed / couponsIssued) * 100).toFixed(1))
      : 0;
    const totalSavings = orders.reduce((s, o) => s + (o.couponApplied?.savings || 0), 0);
    const avgDiscount = totalOrders
      ? parseFloat((totalSavings / totalOrders).toFixed(2))
      : 0;

    // Orders over time — group by day
    const dayMap = {};
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { date: day, orders: 0, revenue: 0 };
      dayMap[day].orders += 1;
      dayMap[day].revenue = parseFloat((dayMap[day].revenue + order.total).toFixed(2));
    }
    const ordersOverTime = Object.values(dayMap);

    // Top products by revenue
    const productMap = {};
    for (const order of allOrders) {
      for (const item of order.items) {
        const key = item.productId.toString();
        if (!productMap[key]) {
          productMap[key] = { name: item.name, units: 0, revenue: 0 };
        }
        productMap[key].units += item.quantity;
        productMap[key].revenue = parseFloat(
          (productMap[key].revenue + item.price * item.quantity).toFixed(2)
        );
      }
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Coupon performance by trigger
    const triggerMap = {};
    for (const c of allCoupons) {
      if (!triggerMap[c.trigger]) {
        triggerMap[c.trigger] = { trigger: c.trigger, issued: 0, used: 0 };
      }
      triggerMap[c.trigger].issued += 1;
      triggerMap[c.trigger].used += c.usedCount > 0 ? 1 : 0;
    }
    const couponPerformance = Object.values(triggerMap).map((t) => ({
      ...t,
      redemptionRate: t.issued
        ? parseFloat(((t.used / t.issued) * 100).toFixed(1))
        : 0,
    }));

    res.json({
      kpis: { totalOrders, totalRevenue, avgOrderValue, couponsIssued, redemptionRate, avgDiscount },
      ordersOverTime,
      topProducts,
      couponPerformance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/orders — admin: all orders
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find({}).populate('userId', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
