const { Pool } = require('pg');

// ✅ reusable DB connection (Lambda-friendly)
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

// ✅ normalize status (case-insensitive → ENUM-safe)
const normalizeStatus = (status) => {
  if (!status) return null;

  const map = {
    'pending': 'Pending',
    'partial_paid': 'Partial_paid',
    'paid': 'Paid',
    'refunded': 'Refunded'
  };

  return map[status.toLowerCase()] || null;
};

module.exports.handler = async (event) => {
  try {
    const db = getPool();

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

    let {
      booking_id,
      payment_type,
      payment_method,
      payment_amount,
      total_discount = 0,
      status
    } = data;

    // 🔹 validation
    if (!booking_id || payment_amount === undefined) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'booking_id and payment_amount are required'
        }),
      };
    }

    // 🔹 normalize numbers
    payment_amount = Number(payment_amount);
    total_discount = Number(total_discount);

    // 🔹 check booking exists
    const bookingCheck = await db.query(
      `SELECT 1 FROM bookings WHERE booking_id = $1`,
      [booking_id]
    );

    if (bookingCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Booking does not exist'
        }),
      };
    }

    // 🔹 TEMP total_due (can be dynamic later)
    const total_due = 5000;
    const final_due = total_due - total_discount;

    let finalStatus;

    // 🔥 flexible + override logic
    const normalizedInputStatus = normalizeStatus(status);

    if (normalizedInputStatus) {
      finalStatus = normalizedInputStatus;
    } else {
      if (payment_amount === 0) {
        finalStatus = 'Pending';
      } else if (payment_amount < final_due) {
        finalStatus = 'Partial_paid';
      } else {
        finalStatus = 'Paid';
      }
    }

    // 🔥 insert payment
    const result = await db.query(
      `
      INSERT INTO payments (
        booking_id,
        payment_date,
        payment_type,
        payment_method,
        payment_amount,
        total_discount,
        status
      )
      VALUES (
        $1,
        NOW(),
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING *
      `,
      [
        booking_id,
        payment_type,
        payment_method,
        payment_amount,
        total_discount,
        finalStatus
      ]
    );

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: 'Payment created successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('CREATE PAYMENT ERROR:', err);

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