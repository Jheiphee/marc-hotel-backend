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
    const data = JSON.parse(event.body);

    const {
      guest_id,
      room_id,
      employee_id,
      number_of_guests,
      check_in_date,
      check_out_date,
      status
    } = data;

    // 🔹 check room exists
    const roomCheck = await pool.query(
      'SELECT 1 FROM rooms WHERE room_id = $1',
      [room_id]
    );

    if (roomCheck.rows.length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ message: 'Room does not exist' }),
      };
    }

    // 🔹 check overlapping booking
    const overlapCheck = await pool.query(
      `SELECT 1 FROM bookings
       WHERE room_id = $1
       AND status IN ('confirmed', 'checked_in')
       AND (
         (check_in_date <= $2 AND check_out_date >= $2)
         OR
         (check_in_date <= $3 AND check_out_date >= $3)
       )`,
      [room_id, check_in_date, check_out_date]
    );

    if (overlapCheck.rows.length > 0) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ message: 'Room already booked for selected dates' }),
      };
    }

    // 🔥 INSERT
    const result = await pool.query(
      `INSERT INTO bookings 
      (booking_id, guest_id, room_id, number_of_guests, check_in_date, check_out_date, status, employee_id)
      VALUES (
        CONCAT('BOOKINGID-', FLOOR(RANDOM() * 10000)),
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING *`,
      [
        guest_id,
        room_id,
        number_of_guests,
        check_in_date,
        check_out_date,
        status,
        employee_id
      ]
    );

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: 'Booking created successfully',
        data: result.rows[0],
      }),
    };

  } catch (error) {
    console.error('CREATE BOOKING ERROR:', error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};