const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Each user can only have one watchlist document
  },
  stocks: [
    {
      type: String,
      required: true,
      uppercase: true, // Store stock symbols in uppercase
    },
  ],
}, {
  timestamps: true,
});

const Watchlist = mongoose.model('Watchlist', WatchlistSchema);

module.exports = Watchlist;
