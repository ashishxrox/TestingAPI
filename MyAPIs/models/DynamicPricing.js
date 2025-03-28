const mongoose = require("mongoose");

const PricingSchema = new mongoose.Schema({
  destination: { type: String, required: true, unique: true },
  basePrice: { type: Number, required: true },
  seasonalityFactor: { type: Number, default: 1 }, // Multiplier for peak/off-peak
  demandMultiplier: { type: Number, default: 1 }, // Adjusted based on demand
  earlyBirdDiscount: { type: Number, default: 0 }, // Discount if booked early
  lastMinuteDiscount: { type: Number, default: 0 }, // Discount if booked late
});

module.exports = mongoose.model("Pricing", PricingSchema);
