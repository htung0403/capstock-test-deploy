/*
  File: services/matchingEngine.js
  Purpose: Handle order matching logic for Market, Limit, Stop, and Stop-Limit orders
*/

const Order = require('../models/Order');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');

class MatchingEngine {
  /**
   * Process a new order
   * @param {Object} order - The order to process
   * @returns {Object} - Result of order processing
   */
  async processOrder(order) {
    try {
      // Get current market price
      const stock = await Stock.findOne({ symbol: order.stockSymbol });
      if (!stock) {
        throw new Error('Stock not found');
      }

      const currentPrice = stock.currentPrice;

      // Process based on order type
      switch (order.orderType) {
        case 'MARKET':
          return await this.processMarketOrder(order, currentPrice);
        
        case 'LIMIT':
          return await this.processLimitOrder(order, currentPrice);
        
        case 'STOP':
          return await this.processStopOrder(order, currentPrice);
        
        case 'STOP_LIMIT':
          return await this.processStopLimitOrder(order, currentPrice);
        
        default:
          throw new Error('Invalid order type');
      }
    } catch (error) {
      console.error('❌ Error processing order:', error);
      
      // Mark order as rejected
      order.status = 'REJECTED';
      order.reason = error.message;
      await order.save();
      
      throw error;
    }
  }

  /**
   * Process Market Order - Execute immediately at current price
   */
  async processMarketOrder(order, currentPrice) {
    console.log(`📊 Processing MARKET ${order.type} order for ${order.stockSymbol}`);

    // Validate user balance/holdings
    const validation = await this.validateOrder(order, currentPrice);
    if (!validation.valid) {
      order.status = 'REJECTED';
      order.reason = validation.reason;
      await order.save();
      return { success: false, message: validation.reason, order };
    }

    // Execute the order
    const result = await this.executeOrder(order, currentPrice, order.quantity);
    
    return result;
  }

  /**
   * Process Limit Order - Execute only if price condition is met
   */
  async processLimitOrder(order, currentPrice) {
    console.log(`📊 Processing LIMIT ${order.type} order for ${order.stockSymbol}`);

    // Check if limit price condition is met
    const canExecute = order.type === 'BUY' 
      ? currentPrice <= order.limitPrice 
      : currentPrice >= order.limitPrice;

    if (canExecute) {
      // Validate user balance/holdings
      const validation = await this.validateOrder(order, order.limitPrice);
      if (!validation.valid) {
        order.status = 'REJECTED';
        order.reason = validation.reason;
        await order.save();
        return { success: false, message: validation.reason, order };
      }

      // Execute at limit price
      const result = await this.executeOrder(order, order.limitPrice, order.quantity);
      return result;
    } else {
      // Keep order pending
      order.status = 'PENDING';
      await order.save();
      return { 
        success: true, 
        message: `Limit order placed. Waiting for price to ${order.type === 'BUY' ? 'drop to' : 'rise to'} $${order.limitPrice}`,
        order 
      };
    }
  }

  /**
   * Process Stop Order - Trigger market order when stop price is hit
   */
  async processStopOrder(order, currentPrice) {
    console.log(`📊 Processing STOP ${order.type} order for ${order.stockSymbol}`);

    // Check if stop price is triggered
    const isTriggered = order.type === 'BUY'
      ? currentPrice >= order.stopPrice  // Buy stop: trigger when price rises above stop
      : currentPrice <= order.stopPrice; // Sell stop: trigger when price falls below stop

    if (isTriggered) {
      // Change status to TRIGGERED and execute as market order
      order.status = 'TRIGGERED';
      await order.save();

      console.log(`🎯 Stop order triggered at $${currentPrice}`);

      // Validate user balance/holdings
      const validation = await this.validateOrder(order, currentPrice);
      if (!validation.valid) {
        order.status = 'REJECTED';
        order.reason = validation.reason;
        await order.save();
        return { success: false, message: validation.reason, order };
      }

      // Execute at current market price
      const result = await this.executeOrder(order, currentPrice, order.quantity);
      return result;
    } else {
      // Keep order pending
      order.status = 'PENDING';
      await order.save();
      return { 
        success: true, 
        message: `Stop order placed. Will trigger when price ${order.type === 'BUY' ? 'rises to' : 'falls to'} $${order.stopPrice}`,
        order 
      };
    }
  }

  /**
   * Process Stop-Limit Order - Trigger limit order when stop price is hit
   */
  async processStopLimitOrder(order, currentPrice) {
    console.log(`📊 Processing STOP-LIMIT ${order.type} order for ${order.stockSymbol}`);

    // Check if stop price is triggered
    const isTriggered = order.type === 'BUY'
      ? currentPrice >= order.stopPrice
      : currentPrice <= order.stopPrice;

    if (isTriggered) {
      order.status = 'TRIGGERED';
      await order.save();

      console.log(`🎯 Stop-Limit order triggered at $${currentPrice}`);

      // Now check if limit condition is met
      const canExecute = order.type === 'BUY'
        ? currentPrice <= order.limitPrice
        : currentPrice >= order.limitPrice;

      if (canExecute) {
        // Validate user balance/holdings
        const validation = await this.validateOrder(order, order.limitPrice);
        if (!validation.valid) {
          order.status = 'REJECTED';
          order.reason = validation.reason;
          await order.save();
          return { success: false, message: validation.reason, order };
        }

        // Execute at limit price
        const result = await this.executeOrder(order, order.limitPrice, order.quantity);
        return result;
      } else {
        // Keep as triggered, waiting for limit price
        return { 
          success: true, 
          message: `Stop-Limit triggered. Waiting for price to ${order.type === 'BUY' ? 'drop to' : 'rise to'} limit $${order.limitPrice}`,
          order 
        };
      }
    } else {
      // Keep order pending
      order.status = 'PENDING';
      await order.save();
      return { 
        success: true, 
        message: `Stop-Limit order placed. Will trigger at $${order.stopPrice}, then execute at limit $${order.limitPrice}`,
        order 
      };
    }
  }

  /**
   * Validate order before execution
   */
  async validateOrder(order, executionPrice) {
    const user = await User.findById(order.user);
    
    if (order.type === 'BUY') {
      // Check if user has enough balance
      const totalCost = executionPrice * order.quantity;
      
      if (user.balance < totalCost) {
        return { 
          valid: false, 
          reason: `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${user.balance.toFixed(2)}` 
        };
      }
    } else {
      // Check if user has enough shares
      const portfolio = await Portfolio.findOne({ 
        user: order.user, 
        stock: order.stock 
      });

      if (!portfolio || portfolio.quantity < order.quantity) {
        return { 
          valid: false, 
          reason: `Insufficient shares. Have ${portfolio?.quantity || 0}, need ${order.quantity}` 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Execute the order (update user balance, portfolio, create transaction)
   */
  async executeOrder(order, executionPrice, quantity) {
    const user = await User.findById(order.user);
    
    // Validate inputs to prevent NaN
    if (!executionPrice || executionPrice <= 0) {
      throw new Error('Invalid execution price');
    }
    if (!quantity || quantity <= 0) {
      throw new Error('Invalid quantity');
    }
    
    const totalAmount = executionPrice * quantity;

    console.log(`💰 Executing order:`, {
      type: order.type,
      executionPrice,
      quantity,
      totalAmount,
      userBalance: user.balance
    });

    try {
      if (order.type === 'BUY') {
        // Deduct balance
        user.balance -= totalAmount;
        await user.save();

        // Update or create portfolio
        let portfolio = await Portfolio.findOne({ 
          user: order.user, 
          stock: order.stock 
        });

        if (portfolio) {
          // Update average buy price
          const totalCost = (portfolio.avgBuyPrice * portfolio.quantity) + totalAmount;
          portfolio.quantity += quantity;
          portfolio.avgBuyPrice = totalCost / portfolio.quantity;
          await portfolio.save();
        } else {
          // Create new portfolio entry
          portfolio = await Portfolio.create({
            user: order.user,
            stock: order.stock,
            quantity: quantity,
            avgBuyPrice: executionPrice
          });
        }

      } else {
        // SELL
        // Add to balance
        user.balance += totalAmount;
        await user.save();

        // Update portfolio
        const portfolio = await Portfolio.findOne({ 
          user: order.user, 
          stock: order.stock 
        });

        portfolio.quantity -= quantity;
        
        if (portfolio.quantity === 0) {
          await portfolio.deleteOne();
        } else {
          await portfolio.save();
        }
      }

      // Update order
      order.filledQuantity = quantity;
      order.avgFilledPrice = executionPrice;
      order.totalAmount = totalAmount;
      order.status = 'FILLED';
      order.executedAt = new Date();
      await order.save();

      // Create transaction record
      await Transaction.create({
        user: order.user,
        type: order.type.toLowerCase(),
        stock: order.stock,
        quantity: quantity,
        price: executionPrice,
        amount: totalAmount,
        orderId: order._id
      });

      console.log(`✅ Order executed: ${order.type} ${quantity} shares at $${executionPrice}`);

      return { 
        success: true, 
        message: `Order filled: ${order.type} ${quantity} shares at $${executionPrice.toFixed(2)}`,
        order,
        executionPrice,
        totalAmount
      };

    } catch (error) {
      console.error('❌ Error executing order:', error);
      
      // Rollback if needed
      order.status = 'REJECTED';
      order.reason = error.message;
      await order.save();

      throw error;
    }
  }

  /**
   * Check pending/triggered orders for a stock and try to match them
   * This should be called periodically or when price updates
   */
  async checkPendingOrders(stockSymbol, currentPrice) {
    try {
      const pendingOrders = await Order.find({
        stockSymbol,
        status: { $in: ['PENDING', 'TRIGGERED'] }
      }).populate('user stock');

      console.log(`🔍 Checking ${pendingOrders.length} pending orders for ${stockSymbol} at $${currentPrice}`);

      for (const order of pendingOrders) {
        await this.processOrder(order);
      }

    } catch (error) {
      console.error('❌ Error checking pending orders:', error);
    }
  }
}

module.exports = new MatchingEngine();
