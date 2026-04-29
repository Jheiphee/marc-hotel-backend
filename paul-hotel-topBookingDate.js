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
      WITH booking_counts AS (
        SELECT 
          DATE(check_in_date) AS date,
          COUNT(*) AS total_bookings
        FROM bookings
        GROUP BY DATE(check_in_date)
      ),
      max_count AS (
        SELECT MAX(total_bookings) AS max_total
        FROM booking_counts
      )
      SELECT *
      FROM booking_counts
      WHERE total_bookings = (SELECT max_total FROM max_count)
      ORDER BY date;
    `);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        data: result.rows
      })
    };

  } catch (err) {
    console.error('TOP BOOKING DATE ERROR:', err);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: err.message
      })
    };
  }
};