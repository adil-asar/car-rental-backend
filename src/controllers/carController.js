import Car from "../models/car.js";

// Create a new car
export const createCar = async (req, res) => {
    try {
        console.log("=== CREATE CAR REQUEST ===");
        console.log("Headers:", req.headers);
        console.log("Body:", req.body);
        console.log("Body type:", typeof req.body);
        console.log("Body keys:", Object.keys(req.body || {}));

        const carData = req.body;

        // Check if body is empty
        if (!carData || Object.keys(carData).length === 0) {
            return res.status(400).json({
                message: "Request body is empty. Please send car data in JSON format.",
                hint: "Make sure Content-Type is set to application/json"
            });
        }

        // Create new car
        const newCar = await Car.create(carData);

        res.status(201).json({
            message: "Car created successfully",
            data: newCar,
        });
    } catch (error) {
        console.error("Create car error:", error);

        // Handle validation errors
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                message: "Validation Error",
                errors: errors,
            });
        }

        // Handle duplicate registration number
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A car with this registration number already exists",
            });
        }

        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Get all cars with advanced aggregation, filtering, and pagination
export const getAllCars = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // --- 1. Build Match Stage (Filtering) ---
        const matchStage = {};

        // 1a. Generic Search (case-insensitive partial match across multiple fields)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, "i");
            matchStage.$or = [
                { brand: searchRegex },
                { model: searchRegex },
                { category: searchRegex },
                { location: searchRegex },
                { description: searchRegex }
            ];
        }

        // 1b. Specific Filters (Exact Matches for Enums/Strings)
        const allowedFilters = ["brand", "model", "category", "transmission", "fuelType", "status", "location", "registrationNumber"];
        allowedFilters.forEach((field) => {
            if (req.query[field]) {
                matchStage[field] = { $regex: new RegExp(`^${req.query[field]}$`, "i") }; // Case-insensitive exact match
            }
        });

        // 1c. Boolean Filters
        if (req.query.isAvailable !== undefined) {
            matchStage.isAvailable = req.query.isAvailable === "true";
        }

        // 1d. Range Filters (Price, Year, Seats)
        if (req.query.minPrice || req.query.maxPrice) {
            matchStage.price = {};
            if (req.query.minPrice) matchStage.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) matchStage.price.$lte = parseFloat(req.query.maxPrice);
        }

        if (req.query.minYear || req.query.maxYear) {
            matchStage.year = {};
            if (req.query.minYear) matchStage.year.$gte = parseInt(req.query.minYear);
            if (req.query.maxYear) matchStage.year.$lte = parseInt(req.query.maxYear);
        }

        if (req.query.minSeats || req.query.maxSeats) {
            matchStage.seatingCapacity = {};
            if (req.query.minSeats) matchStage.seatingCapacity.$gte = parseInt(req.query.minSeats);
            if (req.query.maxSeats) matchStage.seatingCapacity.$lte = parseInt(req.query.maxSeats);
        }

        // 1e. Array Filters (Features - must match ALL provided features)
        // Example: ?features=sunroof,bluetooth
        if (req.query.features) {
            const features = req.query.features.split(",").map(f => f.trim());
            matchStage.features = { $all: features };
        }

        // --- 2. Sorting Setup ---
        const sortField = req.query.sortBy || "createdAt";
        const sortOrder = req.query.order === "asc" ? 1 : -1;
        const sortStage = { [sortField]: sortOrder };

        // --- 3. Execute Aggregation Pipeline ---
        const pipeline = [
            { $match: matchStage }, // Filter first for performance
            {
                $facet: {
                    // Branch 1: Get Data
                    data: [
                        { $sort: sortStage },
                        { $skip: skip },
                        { $limit: limit },
                        // Populate owner details (lookup in aggregation)
                        {
                            $lookup: {
                                from: "users",
                                localField: "ownedBy",
                                foreignField: "_id",
                                as: "ownerDetails",
                                pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
                            }
                        },
                        {
                            $unwind: {
                                path: "$ownerDetails",
                                preserveNullAndEmptyArrays: true
                            }
                        }
                    ],
                    // Branch 2: Get Total Stats
                    meta: [
                        { $count: "total" }
                    ]
                }
            }
        ];

        const result = await Car.aggregate(pipeline);

        // Format Response
        const data = result[0].data;
        const total = result[0].meta[0] ? result[0].meta[0].total : 0;

        res.status(200).json({
            message: "Cars retrieved successfully",
            data: data,
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Get all cars aggregation error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Get single car by ID
export const getCarById = async (req, res) => {
    try {
        const { id } = req.params;

        const car = await Car.findById(id).populate("ownedBy", "firstName lastName email");

        if (!car) {
            return res.status(404).json({
                message: "Car not found",
            });
        }

        res.status(200).json({
            message: "Car retrieved successfully",
            data: car,
        });
    } catch (error) {
        console.error("Get car by ID error:", error);

        // Handle invalid ObjectId
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid car ID format",
            });
        }

        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Update car
export const updateCar = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Find and update car
        const updatedCar = await Car.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate("ownedBy", "firstName lastName email");

        if (!updatedCar) {
            return res.status(404).json({
                message: "Car not found",
            });
        }

        res.status(200).json({
            message: "Car updated successfully",
            data: updatedCar,
        });
    } catch (error) {
        console.error("Update car error:", error);

        // Handle validation errors
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                message: "Validation Error",
                errors: errors,
            });
        }

        // Handle duplicate registration number
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A car with this registration number already exists",
            });
        }

        // Handle invalid ObjectId
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid car ID format",
            });
        }

        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Delete car
export const deleteCar = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCar = await Car.findByIdAndDelete(id);

        if (!deletedCar) {
            return res.status(404).json({
                message: "Car not found",
            });
        }

        res.status(200).json({
            message: "Car deleted successfully",
            data: {
                id: deletedCar._id,
                brand: deletedCar.brand,
                model: deletedCar.model,
                registrationNumber: deletedCar.registrationNumber,
            },
        });
    } catch (error) {
        console.error("Delete car error:", error);

        // Handle invalid ObjectId
        if (error.name === "CastError") {
            return res.status(400).json({
                message: "Invalid car ID format",
            });
        }

        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Get available cars only
export const getAvailableCars = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Use the static method from the model
        const cars = await Car.findAvailableCars()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("ownedBy", "firstName lastName email");

        const total = await Car.countDocuments({
            isAvailable: true,
            status: "active",
            insuranceValid: true,
        });

        res.status(200).json({
            message: "Available cars retrieved successfully",
            data: cars,
            page: page,
            limit: limit,
            total: total,
        });
    } catch (error) {
        console.error("Get available cars error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
