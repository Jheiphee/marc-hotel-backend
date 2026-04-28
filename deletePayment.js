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
    const { id } = event.pathParameters;

    const check = await pool.query(
      `SELECT * FROM payments WHERE payment_id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Payment not found'
        }),
      };
    }

    await pool.query(
      `DELETE FROM payments WHERE payment_id = $1`,
      [id]
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: 'Payment deleted successfully'
      }),
    };

  } catch (err) {
    console.error('DELETE PAYMENT ERROR:', err);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: err.message
      }),
    };
  }
};