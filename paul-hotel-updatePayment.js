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

    // ✅ FIX param (support both)
    const { id, payment_id } = event.pathParameters || {};
    const finalId = id || payment_id;

    if (!finalId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'payment_id is required'
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

    let {
      payment_type,
      payment_method,
      payment_amount,
      total_discount,
      status
    } = data;

    // 🔹 check if payment exists
    const check = await db.query(
      `SELECT * FROM payments WHERE payment_id = $1`,
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

    // 🔥 ENUM SAFE MAP (FIXED)
    const STATUS_MAP = {
      pending: 'Pending',
      paid: 'Paid',
      partial: 'Partial_paid',
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
    const result = await db.query(
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