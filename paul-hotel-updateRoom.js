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

    // ✅ FIX param (support both id / room_id)
    const { id, room_id } = event.pathParameters || {};
    const finalId = id || room_id;

    if (!finalId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'room_id is required'
        }),
      };
    }

    // ✅ safe JSON parse
    let data = {};
    try {
      data = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Invalid JSON body'
        }),
      };
    }

    const {
      room_number,
      room_size,
      room_capacity,
      price_per_night,
      status,
      room_description
    } = data;

    // 🔹 check if room exists
    const check = await db.query(
      `SELECT * FROM rooms WHERE room_id = $1`,
      [finalId]
    );

    if (check.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Room not found'
        }),
      };
    }

    // 🔹 check duplicate room_number
    if (room_number) {
      const duplicateCheck = await db.query(
        `SELECT 1 FROM rooms WHERE room_number = $1 AND room_id != $2`,
        [room_number, finalId]
      );

      if (duplicateCheck.rows.length > 0) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            message: 'Room number already exists'
          }),
        };
      }
    }

    // 🔹 update
    const result = await db.query(
      `
      UPDATE rooms
      SET
        room_number = COALESCE($1, room_number),
        room_size = COALESCE($2, room_size),
        room_capacity = COALESCE($3, room_capacity),
        price_per_night = COALESCE($4, price_per_night),
        status = COALESCE($5, status),
        room_description = COALESCE($6, room_description)
      WHERE room_id = $7
      RETURNING *
      `,
      [
        room_number ?? null,
        room_size ?? null,
        room_capacity ?? null,
        price_per_night ?? null,
        status ?? null,
        room_description ?? null,
        finalId
      ]
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: 'Room updated successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('UPDATE ROOM ERROR:', err);

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