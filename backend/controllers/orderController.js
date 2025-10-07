/*
  File: controllers/orderController.js
  Purpose: Handle order creation, retrieval, status updates, and cancellation logic.
*/
const Order = require('../models/Order');
const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');

exports.placeOrder = async (req, res) => {
  try {
    const { stockId, type, quantity, price } = req.body;

    // Tạo lệnh
    const order = await Order.create({
      user: req.user.id,
      stock: stockId,
      type,
      quantity,
      price
    });

    // Matching Engine ảo: cập nhật portfolio & balance
    // (Ở bản demo: tự khớp ngay, không cần so khớp phức tạp)

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).populate('stock');
  res.json(orders);
};
