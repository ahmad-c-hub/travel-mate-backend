const express = require("express");
const pool = require("./db");
const { authenticateToken } = require("./middleware");

const router = express.Router();

// GET /api/users/profile - Get current user's profile
router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT id, username, email, created_at, updated_at 
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = result.rows[0];

        res.json({ 
            success: true, 
            user: {
                id: user.id,
                name: user.username,
                username: user.username,
                email: user.email,
                phone: null,
                bio: null,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// PUT /api/users/profile - Update current user's profile
router.put("/profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name and email are required' 
            });
        }

        // Check if email is already taken
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, userId]
        );

        if (existingUser.rowCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already in use' 
            });
        }

        // Update user
        await pool.query(
            `UPDATE users 
             SET username = $1, email = $2 
             WHERE id = $3`,
            [name, email, userId]
        );

        // Get updated user
        const result = await pool.query(
            `SELECT id, username, email, created_at 
             FROM users 
             WHERE id = $1`,
            [userId]
        );

        const user = result.rows[0];

        // Create log directly
        await pool.query(
            `INSERT INTO user_logs (user_id, action, description, created_at) 
             VALUES ($1, $2, $3, NOW())`,
            [userId, 'PROFILE_UPDATE', `User ${user.username} updated their profile`]
        );

        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.username,
                username: user.username,
                email: user.email,
                phone: null,
                bio: null,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// GET /api/users/logs - Get current user's activity logs
router.get("/logs", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        console.log('Fetching logs for user:', userId); // Debug log

        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM user_logs WHERE user_id = $1',
            [userId]
        );
        const totalLogs = parseInt(countResult.rows[0].total);

        console.log('Total logs found:', totalLogs); // Debug log

        // Get logs with pagination
        const result = await pool.query(
            `SELECT id, user_id, action, description, created_at 
             FROM user_logs 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        console.log('Logs returned:', result.rows.length); // Debug log

        res.json({
            success: true,
            logs: result.rows,
            pagination: {
                page: page,
                limit: limit,
                totalLogs: totalLogs,
                totalPages: Math.ceil(totalLogs / limit)
            }
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// GET /api/users/liked-places - Get current user's liked places
router.get("/liked-places", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('Fetching liked places for user:', userId); // Debug

        const result = await pool.query(
            `SELECT 
                p.placeid as id,
                p.location as name,
                p.category,
                p.address,
                p.rating,
                p.imageurl as image_url,
                ulp.liked_at
             FROM user_liked_places as ulp
             JOIN places p ON ulp.place_id = p.placeid
             WHERE ulp.user_id = $1
             ORDER BY ulp.liked_at DESC`,
            [userId]
        );

        console.log('Found places:', result.rows.length); // Debug

        res.json({
            success: true,
            places: result.rows
        });

    } catch (error) {
        console.error('Get liked places error:', error.message); // Full error
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});
// POST /api/users/liked-places - Like a place
router.post("/liked-places", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { placeId } = req.body;

        if (!placeId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Place ID is required' 
            });
        }

        // Check if place exists
        const placeResult = await pool.query(
            'SELECT placeid FROM places WHERE placeid = $1',
            [placeId]
        );

        if (placeResult.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Place not found' 
            });
        }

        // Check if already liked
        const existingLike = await pool.query(
            'SELECT id FROM user_liked_places WHERE user_id = $1 AND place_id = $2',
            [userId, placeId]
        );

        if (existingLike.rowCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Place already in favorites' 
            });
        }

        // Add to favorites
       await pool.query(
    'INSERT INTO user_liked_places (user_id, place_id, liked_at) VALUES ($1, $2, NOW())',
    [userId, placeId]
)

        // Create log directly
        await pool.query(
            `INSERT INTO user_logs (user_id, action, description, created_at) 
             VALUES ($1, $2, $3, NOW())`,
            [userId, 'PLACE_LIKED', `User liked a place (ID: ${placeId})`]
        );

        res.json({
            success: true,
            message: 'Place added to favorites'
        });

    } catch (error) {
        console.error('Like place error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// DELETE /api/users/liked-places/:placeId - Unlike a place
router.delete("/liked-places/:placeId", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const placeId = req.params.placeId;

        const result = await pool.query(
            'DELETE FROM user_liked_places WHERE user_id = $1 AND place_id = $2',
            [userId, placeId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Place not in favorites' 
            });
        }

        // Create log directly
        await pool.query(
            `INSERT INTO user_logs (user_id, action, description, created_at) 
             VALUES ($1, $2, $3, NOW())`,
            [userId, 'PLACE_UNLIKED', `User removed a place from favorites (ID: ${placeId})`]
        );

        res.json({
            success: true,
            message: 'Place removed from favorites'
        });

    } catch (error) {
        console.error('Unlike place error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

module.exports = router;