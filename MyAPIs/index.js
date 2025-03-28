require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bookingsRoutes = require('./routes/bookingsRoutes'); // New routes file
const pricingRoutes = require("./routes/dynamicPricing");
const app = express();
const PORT = 3000;


const enforceJson = (req, res, next) => {
  if (req.method !== "GET" && !req.headers["content-type"]) {
    return res.status(400).json({ success: false, message: "Missing Content-Type. Please use application/json." });
  }
  next();
};

// Middleware to parse JSON bodies
app.use(express.json());

// Apply this middleware to all non-GET requests
app.use(enforceJson);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/travelAgency', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Use the bookings routes
app.use('/bookings', bookingsRoutes);

// Use the dynamic pricing routes
app.use('/pricing', pricingRoutes)

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
