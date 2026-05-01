const { Pool } = require('pg');

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

// 🔥 REUSABLE CORS HEADERS
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

module.exports.handler = async (event) => {

  // 🔥 HANDLE OPTIONS (important for DELETE)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const db = getPool();

    const { guest_id, id } = event.pathParameters || {};
    const finalId = guest_id || id;

    if (!finalId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'guest_id is required'
        }),
      };
    }

    const guestCheck = await db.query(
      `SELECT 1 FROM guests WHERE guest_id = $1`,
      [finalId]
    );

    if (guestCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Guest not found'
        }),
      };
    }

    await db.query(
      `DELETE FROM guests WHERE guest_id = $1`,
      [finalId]
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Guest deleted successfully'
      }),
    };

  } catch (err) {
    console.error('DELETE GUEST ERROR:', err);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: err.message
      }),
    };
  }
};