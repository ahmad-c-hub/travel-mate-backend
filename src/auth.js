const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { createLog } = require("./logs");

const router = express.Router();

// SIGNUP
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Hash password
        const hashed = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email, created_at`,
            [username, email, hashed]
        );

        const user = result.rows[0];

        // 🔥 Create log
        await createLog(
            user.id,
            "USER_SIGNUP",
            `User ${user.username} created an account`
        );

        res.json({
            success: true,
            user
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, error: err.message });
    }
});

// LOGOUT
router.post("/logout", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, error: "userId is required" });
        }

        // 🔥 Create log
        await createLog(
            userId,
            "USER_LOGOUT",
            `User with ID ${userId} logged out`
        );

        res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});


// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rowCount === 0)
            return res.status(400).json({ success: false, error: "User not found" });

        const user = result.rows[0];

        // Compare password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(400).json({ success: false, error: "Invalid credentials" });

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // 🔥 Create log
        await createLog(
            user.id,
            "USER_LOGIN",
            `User ${user.username} logged in`
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
