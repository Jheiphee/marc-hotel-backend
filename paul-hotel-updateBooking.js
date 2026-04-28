const { Pool } = require('pg');

// ✅ reusable connection
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

    // ✅ FIX: support both id and booking_id
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

    // ✅ safe JSON parse
    let data = {};
    try {
      data = event.body ? JSON.parse(event.body) : {};
    } catch (err) {
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

    const result = await db.query(
      `UPDATE bookings
       SET number_of_guests = $1,
           check_in_date = $2,
           check_out_date = $3,
           status = $4
       WHERE booking_id = $5
       RETURNING *`,
      [
        number_of_guests,
        check_in_date,
        check_out_date,
        status,
        finalId
      ]
    );

    if (result.rows.length === 0) {
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