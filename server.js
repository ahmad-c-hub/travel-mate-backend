const express = require("express");
const cors = require("cors");
const authRoutes = require("./src/auth");
const placesRoutes = require("./src/places");
const usersRoutes = require("./src/users_NO_DB_CHANGES");
const geminiRoutes = require("./src/gemini");  // ← ADD THIS LINE
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use("/auth", authRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/gemini", geminiRoutes);  // ← ADD THIS LINE

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));