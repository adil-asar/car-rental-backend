import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoute from "./routes/userRoute.js";
import carRoute from "./routes/carRoute.js";
import bookingRoute from "./routes/bookingRoute.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors());

connectDB();

app.get("/", (req, res) => {
  res.send("Car Rental Backend is running ");
});

// Routes
app.use("/users", userRoute);
app.use("/cars", carRoute);
app.use("/bookings", bookingRoute);

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
