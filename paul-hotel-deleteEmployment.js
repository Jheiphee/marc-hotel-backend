const { Pool } = require('pg');

// 🔥 DB connection
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

// 🔥 CORS
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

module.exports.handler = async (event) => {

  // ✅ OPTIONS (important)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    // 🔥 IMPORTANT: employee_id ang gamit mo
    const { employee_id } = event.pathParameters || {};

    if (!employee_id) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'employee_id is required'
        }),
      };
    }

    // 🔴 check if exists muna (optional pero mas clean)
    const check = await pool.query(
      `SELECT 1 FROM employment_details WHERE employee_id = $1`,
      [employee_id]
    );

    if (check.rows.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Employment not found'
        }),
      };
    }

    // 🔥 DELETE
    const result = await pool.query(
      `
      DELETE FROM employment_details
      WHERE employee_id = $1
      RETURNING *
      `,
      [employee_id]
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Employment deleted successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('DELETE EMPLOYMENT ERROR:', err);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: err.message
      }),
    };
  }
};