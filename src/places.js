const express = require("express");
const pool = require("./db");
const router = express.Router();

// GET /api/places - Get places with pagination and filters
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            location,
            country,
            category,
            visitors,
            rating,
            accommodation_available,
            address,
            search,
            sortBy = 'location',
            sortOrder = 'asc',
            topOnly = false  // NEW: flag for getting top 10 only
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build WHERE clause dynamically
        let whereConditions = [];
        let queryParams = [];
        let paramCounter = 1;

        // Individual column filters
        if (location) {
            whereConditions.push(`location = $${paramCounter}`);
            queryParams.push(location);
            paramCounter++;
        }

        if (country) {
            whereConditions.push(`country = $${paramCounter}`);
            queryParams.push(country);
            paramCounter++;
        }

        if (category) {
            whereConditions.push(`category = $${paramCounter}`);
            queryParams.push(category);
            paramCounter++;
        }

        if (visitors) {
            whereConditions.push(`visitors = $${paramCounter}`);
            queryParams.push(parseInt(visitors));
            paramCounter++;
        }

        if (rating) {
            whereConditions.push(`rating = $${paramCounter}`);
            queryParams.push(parseFloat(rating));
            paramCounter++;
        }

        if (accommodation_available) {
            whereConditions.push(`accommodation_available = $${paramCounter}`);
            queryParams.push(accommodation_available);
            paramCounter++;
        }

        if (address) {
            whereConditions.push(`address = $${paramCounter}`);
            queryParams.push(address);
            paramCounter++;
        }

        // Global search across multiple columns
        if (search) {
            whereConditions.push(`(
                LOWER(location) LIKE LOWER($${paramCounter}) OR 
                LOWER(country) LIKE LOWER($${paramCounter}) OR 
                LOWER(category) LIKE LOWER($${paramCounter}) OR
                LOWER(address) LIKE LOWER($${paramCounter})
            )`);
            queryParams.push(`%${search}%`);
            paramCounter++;
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        // Validate sortBy to prevent SQL injection
        const allowedSortColumns = [
            'location', 'country', 'category', 'visitors', 
            'rating', 'accommodation_available', 'address'
        ];
        const validSortBy = allowedSortColumns.includes(sortBy.toLowerCase()) 
            ? sortBy.toLowerCase() 
            : 'location';
        const validSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // If topOnly is true, get top 10 by visitors DESC regardless of pagination
        if (topOnly === 'true') {
            const dataQuery = `
                SELECT 
                    location,
                    country,
                    category,
                    visitors,
                    rating,
                    revenue,
                    accommodation_available,
                    placeid,
                    address,
                    imageurl,
                    latitude,
                    longitude,
                    pricelevel,
                    isopen,
                    types
                FROM places
                ${whereClause}
                ORDER BY visitors DESC
                LIMIT 10
            `;
            
            const dataResult = await pool.query(dataQuery, queryParams);

            return res.json({
                success: true,
                data: dataResult.rows,
                topOnly: true
            });
        }

        // Regular pagination logic
        // Get total count
        const countQuery = `SELECT COUNT(*) FROM places ${whereClause}`;
        const countResult = await pool.query(countQuery, queryParams);
        const totalRecords = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalRecords / parseInt(limit));

        // Get paginated data
        const dataQuery = `
            SELECT 
                location,
                country,
                category,
                visitors,
                rating,
                revenue,
                accommodation_available,
                placeid,
                address,
                imageurl,
                latitude,
                longitude,
                pricelevel,
                isopen,
                types
            FROM places
            ${whereClause}
            ORDER BY ${validSortBy} ${validSortOrder}
            LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
        `;
        
        queryParams.push(parseInt(limit), offset);
        const dataResult = await pool.query(dataQuery, queryParams);

        res.json({
            success: true,
            data: dataResult.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalRecords,
                limit: parseInt(limit),
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (err) {
        console.error("Error fetching places:", err);
        res.status(500).json({ 
            success: false, 
            error: "Failed to fetch places",
            message: err.message 
        });
    }
});

// GET /api/places/filters - Get available filter options for ALL columns
router.get("/filters", async (req, res) => {
    try {
        // Get distinct values for each filterable column
        const locationsResult = await pool.query(
            "SELECT DISTINCT location FROM places WHERE location IS NOT NULL ORDER BY location LIMIT 1000"
        );

        const countriesResult = await pool.query(
            "SELECT DISTINCT country FROM places WHERE country IS NOT NULL ORDER BY country"
        );
        
        const categoriesResult = await pool.query(
            "SELECT DISTINCT category FROM places WHERE category IS NOT NULL ORDER BY category"
        );

        const visitorsResult = await pool.query(
            "SELECT DISTINCT visitors FROM places WHERE visitors IS NOT NULL ORDER BY visitors"
        );

        const ratingsResult = await pool.query(
            "SELECT DISTINCT rating FROM places WHERE rating IS NOT NULL ORDER BY rating"
        );

        const accommodationResult = await pool.query(
            "SELECT DISTINCT accommodation_available FROM places WHERE accommodation_available IS NOT NULL ORDER BY accommodation_available"
        );

        const addressResult = await pool.query(
            "SELECT DISTINCT address FROM places WHERE address IS NOT NULL ORDER BY address LIMIT 1000"
        );

        res.json({
            success: true,
            filters: {
                locations: locationsResult.rows.map(r => r.location),
                countries: countriesResult.rows.map(r => r.country),
                categories: categoriesResult.rows.map(r => r.category),
                visitors: visitorsResult.rows.map(r => r.visitors),
                ratings: ratingsResult.rows.map(r => r.rating),
                accommodations: accommodationResult.rows.map(r => r.accommodation_available),
                addresses: addressResult.rows.map(r => r.address)
            }
        });

    } catch (err) {
        console.error("Error fetching filters:", err);
        res.status(500).json({ 
            success: false, 
            error: "Failed to fetch filter options" 
        });
    }
});

router.get("/place-url", async (req, res) => {
  try {
    const { placeid } = req.query;

    if (!placeid) {
      return res.status(400).json({ error: "placeid is required" });
    }

    const details = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeid}&fields=url&key=${process.env.GOOGLE_API_KEY}`
    );

    const data = await details.json();

    if (!data.result || !data.result.url) {
      return res.status(404).json({ error: "No URL found for this place" });
    }

    res.json({ url: data.result.url });

  } catch (err) {
    console.error("Error fetching Google Maps URL:", err);
    res.status(500).json({ error: "Google API error", details: err.message });
  }
});


// GET /api/places/stats - Get statistics
router.get("/stats", async (req, res) => {
    try {
        const { country, category } = req.query;

        let whereConditions = [];
        let queryParams = [];
        let paramCounter = 1;

        if (country) {
            whereConditions.push(`country = $${paramCounter}`);
            queryParams.push(country);
            paramCounter++;
        }

        if (category) {
            whereConditions.push(`category = $${paramCounter}`);
            queryParams.push(category);
            paramCounter++;
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        const statsQuery = `
            SELECT 
                COUNT(*) as total_places,
                COALESCE(AVG(rating), 0) as avg_rating,
                COALESCE(MIN(rating), 0) as min_rating,
                COALESCE(MAX(rating), 0) as max_rating,
                COALESCE(SUM(visitors), 0) as total_visitors,
                COALESCE(AVG(visitors), 0) as avg_visitors
            FROM places
            ${whereClause}
        `;

        console.log("Stats Query:", statsQuery);
        console.log("Stats Params:", queryParams);

        const result = await pool.query(statsQuery, queryParams);
        const stats = result.rows[0];

        console.log("Stats result:", stats);

        res.json({
            success: true,
            stats: {
                totalPlaces: parseInt(stats.total_places) || 0,
                avgRating: parseFloat(stats.avg_rating || 0).toFixed(2),
                minRating: parseFloat(stats.min_rating || 0).toFixed(2),
                maxRating: parseFloat(stats.max_rating || 0).toFixed(2),
                totalVisitors: parseInt(stats.total_visitors || 0),
                avgVisitors: parseFloat(stats.avg_visitors || 0).toFixed(2)
            }
        });

    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ 
            success: false, 
            error: "Failed to fetch statistics",
            message: err.message
        });
    }
});

module.exports = router;