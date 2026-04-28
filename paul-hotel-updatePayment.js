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

    let {
      payment_type,
      payment_method,
      payment_amount,
      total_discount,
      status
    } = data;

    // 🔹 check if payment exists
    const check = await pool.query(
      `SELECT * FROM payments WHERE payment_id = $1`,
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
          message: 'Payment not found'
        }),
      };
    }

    const current = check.rows[0];

    // 🔹 normalize numbers
    const amount = payment_amount !== undefined
      ? Number(payment_amount)
      : Number(current.payment_amount);

    const discount = total_discount !== undefined
      ? Number(total_discount)
      : Number(current.total_discount);

    // 🔹 TEMP total_due
    const total_due = 5000;
    const final_due = total_due - discount;

    // 🔥 ENUM SAFE MAP
    const STATUS_MAP = {
      pending: 'Pending',
      paid: 'Paid',
      partial: 'Partial Paid',
      refunded: 'Refunded',
      settlement: 'Settlement'
    };

    let finalStatus = current.status;

    // 🔥 PRIORITY: MANUAL OVERRIDE
    if (status) {
      const normalized = status.toLowerCase();

      if (STATUS_MAP[normalized]) {
        finalStatus = STATUS_MAP[normalized];
      } else {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            message: 'Invalid status value'
          }),
        };
      }

    } else {
      // 🔹 AUTO COMPUTE
      if (amount === 0) {
        finalStatus = STATUS_MAP.pending;
      } else if (amount < final_due) {
        finalStatus = STATUS_MAP.partial;
      } else {
        finalStatus = STATUS_MAP.paid;
      }
    }

    // 🔹 update
    const result = await pool.query(
      `
      UPDATE payments
      SET
        payment_type = COALESCE($1, payment_type),
        payment_method = COALESCE($2, payment_method),
        payment_amount = COALESCE($3, payment_amount),
        total_discount = COALESCE($4, total_discount),
        status = $5
      WHERE payment_id = $6
      RETURNING *
      `,
      [
        payment_type || null,
        payment_method || null,
        payment_amount ?? null,
        total_discount ?? null,
        finalStatus,
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
        message: 'Payment updated successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('UPDATE PAYMENT ERROR:', err);

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