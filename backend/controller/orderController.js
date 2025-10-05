/*
  File: controller/orderController.js (duplicate directory)
  Purpose: Mirror of controllers/orderController.js; should be consolidated to avoid duplication.
*/
const Order = require('../models/Order');

exports.placeOrder = async (req, res) => {
  try {
    const { stockId, stockSymbol, type, quantity, price } = req.body;
    if (!stockSymbol || !type || !quantity || !price) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const order = await Order.create({
      user: req.user.id,
      stock: stockId || undefined,
      stockSymbol,
      type,
      quantity,
      price,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate('stock');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 