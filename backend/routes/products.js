const express = require('express');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public — customers see all products with current (possibly discounted) prices
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin only below
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, category, basePrice, stock, images, catalogDate } = req.body;

    const product = await Product.create({
      name,
      description,
      category,
      basePrice,
      currentPrice: basePrice,
      stock,
      images: images || [],
      catalogDate: catalogDate || new Date(),
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, category, basePrice, stock, images } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (basePrice && basePrice !== product.basePrice) {
      // log the old price when admin manually changes base price
      product.priceHistory.push({ price: product.currentPrice, reason: 'Admin updated base price' });
      product.basePrice = basePrice;
      product.currentPrice = basePrice;
    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.category = category ?? product.category;
    product.stock = stock ?? product.stock;
    if (images) product.images = images;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
