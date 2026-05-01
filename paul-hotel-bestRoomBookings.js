const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports.handler = async (event) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.room_number,
        COUNT(b.booking_id) AS total_bookings
      FROM bookings b
      JOIN rooms r ON b.room_id = r.room_id
      GROUP BY r.room_number
      ORDER BY total_bookings DESC
      LIMIT 1
    `);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",

        // 🔥 FIXED (may comma na + complete)
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        data: result.rows[0] || null
      })
    };

  } catch (error) {
    console.error('BEST ROOM BOOKINGS ERROR:', error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",

        // 🔥 SAME HEADERS
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        message: error.message
      })
    };
  }
};