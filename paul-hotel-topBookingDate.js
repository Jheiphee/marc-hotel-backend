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

module.exports.handler = async () => {
  try {
    const result = await pool.query(`
      WITH expanded_dates AS (
        SELECT 
          generate_series(
            check_in_date,
            COALESCE(check_out_date - interval '1 day', check_in_date),
            interval '1 day'
          )::date AS date
        FROM bookings
      ),
      daily_counts AS (
        SELECT 
          date,
          COUNT(*) AS total_bookings
        FROM expanded_dates
        GROUP BY date
      ),
      max_count AS (
        SELECT MAX(total_bookings) AS max_total
        FROM daily_counts
      )
      SELECT *
      FROM daily_counts
      WHERE total_bookings = (SELECT max_total FROM max_count)
      ORDER BY date;
    `);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        message: err.message
      })
    };
  }
};