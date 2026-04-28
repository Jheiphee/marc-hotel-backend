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

    const { profile_id, guest_type, is_member } = data;

    // 🔹 validation
    if (!profile_id || !guest_type) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'profile_id and guest_type are required'
        }),
      };
    }

    // 🔹 normalize guest_type
    const normalizedType = guest_type.toLowerCase();
    const allowedTypes = ['check-in proxy', 'reservation holder'];

    if (!allowedTypes.includes(normalizedType)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Invalid guest_type'
        }),
      };
    }

    // 🔹 check profile exists
    const profileCheck = await pool.query(
      `SELECT 1 FROM profiles WHERE profile_id = $1`,
      [profile_id]
    );

    if (profileCheck.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Profile does not exist'
        }),
      };
    }

    // 🔥 INSERT
    const result = await pool.query(
      `
      INSERT INTO guests (
        profile_id,
        guest_type,
        is_member
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        profile_id,
        normalizedType,
        is_member ?? false
      ]
    );

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: 'Guest created successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('CREATE GUEST ERROR:', err);

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