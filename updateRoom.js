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
    const { id } = event.pathParameters;
    const data = JSON.parse(event.body);

    const {
      room_number,
      room_size,
      room_capacity,
      price_per_night,
      status,
      room_description
    } = data;

    // 🔹 check if room exists
    const check = await pool.query(
      `SELECT * FROM rooms WHERE room_id = $1`,
      [id]
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
      const duplicateCheck = await pool.query(
        `SELECT 1 FROM rooms WHERE room_number = $1 AND room_id != $2`,
        [room_number, id]
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
    const result = await pool.query(
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
        id
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