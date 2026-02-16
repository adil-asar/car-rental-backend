import jwt from "jsonwebtoken";
import User from "../models/user.js";

// Middleware to verify JWT token
export const verifyToken = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.userId = decoded.userId;
        req.userRole = decoded.role;

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

// Middleware to check if user is admin
export const isAdmin = (req, res, next) => {
    if (req.userRole !== "admin") {
        return res.status(403).json({
            message: "Access denied. Admin privileges required."
        });
    }
    next();
};
