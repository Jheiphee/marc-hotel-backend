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

    const { booking_id, id } = event.pathParameters || {};
    const finalId = booking_id || id;

    if (!finalId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'booking_id is required'
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
      number_of_guests,
      check_in_date,
      check_out_date,
      status
    } = data;

    const check = await db.query(
      `SELECT 1 FROM bookings WHERE booking_id = $1`,
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
          message: 'Booking not found'
        }),
      };
    }

    let fields = [];
    let values = [];
    let index = 1;

    if (number_of_guests !== undefined) {
      fields.push(`number_of_guests = $${index++}`);
      values.push(number_of_guests);
    }

    if (check_in_date !== undefined) {
      fields.push(`check_in_date = $${index++}`);
      values.push(check_in_date);
    }

    if (check_out_date !== undefined) {
      fields.push(`check_out_date = $${index++}`);
      values.push(check_out_date);
    }

    if (status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(status);
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
      UPDATE bookings
      SET ${fields.join(', ')}
      WHERE booking_id = $${index}
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
        message: 'Booking updated successfully',
        data: result.rows[0]
      }),
    };

  } catch (error) {
    console.error('UPDATE BOOKING ERROR:', error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: error.message
      }),
    };
  }
};