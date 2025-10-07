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
  const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(transactions);
};
