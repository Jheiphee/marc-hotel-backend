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

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    // 🔥 IMPORTANT: employee_id na
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

    const data = JSON.parse(event.body);

    const {
      profile_id,
      hire_date,
      job_title,
      position_level,
      emp_type,
      status,
      shift,
      is_active
    } = data;

    // 🔴 check if exists
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

    // 🔥 UPDATE (aligned sa columns mo)
    const result = await pool.query(
      `
      UPDATE employment_details
      SET 
        profile_id = $1,
        hire_date = $2,
        job_title = $3,
        position_level = $4,
        emp_type = $5,
        status = $6,
        shift = $7,
        is_active = $8
      WHERE employee_id = $9
      RETURNING *
      `,
      [
        profile_id,
        hire_date,
        job_title,
        position_level,
        emp_type,
        status,
        shift,
        is_active,
        employee_id
      ]
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Employment updated successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('UPDATE EMPLOYMENT ERROR:', err);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: err.message
      }),
    };
  }
};