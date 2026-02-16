import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
    {
        // Basic Information
        brand: {
            type: String,
            required: [true, "Brand is required"],
            trim: true,
            index: true,
        },
        model: {
            type: String,
            required: [true, "Model is required"],
            trim: true,
        },
        year: {
            type: Number,
            required: [true, "Year is required"],
            min: [1990, "Year must be 1990 or later"],
            max: [new Date().getFullYear() + 1, "Year cannot be in the future"],
        },

        // Pricing
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },

        // Category and Type
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: {
                values: ["sedan", "suv", "hatchback", "coupe", "convertible", "van", "truck", "luxury", "economy"],
                message: "{VALUE} is not a valid category"
            },
            lowercase: true,
            trim: true,
            index: true,
        },
        transmission: {
            type: String,
            required: [true, "Transmission type is required"],
            enum: {
                values: ["automatic", "manual"],
                message: "{VALUE} is not a valid transmission type"
            },
            lowercase: true,
            trim: true,
        },
        fuelType: {
            type: String,
            required: [true, "Fuel type is required"],
            enum: {
                values: ["petrol", "diesel", "electric", "hybrid", "cng"],
                message: "{VALUE} is not a valid fuel type"
            },
            lowercase: true,
            trim: true,
        },

        // Capacity
        seatingCapacity: {
            type: Number,
            required: [true, "Seating capacity is required"],
            min: [2, "Minimum 2 seats required"],
            max: [15, "Maximum 15 seats allowed"],
        },

        // Location
        location: {
            type: String,
            required: [true, "Location is required"],
            trim: true,
            index: true,
        },

        // Images
        images: {
            type: [String],
            default: [],
            validate: {
                validator: function (v) {
                    return v.length <= 5;
                },
                message: "Maximum 5 images allowed"
            }
        },


        // Description
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            minlength: [5, "Description must be at least 5 characters"],
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },

        // Additional Details
        color: {
            type: String,
            trim: true,
            default: "Not specified",
        },
        registrationNumber: {
            type: String,
            trim: true,
            uppercase: true,
            sparse: true, // Allow multiple null values but unique non-null values
            unique: true,
        },
        mileage: {
            type: Number,
            default: 0,
            min: [0, "Mileage cannot be negative"],
        },

        // Features and Amenities
        features: {
            type: [String],
            default: [],
            validate: {
                validator: function (v) {
                    // Valid feature list
                    const validFeatures = [
                        "abs", "airbags", "parking_sensors", "traction_control",
                        "rear_camera", "bluetooth", "rear_speakers", "mobile_charger",
                        "child_seat", "sunroof", "cruise_control", "climate_control",
                        "front_speakers", "push_start", "keyless_entry", "navigation",
                        "heated_seats", "leather_seats", "usb_ports", "aux_input",
                        "voice_control", "lane_assist", "parking_assist", "fog_lights",
                        "alloy_wheels", "stability_control", "tinted_windows"
                    ];
                    return v.every(feature => validFeatures.includes(feature));
                },
                message: "One or more features are invalid"
            }
        },

        // Availability
        isAvailable: {
            type: Boolean,
            default: true,
            index: true,
        },
        availableFrom: {
            type: Date,
            default: Date.now,
        },

        // Rating and Reviews
        rating: {
            type: Number,
            default: 0,
            min: [0, "Rating cannot be less than 0"],
            max: [5, "Rating cannot be more than 5"],
        },
        totalReviews: {
            type: Number,
            default: 0,
            min: [0, "Total reviews cannot be negative"],
        },

        // Insurance and Documents
        insuranceValid: {
            type: Boolean,
            default: true,
        },
        insuranceExpiryDate: {
            type: Date,
        },

        // Owner/Company Reference (Optional - can be added later)
        ownedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        // Status
        status: {
            type: String,
            enum: ["active", "maintenance", "inactive", "rented"],
            default: "active",
            lowercase: true,
            index: true,
        },

        // Rental Stats
        totalRentals: {
            type: Number,
            default: 0,
            min: [0, "Total rentals cannot be negative"],
        },

        // Additional rental specific fields
        minimumRentalDays: {
            type: Number,
            default: 1,
            min: [1, "Minimum rental days must be at least 1"],
        },
        maximumRentalDays: {
            type: Number,
            default: 30,
            min: [1, "Maximum rental days must be at least 1"],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries and filtering
carSchema.index({ brand: 1, model: 1 });
carSchema.index({ category: 1, isAvailable: 1 });
carSchema.index({ location: 1, isAvailable: 1 });
carSchema.index({ price: 1 }); // Changed from dailyPrice to price
carSchema.index({ rating: -1 });
carSchema.index({ createdAt: -1 });
carSchema.index({ brand: 1, category: 1, fuelType: 1 });
carSchema.index({ transmission: 1, fuelType: 1 });
carSchema.index({ seatingCapacity: 1 });

// Text index for search functionality
carSchema.index({ brand: "text", model: "text", description: "text" });

// Virtual for full car name
carSchema.virtual("firstName").get(function () {
    return `${this.brand} ${this.model} (${this.year})`;
});

// Method to check if car is available for rental
carSchema.methods.isAvailableForRental = function () {
    return this.isAvailable && this.status === "active" && this.insuranceValid;
};

// Static method to find available cars
carSchema.statics.findAvailableCars = function (filters = {}) {
    return this.find({
        isAvailable: true,
        status: "active",
        insuranceValid: true,
        ...filters,
    });
};

export default mongoose.model("Car", carSchema);
