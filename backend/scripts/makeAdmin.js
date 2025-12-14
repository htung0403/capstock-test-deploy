/*
  Script to make a user an admin
  Usage: node backend/scripts/makeAdmin.js <email_or_username>
*/
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function makeAdmin(identifier) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockcap';
    const dbName = process.env.MONGO_DB;
    
    console.log('🔌 Connecting to MongoDB...');
    console.log('   URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    
    const connectOptions = dbName ? { dbName } : {};
    await mongoose.connect(mongoUri, connectOptions);
    console.log('✅ Connected to MongoDB');

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      console.error(`❌ User not found: ${identifier}`);
      process.exit(1);
    }

    console.log(`📋 Found user: ${user.username} (${user.email})`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   Current roles: ${JSON.stringify(user.roles || [])}`);

    // Update to ADMIN (only ADMIN, no need for USER)
    // Also ensure roles array exists (for backward compatibility)
    user.role = 'ADMIN';
    if (!user.roles || user.roles.length === 0) {
      user.roles = ['ADMIN'];
    } else if (!user.roles.includes('ADMIN')) {
      // If roles exists but doesn't have ADMIN, add it
      user.roles = ['ADMIN']; // Replace with just ADMIN
    } else {
      // Already has ADMIN, just ensure it's correct
      user.roles = ['ADMIN'];
    }
    
    await user.save();

    console.log(`✅ User ${user.username} is now an ADMIN`);
    console.log(`   New role: ${user.role}`);
    console.log(`   New roles: ${JSON.stringify(user.roles)}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Connection Error Tips:');
      console.error('   1. If using MongoDB Atlas, check MONGO_URI in backend/.env');
      console.error('   2. If using local MongoDB, make sure it is running:');
      console.error('      - macOS: brew services start mongodb-community');
      console.error('      - Linux: sudo systemctl start mongod');
      console.error('   3. Check your .env file has correct MONGO_URI');
      console.error('      Example: MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/stockcap');
    }
    process.exit(1);
  }
}

// Get identifier from command line
const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: node backend/scripts/makeAdmin.js <email_or_username>');
  console.error('Example: node backend/scripts/makeAdmin.js admin@example.com');
  console.error('Example: node backend/scripts/makeAdmin.js adminuser');
  process.exit(1);
}

makeAdmin(identifier);

