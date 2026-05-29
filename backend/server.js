require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const connectDB = require('./config/db');
const { runPricingEngine } = require('./services/pricingEngine');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const pricingRoutes = require('./routes/pricing');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/upload', uploadRoutes);

// Runs every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running nightly pricing engine...');
  const result = await runPricingEngine();
  console.log(`Pricing done — ${result.updated}/${result.total} products updated`);
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
