/*
  File: controller/transactionController.js (duplicate directory)
  Purpose: Mirror of controllers/transactionController.js; should be consolidated to avoid duplication.
*/
const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.deposit = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.balance += amount;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      type: 'deposit',
      amount,
    });

    res.json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

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
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 