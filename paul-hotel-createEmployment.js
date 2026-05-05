const { Pool } = require('pg');

// 🔥 DB connection
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
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
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
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

    // ✅ validation
    if (!profile_id || !job_title || !hire_date || !emp_type) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'profile_id, hire_date, job_title, emp_type are required'
        }),
      };
    }

    // ✅ check profile exists
    const profileCheck = await pool.query(
      `SELECT 1 FROM profiles WHERE profile_id = $1`,
      [profile_id]
    );

    if (profileCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Profile does not exist'
        }),
      };
    }

    // 🔥 GENERATE employee_id (same style mo sa guest)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const employee_id = `EMP${randomNum}`;

    // 🔥 insert
    const result = await pool.query(
      `
      INSERT INTO employment_details (
        employee_id,
        profile_id,
        hire_date,
        job_title,
        position_level,
        emp_type,
        status,
        shift,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        employee_id,
        profile_id,
        hire_date,
        job_title,
        position_level,
        emp_type,
        status,
        shift,
        is_active ?? true
      ]
    );

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Employment created successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('CREATE EMPLOYMENT ERROR:', err);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: err.message
      }),
    };
  }
};