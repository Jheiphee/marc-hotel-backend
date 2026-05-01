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
      room_number,
      room_size,
      room_capacity,
      price_per_night,
      status,
      room_description
    } = data;

    // 🔹 validation
    if (!room_number || !room_size || !price_per_night) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'room_number, room_size, and price_per_night are required'
        }),
      };
    }

    // 🔹 check if room number already exists
    const check = await pool.query(
      `SELECT 1 FROM rooms WHERE room_number = $1`,
      [room_number]
    );

    if (check.rows.length > 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Room number already exists'
        }),
      };
    }

    // 🔹 insert
    const result = await pool.query(
      `
      INSERT INTO rooms (
        room_number,
        room_size,
        room_capacity,
        price_per_night,
        status,
        room_description
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        room_number,
        room_size,
        room_capacity || 1,
        price_per_night,
        status || 'available',
        room_description || null
      ]
    );

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Room created successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('CREATE ROOM ERROR:', err);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: err.message
      }),
    };
  }
};