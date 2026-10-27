const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techphone';
console.log(`Connecting to MongoDB at: ${mongoURI.replace(/:([^@:]+)@/, ':****@')}`); // Hide credentials in logs

mongoose.connect(mongoURI)
  .then(() => {
    console.log('MongoDB connected successfully.');
    // Run initialization checks (Seeding products and default admin)
    initializeDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error details:', err.message);
    console.log('\n======================================================');
    console.log('DATABASE FALLBACK ACTIVATED:');
    console.log('Could not connect to MongoDB server.');
    console.log('Falling back to a local file-based database (db.json)...');
    console.log('======================================================\n');

    global.useLocalDB = true;
    initializeDatabase();
  });

// Import models and routes
const User = require('./models/User');
const Product = require('./models/Product');
const { router: apiRouter, getInitialSeedData } = require('./routes/api');

// Setup API routes
app.use('/api', apiRouter);

// Fallback to home page for any unmatched request (SPA style fallback for public pages)
app.get(/.*/, (req, res, next) => {
  // If request is for an API, don't serve HTML
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database Initialization Helper
async function initializeDatabase() {
  try {
    // 1. Auto-Seed products if empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('Products database is empty. Seeding default smartphones (Android & iPhones)...');
      const seedData = getInitialSeedData();
      await Product.insertMany(seedData);
      console.log('Default products seeded successfully!');
    } else {
      console.log(`Products database contains ${productCount} item(s). Ready!`);
    }

    // 2. Auto-Create default admin user if none exists
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('No admin account found. Creating default admin account...');
      await User.create({
        username: 'admin',
        email: 'admin@techphone.com',
        password: 'adminpassword123',
        role: 'admin'
      });
      console.log('\n======================================================');
      console.log('DEFAULT ADMIN ACCOUNT CREATED:');
      console.log('Email:     admin@techphone.com');
      console.log('Password:  adminpassword123');
      console.log('Role:      Admin (Access to Admin Dashboard)');
      console.log('======================================================\n');
    } else {
      console.log('Admin account check complete: Verified.');
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`Tech Phone E-commerce server is running on port ${PORT}`);
  console.log(`Access the storefront at: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
