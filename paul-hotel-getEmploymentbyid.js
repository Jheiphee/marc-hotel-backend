const { Pool } = require('pg');

// 🔥 reusable DB connection
let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
};

// 🔥 reusable CORS
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

module.exports.handler = async (event) => {

  // ✅ HANDLE OPTIONS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const db = getPool();

    // 🔥 STEP 1: CHECK IF MAY ID (GET BY ID MODE)
    const { employee_id } = event.pathParameters || {};

    if (employee_id) {
      const result = await db.query(
        `SELECT * FROM employment_details WHERE employee_id = $1`,
        [employee_id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            message: "Employment not found"
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          data: result.rows[0] // 🔥 SINGLE OBJECT
        })
      };
    }

    // 🔥 STEP 2: SEARCH / FILTER MODE
    const params = event.queryStringParameters || {};
    const { keyword, job_title, position_level, status, shift } = params;

    let conditions = [];
    let values = [];
    let index = 1;

    // 🔍 GLOBAL SEARCH
    if (keyword) {
      conditions.push(`
        (
          job_title ILIKE $${index}
          OR position_level ILIKE $${index}
          OR CAST(emp_type AS TEXT) ILIKE $${index}
          OR CAST(status AS TEXT) ILIKE $${index}
          OR CAST(shift AS TEXT) ILIKE $${index}
        )
      `);
      values.push(`%${keyword}%`);
      index++;
    }

    // 🔍 SPECIFIC FILTERS
    if (job_title) {
      conditions.push(`job_title ILIKE $${index}`);
      values.push(`%${job_title}%`);
      index++;
    }

    if (position_level) {
      conditions.push(`position_level ILIKE $${index}`);
      values.push(`%${position_level}%`);
      index++;
    }

    if (status) {
      conditions.push(`CAST(status AS TEXT) ILIKE $${index}`);
      values.push(`%${status}%`);
      index++;
    }

    if (shift) {
      conditions.push(`CAST(shift AS TEXT) ILIKE $${index}`);
      values.push(`%${shift}%`);
      index++;
    }

    // 🔥 FINAL QUERY
    let query = `
      SELECT 
        employee_id,
        profile_id,
        hire_date,
        job_title,
        position_level,
        emp_type,
        status,
        shift,
        is_active
      FROM employment_details
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY employee_id ASC`;

    const result = await db.query(query, values);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        data: result.rows // 🔥 ARRAY
      }),
    };

  } catch (error) {
    console.error('GET EMPLOYMENT ERROR:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: error.message
      }),
    };
  }
};