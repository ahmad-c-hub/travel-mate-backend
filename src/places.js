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
      sortBy = "location",
      sortOrder = "asc",
      topOnly = false,
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCounter = 1;

    // Individual filters
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

    // Search
    if (search) {
      whereConditions.push(`
        (
          LOWER(location) LIKE LOWER($${paramCounter}) OR
          LOWER(country) LIKE LOWER($${paramCounter}) OR
          LOWER(category) LIKE LOWER($${paramCounter}) OR
          LOWER(address) LIKE LOWER($${paramCounter})
        )
      `);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Allowed sort columns
    const allowedSortColumns = [
      "location",
      "country",
      "category",
      "visitors",
      "rating",
      "accommodation_available",
      "address",
    ];

    const validSortBy = allowedSortColumns.includes(sortBy.toLowerCase())
      ? sortBy.toLowerCase()
      : "location";

    const validSortOrder =
      sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

    // Top 10 by visitors
    if (topOnly === "true") {
      const dataQuery = `
        SELECT *
        FROM places
        ${whereClause}
        ORDER BY visitors DESC
        LIMIT 10
      `;

      const result = await pool.query(dataQuery, queryParams);
      return res.json({ success: true, data: result.rows, topOnly: true });
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM places ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    // Paginated query
    const dataQuery = `
      SELECT *
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
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching places:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch places", message: err.message });
  }
});


module.exports = router;