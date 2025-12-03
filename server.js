const express = require("express");
const cors = require('cors');  // ← ADD THIS
const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://katerji-project.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const authRoutes = require("./src/auth");
const placesRoutes = require("./src/places");
const usersRoutes = require("./src/users_NO_DB_CHANGES");
const geminiRoutes = require("./src/gemini");
require("dotenv").config();

// DELETE THE OLD CORS HERE (lines 26-29)

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use("/auth", authRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/gemini", geminiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));