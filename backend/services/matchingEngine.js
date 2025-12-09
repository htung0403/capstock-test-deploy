/*
  File: services/matchingEngine.js
  Purpose: Handle order matching logic for Market, Limit, Stop, and Stop-Limit orders
  Refactored: Added MongoDB transactions, idempotency checks, and centralized position updates
*/

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const positionService = require('./positionService');

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
   * Validate order before execution (pre-flight check, not in transaction)
   * Note: Final validation happens inside executeOrder within transaction
   */
  async validateOrder(order, executionPrice) {
    const user = await User.findById(order.user);
    
    if (!user) {
      return { valid: false, reason: 'User not found' };
    }

    if (order.type === 'BUY') {
      // Check if user has enough balance
      const totalCost = executionPrice * order.quantity;
      
      if (user.balance < totalCost) {
        return { 
          valid: false, 
          reason: `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${user.balance.toFixed(2)}` 
        };
      }
    } else { // SELL order
      // Check if user has enough shares
      const position = await positionService.getPosition(order.user, order.stock);
      
      if (!position || position.quantity < order.quantity) {
        return { 
          valid: false, 
          reason: `Insufficient shares of ${order.stockSymbol}. Have ${position?.quantity || 0}, need ${order.quantity}` 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Execute the order (update user balance, portfolio, create transaction)
   * REFACTORED: Now uses MongoDB transactions and idempotency checks
   * This is the ONLY place where orders are executed and positions are updated
   */
  async executeOrder(order, executionPrice, quantity) {
    const session = await mongoose.startSession();
    
    try {
      // Validate inputs
      if (!executionPrice || executionPrice <= 0 || isNaN(executionPrice)) {
        throw new Error('Invalid execution price');
      }
      if (!quantity || quantity <= 0 || isNaN(quantity)) {
        throw new Error('Invalid quantity');
      }

      const totalAmount = executionPrice * quantity;

      console.log(`💰 Executing order (with transaction):`, {
        orderId: order._id.toString(),
        type: order.type,
        executionPrice,
        quantity,
        totalAmount,
      });

      // Execute within transaction
      await session.withTransaction(async () => {
        // IDEMPOTENCY CHECK: Reload order within transaction to prevent double-fill
        // Use findOneAndUpdate with status check to ensure atomicity (optimistic locking)
        const currentOrder = await Order.findOneAndUpdate(
          {
            _id: order._id,
            status: { $in: ['PENDING', 'TRIGGERED', 'PARTIALLY_FILLED'] },
            // Additional check: ensure filledQuantity hasn't changed
            $expr: { $lt: ['$filledQuantity', '$quantity'] },
          },
          { $set: { status: 'PARTIALLY_FILLED' } }, // Set to PARTIALLY_FILLED as lock (will update to FILLED later if needed)
          { session, new: true }
        );

        if (!currentOrder) {
          // Order not found or already filled/cancelled - reload to check actual status
          const checkOrder = await Order.findById(order._id).session(session);
          if (checkOrder) {
            console.log(`⚠️ Order ${order._id} status is ${checkOrder.status}, filledQty: ${checkOrder.filledQuantity || 0}, cannot execute`);
            throw new Error(`Order already ${checkOrder.status} or fully filled`);
          }
          throw new Error('Order not found');
        }

        // Check remaining quantity (double-check after atomic update)
        const filledQty = currentOrder.filledQuantity || 0;
        const remainingQty = currentOrder.quantity - filledQty;

        console.log('🔍 IDEMPOTENCY CHECK:', {
          orderId: currentOrder._id.toString(),
          status: currentOrder.status,
          quantity: currentOrder.quantity,
          filledQty,
          remainingQty,
        });

        if (remainingQty <= 0) {
          console.log(`⚠️ Order ${currentOrder._id} already fully filled (remainingQty: ${remainingQty})`);
          throw new Error('Order already fully filled');
        }

        // Use remaining quantity (for now, full fill only - partial fills can be added later)
        const fillQty = Math.min(quantity, remainingQty);

        // Validate balance/holdings within transaction
        const user = await User.findById(currentOrder.user).session(session);
        if (!user) {
          throw new Error('User not found');
        }

        if (currentOrder.type === 'BUY') {
          if (user.balance < totalAmount) {
            throw new Error(
              `Insufficient balance. Need $${totalAmount.toFixed(2)}, have $${user.balance.toFixed(2)}`
            );
          }
        } else {
          // SELL: Validate holdings
          const position = await positionService.getPosition(
            currentOrder.user,
            currentOrder.stock,
            session
          );
          if (!position || position.quantity < fillQty) {
            throw new Error(
              `Insufficient shares. Have ${position?.quantity || 0}, need ${fillQty}`
            );
          }
        }

        // 1. Create Trade record (using Transaction model)
        await Transaction.create(
          [
            {
              user: currentOrder.user,
              type: currentOrder.type.toLowerCase(),
              stock: currentOrder.stock,
              quantity: fillQty,
              price: executionPrice,
              amount: totalAmount,
              orderId: currentOrder._id,
            },
          ],
          { session }
        );

        // 2. Update Position (ONLY through positionService - single source of truth)
        console.log('📊 About to apply fill to position:', {
          orderId: currentOrder._id.toString(),
          userId: currentOrder.user.toString(),
          stockId: currentOrder.stock.toString(),
          side: currentOrder.type,
          price: executionPrice,
          quantity: fillQty,
        });

        const positionResult = await positionService.applyFillToPosition({
          userId: currentOrder.user,
          stockId: currentOrder.stock,
          side: currentOrder.type,
          price: executionPrice,
          quantity: fillQty,
          session,
        });

        console.log('✅ Position updated result:', positionResult);

        // 3. Update Balance
        if (currentOrder.type === 'BUY') {
          await User.updateOne(
            { _id: currentOrder.user },
            { $inc: { balance: -totalAmount } },
            { session }
          );
        } else {
          await User.updateOne(
            { _id: currentOrder.user },
            { $inc: { balance: totalAmount } },
            { session }
          );
        }

        // 4. Update Order (calculate weighted average fill price)
        const prevFilled = currentOrder.filledQuantity || 0;
        const prevAvg = currentOrder.avgFilledPrice || 0;
        const newFilled = prevFilled + fillQty;

        const newAvg =
          newFilled === 0
            ? executionPrice
            : (prevAvg * prevFilled + executionPrice * fillQty) / newFilled;

        const newStatus = newFilled >= currentOrder.quantity ? 'FILLED' : 'PARTIALLY_FILLED';

        await Order.updateOne(
          { _id: currentOrder._id },
          {
            $set: {
              filledQuantity: newFilled,
              avgFilledPrice: newAvg,
              status: newStatus,
              totalAmount: newAvg * newFilled,
              executedAt: new Date(),
            },
          },
          { session }
        );

        console.log(`✅ Order executed (transaction committed): ${currentOrder.type} ${fillQty} shares at $${executionPrice}`);
      });

      // Reload order after transaction
      const updatedOrder = await Order.findById(order._id).populate('stock');

      return {
        success: true,
        message: `Order filled: ${updatedOrder.type} ${updatedOrder.filledQuantity} shares at $${updatedOrder.avgFilledPrice.toFixed(2)}`,
        order: updatedOrder,
        executionPrice: updatedOrder.avgFilledPrice,
        totalAmount: updatedOrder.totalAmount,
      };
    } catch (error) {
      console.error('❌ Error executing order (transaction will rollback):', error);

      // Mark order as rejected (outside transaction, as transaction may have rolled back)
      try {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'REJECTED',
              reason: error.message,
            },
          }
        );
      } catch (updateError) {
        console.error('Failed to update order status:', updateError);
      }

      throw error;
    } finally {
      await session.endSession();
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
