/*
  File: server.js
  Purpose: Initialize Express app, connect to MongoDB, register middlewares and API routes, and start the HTTP server.
  
  CHANGES (2025-10-20):
  - Integrated `aiRoutes` for AI analysis functionalities (sentiment, price, comprehensive analysis).
  - Integrated `chatbotRoutes` for AI chatbot functionality (separate chat page and widget).
*/
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const stockRoutes = require('./routes/stockRoutes');
const orderRoutes = require('./routes/orderRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const newsRoutes = require('./routes/newsRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const aiRoutes = require('./routes/aiRoutes'); // Import the new AI routes
const chatbotRoutes = require('./routes/chatbotRoutes'); // Import the new chatbot routes
const paymentRoutes = require('./routes/paymentRoutes');
const writerRoutes = require('./routes/writerRoutes'); // Import new writer routes
const editorRoutes = require('./routes/editorRoutes'); // Import new editor routes
const categoryRoutes = require('./routes/categoryRoutes'); // Import new category routes
const tagRoutes = require('./routes/tagRoutes'); // Import new tag routes
const marketRoutes = require('./routes/marketRoutes'); // Import new market routes

const app = express();
const { startScheduler } = require('./scheduler/refreshScheduler');

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai', aiRoutes); // Use the new AI routes
app.use('/api/chatbot', chatbotRoutes); // Use the new chatbot routes
app.use('/api/payments', paymentRoutes);
app.use('/api/writer', writerRoutes); // Use new writer routes
app.use('/api/editor', editorRoutes); // Use new editor routes
app.use('/api/categories', categoryRoutes); // Use new category routes
app.use('/api/tags', tagRoutes); // Use new tag routes
app.use('/api/market', marketRoutes); // Use new market routes

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error fallback
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
    await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB || undefined });
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Start scheduler if enabled
      const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
      startScheduler(baseUrl);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start(); 