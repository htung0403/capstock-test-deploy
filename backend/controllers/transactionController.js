/*
  File: controllers/transactionController.js
  Purpose: Handle transaction listing and retrieval for executed trades and cash movements.
*/
const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.deposit = async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.user.id);

  user.balance += amount;
  await user.save();

  const transaction = await Transaction.create({
    user: user._id,
    type: 'deposit',
    amount,
  });

  res.json(transaction);
};

exports.withdraw = async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.user.id);

  if (user.balance < amount) {
    return res.status(400).json({ message: 'Not enough balance' });
  }

  user.balance -= amount;
  await user.save();

  const transaction = await Transaction.create({
    user: user._id,
    type: 'withdraw',
    amount,
  });

  res.json(transaction);
};

exports.getTransactions = async (req, res) => {
  const transactions = await Transaction.find({ user: req.user.id })
    .populate('stock', 'symbol name currentPrice')
    .populate('orderId', 'orderType limitPrice stopPrice')
    .sort({ createdAt: -1 });
  
  // Format transactions with full details
  const formattedTransactions = transactions.map(t => ({
    _id: t._id,
    date: t.createdAt,
    stockSymbol: t.stockSymbol || (t.stock ? t.stock.symbol : 'N/A'),
    stockName: t.stock ? t.stock.name : 'N/A',
    type: t.type.toUpperCase(), // BUY, SELL, DEPOSIT, WITHDRAW
    orderType: t.orderId ? t.orderId.orderType : null, // MARKET, LIMIT, STOP, STOP_LIMIT
    price: t.price || 0, // Execution price
    quantity: t.quantity || 0,
    fee: 0, // Transaction fee (can be added later)
    totalAmount: t.amount || 0, // Total cost/proceeds
    createdAt: t.createdAt,
  }));
  
  res.json(formattedTransactions);
};
