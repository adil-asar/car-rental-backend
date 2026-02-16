import express from "express";
import { signup, login, validateUser, updateUser, deleteUser, getAllUsers } from "../controllers/userController.js";
import { verifyToken, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.get("/validate", validateUser);

// Admin-only routes
router.get("/all", verifyToken, isAdmin, getAllUsers);
router.put("/update/:id", verifyToken, isAdmin, updateUser);
router.delete("/delete/:id", verifyToken, isAdmin, deleteUser);

export default router;
