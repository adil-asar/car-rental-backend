import { Booking, bookingValidationSchema } from "../models/booking.js";
import Car from "../models/car.js";

// Create a new booking
export const bookCar = async (req, res) => {
    try {
        console.log("=== BOOK CAR REQUEST ===");
        console.log("Body:", req.body);

        // Validate request body
        const validation = bookingValidationSchema.safeParse(req.body);

        if (!validation.success) {
            const errors = validation.error.errors.map((err) => err.message);
            return res.status(400).json({
                message: "Validation Error",
                errors: errors,
            });
        }

        const { car, startDate, endDate, totalAmount, status } = validation.data;

        // Check if car exists
        const carExists = await Car.findById(car);
        if (!carExists) {
            return res.status(404).json({
                message: "Car not found",
            });
        }

        // Optional: Check if car is available for the dates (simple check)
        // This is a basic check. Real-world would check overlaps.
        if (!carExists.isAvailable) {
            return res.status(400).json({
                message: "Car is currently unavailable",
            });
        }

        // Create booking
        // The user ID should come from the authenticated user (req.userId from middleware)
        const userId = req.userId || req.body.user;

        if (!userId) {
            return res.status(401).json({
                message: "User authentication required",
            });
        }

        const newBooking = await Booking.create({
            car,
            user: userId,
            startDate,
            endDate,
            totalAmount,
            status,

        });

        res.status(201).json({
            message: "Car booked successfully",
            data: newBooking,
        });
    } catch (error) {
        console.error("Book car error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Get user specific bookings with pagination
export const getUserBookings = async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const bookings = await Booking.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("car", "brand model images price");

        const total = await Booking.countDocuments({ user: userId });

        res.status(200).json({
            message: "User bookings retrieved successfully",
            data: bookings,
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Get user bookings error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Get all bookings (Admin)
// Get all bookings (Admin) with aggregation and pagination
export const getAllBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // --- 1. Match Stage (Filtering) ---
        const matchStage = {};

        // Status Filter
        if (req.query.status) {
            matchStage.status = req.query.status;
        }

        // Date Range Filter (based on startDate)
        if (req.query.startDate || req.query.endDate) {
            matchStage.startDate = {};
            if (req.query.startDate) matchStage.startDate.$gte = new Date(req.query.startDate);
            if (req.query.endDate) matchStage.startDate.$lte = new Date(req.query.endDate);
        }

        // --- 2. Sorting Setup ---
        const sortField = req.query.sortBy || "createdAt";
        const sortOrder = req.query.order === "asc" ? 1 : -1;
        const sortStage = { [sortField]: sortOrder };

        // --- 3. Aggregation Pipeline ---
        const pipeline = [
            { $match: matchStage },
            {
                $facet: {
                    data: [
                        { $sort: sortStage },
                        { $skip: skip },
                        { $limit: limit },
                        // Populate Car
                        {
                            $lookup: {
                                from: "cars",
                                localField: "car",
                                foreignField: "_id",
                                as: "carDetails"
                            }
                        },
                        { $unwind: "$carDetails" }, // Car is required
                        // Populate User
                        {
                            $lookup: {
                                from: "users",
                                localField: "user",
                                foreignField: "_id",
                                as: "userDetails",
                                pipeline: [{ $project: { firstName: 1, email: 1, phone: 1 } }]
                            }
                        },
                        { $unwind: "$userDetails" }, // User is required
                        // Project specific fields (optional, but good for clean response)
                        {
                            $project: {
                                _id: 1,
                                status: 1,
                                startDate: 1,
                                endDate: 1,
                                totalAmount: 1,
                                createdAt: 1,
                                car: {
                                    _id: "$carDetails._id",
                                    brand: "$carDetails.brand",
                                    model: "$carDetails.model",
                                    image: { $arrayElemAt: ["$carDetails.images", 0] }, // Use first image from array
                                    price: "$carDetails.price",
                                    registrationNumber: "$carDetails.registrationNumber"
                                },
                                user: "$userDetails"
                            }
                        }
                    ],
                    meta: [
                        { $count: "total" }
                    ]
                }
            }
        ];

        const result = await Booking.aggregate(pipeline);

        const data = result[0].data;
        const total = result[0].meta[0] ? result[0].meta[0].total : 0;

        res.status(200).json({
            message: "All bookings retrieved successfully",
            data: data,
            page: page,
            limit: limit,
            total: total,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Get all bookings aggregation error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Update booking status (Admin)
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        booking.status = status || booking.status;
        await booking.save();

        res.status(200).json({
            message: "Booking updated successfully",
            data: booking,
        });
    } catch (error) {
        console.error("Update booking error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// Delete booking (Admin)
export const deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedBooking = await Booking.findByIdAndDelete(id);

        if (!deletedBooking) {
            return res.status(404).json({
                message: "Booking not found",
            });
        }

        res.status(200).json({
            message: "Booking deleted successfully",
        });
    } catch (error) {
        console.error("Delete booking error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
