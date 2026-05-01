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

// 🔥 REUSABLE CORS HEADERS
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

module.exports.handler = async (event) => {

  // 🔥 HANDLE OPTIONS (important for POST)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    const data = JSON.parse(event.body);

    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      marital_status,
      contact_number,
      profile_type
    } = data;

    // 🔹 validation
    if (!first_name || !last_name) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'first_name and last_name are required'
        }),
      };
    }

    // 🔹 insert
    const result = await pool.query(
      `
      INSERT INTO profiles (
        first_name,
        last_name,
        date_of_birth,
        gender,
        marital_status,
        contact_number,
        profile_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        first_name,
        last_name,
        date_of_birth || null,
        gender || null,
        marital_status || null,
        contact_number || null,
        profile_type || 'guest'
      ]
    );

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Profile created successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('CREATE PROFILE ERROR:', err);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: err.message
      }),
    };
  }
};