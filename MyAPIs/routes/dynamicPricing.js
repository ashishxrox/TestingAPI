const express = require("express");
const router = express.Router();
const Pricing = require("../models/DynamicPricing");
const Joi = require("joi");

// Validation schema using Joi
const pricingSchema = Joi.object({
  destination: Joi.string().required(),
  basePrice: Joi.number().min(0).required(),
  seasonalityFactor: Joi.number().min(0).default(1),
  demandMultiplier: Joi.number().min(0).default(1),
  earlyBirdDiscount: Joi.number().min(0).default(0),
  lastMinuteDiscount: Joi.number().min(0).default(0),
});

// Create Pricing Rule Endpoint
router.post("/create-pricing", async (req, res) => {
  try {
    // Validate request body
    const { error, value } = pricingSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Check if pricing already exists for the destination
    const existingPricing = await Pricing.findOne({ destination: value.destination });
    if (existingPricing) {
      return res.status(400).json({ error: "Pricing for this destination already exists." });
    }

    // Create new pricing entry
    const newPricing = new Pricing(value);
    await newPricing.save();

    res.status(201).json({ message: "Pricing rule created successfully", data: newPricing });
  } catch (err) {
    console.error("Error creating pricing rule:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Pricing Data (All or By Destination)
router.get("/", async (req, res) => {
  try {
    const { destination } = req.query; // Optional filter

    let pricingData;
    if (destination) {
      // Fetch pricing for a specific destination
      pricingData = await Pricing.findOne({ destination: destination });

      if (!pricingData) {
        return res.status(404).json({ error: "Pricing not found for the given destination." });
      }
    } else {
      // Fetch all pricing data
      pricingData = await Pricing.find();
    }

    res.status(200).json({ success: true, length: pricingData.length,data: pricingData });
  } catch (err) {
    console.error("Error fetching pricing data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update Pricing Data
router.put("/update-pricing", async (req, res) => {
    try {
      const { destination, basePrice, seasonalityFactor, demandMultiplier, earlyBirdDiscount, lastMinuteDiscount } = req.body;
  
      if (!destination) {
        return res.status(400).json({ error: "Destination is required to update pricing." });
      }
  
      // Find and update the pricing entry
      const updatedPricing = await Pricing.findOneAndUpdate(
        { destination: destination },
        { $set: { basePrice, seasonalityFactor, demandMultiplier, earlyBirdDiscount, lastMinuteDiscount } },
        { new: true, runValidators: true } // Return the updated document & validate input
      );
  
      if (!updatedPricing) {
        return res.status(404).json({ error: "Pricing not found for the given destination." });
      }
  
      res.status(200).json({ success: true, message: "Pricing updated successfully.", data: updatedPricing });
    } catch (err) {
      console.error("Error updating pricing:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


// Apply Discount Based on Booking Time
router.post("/apply-discount", async (req, res) => {
    try {
      const { destination, bookingDate, travelDate } = req.body;
  
      if (!destination || !bookingDate || !travelDate) {
        return res.status(400).json({ error: "Destination, bookingDate, and travelDate are required." });
      }
  
      // Convert dates to objects
      const bookingTime = new Date(bookingDate);
      const travelTime = new Date(travelDate);
  
      // Calculate the number of days between booking and travel
      const timeDifference = (travelTime - bookingTime) / (1000 * 60 * 60 * 24);
  
      if (timeDifference < 0) {
        return res.status(400).json({ error: "Travel date must be after booking date." });
      }
  
      // Fetch pricing data for the destination
      const pricingData = await Pricing.findOne({ destination });
  
      if (!pricingData) {
        return res.status(404).json({ error: "Pricing not found for the given destination." });
      }
  
      let discount = 0;
  
      // Apply Early Bird Discount if booked 60+ days in advance
      if (timeDifference >= 60) {
        discount = pricingData.earlyBirdDiscount;
      }
      // Apply Last-Minute Discount if booked less than 24 hours before travel
      else if (timeDifference < 1) {
        discount = pricingData.lastMinuteDiscount;
      }
  
      // Calculate final price
      const basePrice = pricingData.basePrice * pricingData.seasonalityFactor * pricingData.demandMultiplier;
      const finalPrice = basePrice - discount;
  
      res.status(200).json({
        success: true,
        destination,
        originalPrice: basePrice.toFixed(2),
        discountApplied: discount.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
        message: discount > 0 ? "Discount applied successfully." : "No discount available."
      });
  
    } catch (err) {
      console.error("Error applying discount:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/final-price", async (req, res) => {
    try {
      const { destination, bookingDate, travelDate } = req.query;
  
      if (!destination || !bookingDate || !travelDate) {
        return res.status(400).json({ error: "Destination, bookingDate, and travelDate are required." });
      }
  
      const bookingTime = new Date(bookingDate);
      const travelTime = new Date(travelDate);
      const timeDifference = (travelTime - bookingTime) / (1000 * 60 * 60 * 24);
  
      if (timeDifference < 0) {
        return res.status(400).json({ error: "Travel date must be after booking date." });
      }
  
      // Fetch Pricing Data
      const pricingData = await Pricing.findOne({ destination });
  
      if (!pricingData) {
        return res.status(404).json({ error: "Pricing not found for the given destination." });
      }
  
      // Base Calculation
      const basePrice = pricingData.basePrice;
      const seasonalityFactor = pricingData.seasonalityFactor;
      const demandMultiplier = pricingData.demandMultiplier;
  
      let finalPrice = basePrice * seasonalityFactor * demandMultiplier;
  
      // Apply Discounts
      let discount = 0;
      if (timeDifference >= 60) {
        discount = pricingData.earlyBirdDiscount;
      } else if (timeDifference < 1) {
        discount = pricingData.lastMinuteDiscount;
      }
      finalPrice -= discount;
  
      res.status(200).json({
        success: true,
        destination,
        originalPrice: (basePrice * seasonalityFactor * demandMultiplier).toFixed(2),
        discountApplied: discount.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
        message: discount > 0 ? "Discount applied successfully." : "No discount applied."
      });
  
    } catch (err) {
      console.error("Error calculating final price:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  


module.exports = router;
