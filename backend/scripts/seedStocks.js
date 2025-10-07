/*
  File: scripts/seedStocks.js
  Purpose: Seed initial US stock tickers into the Stock collection.
*/
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const Stock = require('../models/Stock');

const TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'NFLX', name: 'Netflix, Inc.' },
  { symbol: 'IBM', name: 'International Business Machines Corporation' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
];

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
  await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB || undefined });

  let inserted = 0;
  let skipped = 0;

  for (const t of TICKERS) {
    const existing = await Stock.findOne({ symbol: t.symbol });
    if (existing) {
      skipped += 1;
      continue;
    }
    await Stock.create({
      symbol: t.symbol,
      name: t.name,
      currentPrice: 0,
    });
    inserted += 1;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ message: 'Seed completed', inserted, skipped }));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});


