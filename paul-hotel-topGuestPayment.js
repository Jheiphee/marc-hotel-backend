const { Pool } = require('pg');

// 🔥 reusable DB connection
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
        p.first_name,
        p.last_name,
        SUM(pay.payment_amount) AS total_payment
      FROM payments pay
      JOIN bookings b ON pay.booking_id = b.booking_id
      JOIN guests g ON b.guest_id = g.guest_id
      JOIN profiles p ON g.profile_id = p.profile_id
      GROUP BY p.first_name, p.last_name
      ORDER BY total_payment DESC
      LIMIT 1
    `);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        data: result.rows[0] || null
      })
    };

  } catch (error) {
    console.error('TOP GUEST PAYMENT ERROR:', error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        message: error.message
      })
    };
  }
};