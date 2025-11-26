const pool = require("./db");

async function createLog(userId, action, description = null) {
    try {
        await pool.query(
            `INSERT INTO user_logs (user_id, action, description)
             VALUES ($1, $2, $3)`,
            [userId, action, description]
        );
    } catch (err) {
        console.error("Log creation error:", err.message);
    }
}

module.exports = { createLog };
