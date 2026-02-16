import express from "express";
import {
    createCar,
    getAllCars,
    getCarById,
    updateCar,
    deleteCar,
    getAvailableCars,
} from "../controllers/carController.js";
import { verifyToken, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes - Anyone can view cars
router.get("/", getAllCars);
router.get("/available", getAvailableCars);
router.get("/:id", getCarById);

// Admin-only routes - Only admins can create, update, delete
router.post("/", verifyToken, isAdmin, createCar);
router.put("/:id", verifyToken, isAdmin, updateCar);
router.delete("/:id", verifyToken, isAdmin, deleteCar);

export default router;
