const { Pool } = require('pg');

// ✅ reusable DB connection
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

module.exports.handler = async (event) => {
  try {
    const db = getPool();

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

    // 🔍 SPECIFIC FILTERS (optional)
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
        job_title,
        position_level,
        status,
        shift
      FROM employment_details
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await db.query(query, values);

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
      }),
    };

  } catch (error) {
    console.error('SEARCH EMPLOYMENT ERROR:', error);

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
      }),
    };
  }
};