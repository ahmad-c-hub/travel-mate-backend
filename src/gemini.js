// Updated gemini.js - Saves to dedicated AI chats table
// Save as: /travel-mate-backend/src/gemini.js

const express = require("express");
const pool = require("./db");
const { authenticateToken } = require("./middleware");
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// POST /api/gemini/chat - Authenticated chatbot with logging to AI chats table
router.post("/chat", authenticateToken, async (req, res) => {
    try {
        const { message, placesContext } = req.body;
        const userId = req.user.id; // From authenticateToken middleware

        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: "Message is required" 
            });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: "GEMINI_API_KEY not configured in .env file" 
            });
        }

        const systemPrompt = `You are a helpful Lebanon tourism assistant. Help users discover places to visit, eat, and stay in Lebanon. Be friendly, concise, and informative.${placesContext || ''}`;

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nUser question: ${message}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            
            return res.status(500).json({ 
                success: false, 
                error: `Gemini API Error: ${errorData.error?.message || 'API request failed'}`,
            });
        }

        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
            "Sorry, I couldn't generate a response. Please try again!";

        // 🔥 SAVE TO DEDICATED AI CHATS TABLE
        try {
            // Insert into ai table
            await pool.query(
                `INSERT INTO ai (user_id, prompt, response, created_at) 
                 VALUES ($1, $2, $3, NOW())`,
                [userId, message, aiResponse]
            );

            console.log(`✅ Saved AI chat for user ${userId}`);
        } catch (dbError) {
            // Don't fail the request if database save fails
            console.error('Failed to save AI chat to database:', dbError);
            // Still return the AI response to the user
        }

        res.json({
            success: true,
            response: aiResponse
        });

    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || "Failed to get AI response"
        });
    }
});

// GET /api/gemini/history - Get user's AI chat history
router.get("/history", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM ai WHERE user_id = $1',
            [userId]
        );
        const totalChats = parseInt(countResult.rows[0].total);

        // Get chat history with pagination
        const result = await pool.query(
            `SELECT id, prompt, response, created_at 
             FROM ai 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        res.json({
            success: true,
            chats: result.rows,
            pagination: {
                page: page,
                limit: limit,
                totalChats: totalChats,
                totalPages: Math.ceil(totalChats / limit)
            }
        });

    } catch (error) {
        console.error('Get AI history error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

// DELETE /api/gemini/history/:chatId - Delete a specific chat
router.delete("/history/:chatId", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const chatId = req.params.chatId;

        const result = await pool.query(
            'DELETE FROM ai WHERE id = $1 AND user_id = $2',
            [chatId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Chat not found or unauthorized' 
            });
        }

        res.json({
            success: true,
            message: 'Chat deleted successfully'
        });

    } catch (error) {
        console.error('Delete AI chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message 
        });
    }
});

module.exports = router;