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
    const { keyword } = event.queryStringParameters || {};

    const result = await pool.query(
      `
      SELECT 
        employee_id,
        profile_id,
        job_title,
        position_level,
        status,
        shift
      FROM employment_details
      WHERE job_title ILIKE $1
         OR position_level ILIKE $1
         OR CAST(emp_type AS TEXT) ILIKE $1
         OR CAST(status AS TEXT) ILIKE $1
         OR CAST(shift AS TEXT) ILIKE $1
      `,
      [`%${keyword || ''}%`] // 🔥 safe fallback
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        data: result.rows
      }),
    };

  } catch (error) {
    console.error('SEARCH EMPLOYMENT ERROR:', error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: error.message
      }),
    };
  }
};