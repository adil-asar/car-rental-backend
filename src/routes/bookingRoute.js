import express from "express";
import {
    bookCar,
    getAllBookings,
    updateBooking,
    deleteBooking,
    getUserBookings,
} from "../controllers/bookingController.js";
import { verifyToken, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// User routes
router.post("/", verifyToken, bookCar);
router.get("/my-bookings", verifyToken, getUserBookings);

// Admin routes
router.get("/", verifyToken, isAdmin, getAllBookings);
router.put("/:id", verifyToken, isAdmin, updateBooking);
router.delete("/:id", verifyToken, isAdmin, deleteBooking);

export default router;
