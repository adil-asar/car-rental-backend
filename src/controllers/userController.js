import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  signupSchema,
  loginSchema,
  updateUserSchema,
} from "../config/zodSchema.js";

export const signup = async (req, res) => {
  try {
    // 1. Validate input using Zod
    const validation = signupSchema.safeParse(req.body);

    if (!validation.success) {
      console.log("Validation failed:", validation);
      const errorMessages = validation.error.errors.map((err) => err.message);
      return res.status(400).json({
        message: "Validation Error",
        errors: errorMessages,
      });
    }

    // Destructure validated data
    const { firstName, lastName, email, password, role } = validation.data;

    // 2. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    });

    // 5. Send response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    // duplicate key error fallback
    if (error.code === 11000) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const login = async (req, res) => {
  try {
    // 1. Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      const errorMessages = validation.error.errors.map((err) => err.message);
      return res.status(400).json({
        message: "Validation Error",
        errors: errorMessages,
      });
    }

    const { email, password } = validation.data;

    // 2. Find user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 4. Generate Token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 5. Send response
    res.status(200).json({
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const validateUser = async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate input
    const validation = updateUserSchema.safeParse(req.body);
    if (!validation.success) {
      const errorMessages = validation.error.errors.map((err) => err.message);
      return res.status(400).json({
        message: "Validation Error",
        errors: errorMessages,
      });
    }

    const updateData = { ...validation.data };

    // 2. If password is being updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // 3. Update user
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error(error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already in use by another account",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete user
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User deleted successfully",
      deletedUser: {
        id: deletedUser._id,
        firstName: deletedUser.firstName,
        lastName: deletedUser.lastName,
        email: deletedUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Get pagination parameters from query string (with defaults)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get search parameter for email
    const emailSearch = req.query.email || "";

    // Build search filter
    const searchFilter = {};
    if (emailSearch) {
      // Case-insensitive partial match for email
      searchFilter.email = { $regex: emailSearch, $options: "i" };
    }

    // Execute query with pagination
    const users = await User.find(searchFilter)
      .select("-password") // Exclude password field
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const total = await User.countDocuments(searchFilter);

    // Get status counts
    const activeCount = await User.countDocuments({ ...searchFilter, status: "active" });
    const inactiveCount = await User.countDocuments({ ...searchFilter, status: "inactive" });
    const suspendedCount = await User.countDocuments({ ...searchFilter, status: "suspended" });

    // Get role counts
    const adminCount = await User.countDocuments({ ...searchFilter, role: "admin" });
    const userCount = await User.countDocuments({ ...searchFilter, role: "user" });

    // Send response with pagination data
    res.status(200).json({
      message: "Users retrieved successfully",
      data: users,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalActive: activeCount,
        totalInactive: inactiveCount,
        totalSuspended: suspendedCount,
        totalAdmins: adminCount,
        totalUsers: userCount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
