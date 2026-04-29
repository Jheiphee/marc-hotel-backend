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

module.exports.handler = async (event) => {
  try {
    const db = getPool();

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

    let data = {};
    try {
      data = event.body ? JSON.parse(event.body) : {};
    } catch {
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

    const check = await db.query(
      `SELECT 1 FROM rooms WHERE room_id = $1`,
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

    if (room_number !== undefined) {
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

    let fields = [];
    let values = [];
    let index = 1;

    if (room_number !== undefined) {
      fields.push(`room_number = $${index++}`);
      values.push(room_number);
    }

    if (room_size !== undefined) {
      fields.push(`room_size = $${index++}`);
      values.push(room_size);
    }

    if (room_capacity !== undefined) {
      fields.push(`room_capacity = $${index++}`);
      values.push(room_capacity);
    }

    if (price_per_night !== undefined) {
      fields.push(`price_per_night = $${index++}`);
      values.push(price_per_night);
    }

    if (status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(status);
    }

    if (room_description !== undefined) {
      fields.push(`room_description = $${index++}`);
      values.push(room_description);
    }

    if (fields.length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'No fields provided for update'
        }),
      };
    }

    values.push(finalId);

    const query = `
      UPDATE rooms
      SET ${fields.join(', ')}
      WHERE room_id = $${index}
      RETURNING *
    `;

    const result = await db.query(query, values);

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