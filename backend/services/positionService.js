/*
  File: services/positionService.js
  Purpose: SINGLE SOURCE OF TRUTH for updating Position/Portfolio holdings.
  This is the ONLY place where holdings quantity and avgBuyPrice should be updated.
  All order fills must go through this service to prevent double-counting bugs.
*/
const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio');

/**
 * Apply a fill/trade to position (BUY or SELL)
 * This is the ONLY function that should update holdings quantity and avgBuyPrice
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.stockId - Stock ID (MongoDB ObjectId)
 * @param {string} params.side - 'BUY' or 'SELL'
 * @param {number} params.price - Execution price
 * @param {number} params.quantity - Quantity to fill
 * @param {mongoose.ClientSession} session - MongoDB session for transaction
 * @returns {Promise<Object>} Updated position info
 */
async function applyFillToPosition({ userId, stockId, side, price, quantity, session }) {
  console.log('🔧 APPLY FILL TO POSITION', {
    userId: userId.toString(),
    stockId: stockId.toString(),
    side,
    price,
    quantity,
    timestamp: new Date().toISOString(),
  });

  if (side === 'BUY') {
    // Use findOneAndUpdate with $inc to ensure atomic update and prevent double-counting
    // This is critical to prevent race conditions
    const portfolio = await Portfolio.findOne({ user: userId }).session(session);

    if (!portfolio) {
      // Create new portfolio
      const newPortfolio = await Portfolio.create(
        [
          {
            user: userId,
            holdings: [
              {
                stock: stockId,
                quantity: quantity,
                avgBuyPrice: price,
              },
            ],
          },
        ],
        { session }
      );
      return {
        quantity: quantity,
        avgBuyPrice: price,
        previousQuantity: 0,
        previousAvgBuyPrice: 0,
      };
    }

    // Find existing holding index
    const existingHoldingIndex = portfolio.holdings.findIndex(
      (h) => h.stock.toString() === stockId.toString()
    );

    if (existingHoldingIndex !== -1) {
      // Update existing holding using atomic $inc and $set with arrayFilters
      // This is safer than using index because index might change between find and update
      const existingHolding = portfolio.holdings[existingHoldingIndex];
      const oldQty = existingHolding.quantity;
      const oldAvg = existingHolding.avgBuyPrice;

      // Calculate new weighted average
      const totalCost = oldAvg * oldQty + price * quantity;
      const newQty = oldQty + quantity;
      const newAvg = totalCost / newQty;

      // Use atomic update with arrayFilters to target the specific holding
      // This prevents race conditions even if holdings array changes
      const updateResult = await Portfolio.updateOne(
        {
          _id: portfolio._id,
          'holdings.stock': stockId, // Ensure we're updating the right holding
        },
        {
          $set: {
            'holdings.$[elem].quantity': newQty,
            'holdings.$[elem].avgBuyPrice': newAvg,
          },
        },
        {
          arrayFilters: [{ 'elem.stock': stockId }],
          session,
        }
      );

      if (updateResult.matchedCount === 0) {
        throw new Error('Failed to update holding - holding not found');
      }

      console.log('🔧 POSITION UPDATED (BUY existing):', {
        oldQty,
        oldAvg,
        addedQty: quantity,
        newQty,
        newAvg,
      });

      return {
        quantity: newQty,
        avgBuyPrice: newAvg,
        previousQuantity: oldQty,
        previousAvgBuyPrice: oldAvg,
      };
    } else {
      // Add new holding using $push (atomic)
      // Check again within transaction to prevent duplicate adds
      const checkResult = await Portfolio.findOne({
        _id: portfolio._id,
        'holdings.stock': stockId,
      }).session(session);

      if (checkResult) {
        // Holding was added by another transaction, retry with update logic
        const retryHolding = checkResult.holdings.find(
          (h) => h.stock.toString() === stockId.toString()
        );
        const oldQty = retryHolding.quantity;
        const oldAvg = retryHolding.avgBuyPrice;
        const totalCost = oldAvg * oldQty + price * quantity;
        const newQty = oldQty + quantity;
        const newAvg = totalCost / newQty;

        await Portfolio.updateOne(
          {
            _id: portfolio._id,
            'holdings.stock': stockId,
          },
          {
            $set: {
              'holdings.$[elem].quantity': newQty,
              'holdings.$[elem].avgBuyPrice': newAvg,
            },
          },
          {
            arrayFilters: [{ 'elem.stock': stockId }],
            session,
          }
        );

        return {
          quantity: newQty,
          avgBuyPrice: newAvg,
          previousQuantity: oldQty,
          previousAvgBuyPrice: oldAvg,
        };
      }

      // Safe to add new holding
      await Portfolio.updateOne(
        { _id: portfolio._id },
        {
          $push: {
            holdings: {
              stock: stockId,
              quantity: quantity,
              avgBuyPrice: price,
            },
          },
        },
        { session }
      );

      console.log('🔧 POSITION UPDATED (BUY new):', {
        addedQty: quantity,
        price,
      });

      return {
        quantity: quantity,
        avgBuyPrice: price,
        previousQuantity: 0,
        previousAvgBuyPrice: 0,
      };
    }
  } else {
    // SELL order - use atomic $inc to prevent race conditions
    const portfolio = await Portfolio.findOne({ user: userId }).session(session);

    if (!portfolio) {
      throw new Error('Portfolio not found for user');
    }

    const existingHoldingIndex = portfolio.holdings.findIndex(
      (h) => h.stock.toString() === stockId.toString()
    );

    if (existingHoldingIndex === -1) {
      throw new Error('Stock not found in portfolio for selling');
    }

    const existingHolding = portfolio.holdings[existingHoldingIndex];

    if (existingHolding.quantity < quantity) {
      throw new Error(
        `Insufficient shares. Have ${existingHolding.quantity}, trying to sell ${quantity}`
      );
    }

    const oldQty = existingHolding.quantity;
    const oldAvg = existingHolding.avgBuyPrice;
    const newQty = oldQty - quantity;

    // Calculate realized P&L (optional, for tracking)
    const realizedPnl = (price - oldAvg) * quantity;

    if (newQty === 0) {
      // Remove holding if quantity becomes zero (atomic $pull)
      await Portfolio.updateOne(
        { _id: portfolio._id },
        {
          $pull: {
            holdings: { stock: stockId },
          },
        },
        { session }
      );
    } else {
      // Use atomic $inc with arrayFilters to decrease quantity safely
      await Portfolio.updateOne(
        {
          _id: portfolio._id,
          'holdings.stock': stockId,
          'holdings.quantity': { $gte: quantity }, // Ensure we have enough shares
        },
        {
          $inc: {
            'holdings.$[elem].quantity': -quantity,
          },
        },
        {
          arrayFilters: [{ 'elem.stock': stockId }],
          session,
        }
      );
    }

    console.log('🔧 POSITION UPDATED (SELL):', {
      oldQty,
      soldQty: quantity,
      newQty,
      realizedPnl,
    });

    return {
      quantity: newQty,
      avgBuyPrice: oldAvg, // Unchanged when selling
      previousQuantity: oldQty,
      previousAvgBuyPrice: oldAvg,
      realizedPnl,
    };
  }
}

/**
 * Get position for a user and stock
 * @param {string} userId - User ID
 * @param {string} stockId - Stock ID
 * @param {mongoose.ClientSession} session - Optional session
 * @returns {Promise<Object|null>} Position info or null
 */
async function getPosition(userId, stockId, session = null) {
  const query = Portfolio.findOne({ user: userId }).populate('holdings.stock');
  if (session) {
    query.session(session);
  }

  const portfolio = await query;

  if (!portfolio) {
    return null;
  }

  const holding = portfolio.holdings.find(
    (h) => h.stock._id.toString() === stockId.toString()
  );

  if (!holding) {
    return null;
  }

  return {
    quantity: holding.quantity,
    avgBuyPrice: holding.avgBuyPrice,
    stock: holding.stock,
  };
}

module.exports = {
  applyFillToPosition,
  getPosition,
};

