const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/auth");
const placesRoutes = require("./src/places");
const usersRoutes = require("./src/users_NO_DB_CHANGES"); // ← ADD THIS LINE
require("dotenv").config();

const app = express();

// ⭐ FIX CORS ⭐
app.use(cors({
  origin: "http://localhost:5173",   // your frontend (Vite)
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use("/auth", authRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes); // ← ADD THIS LINE

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));