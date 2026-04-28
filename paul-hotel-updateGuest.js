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
      profile_id,
      guest_type,
      is_member
    } = data;

    // 🔹 check if guest exists
    const check = await pool.query(
      `SELECT * FROM guests WHERE guest_id = $1`,
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
          message: 'Guest not found'
        }),
      };
    }

    // 🔹 check if profile exists (if updating profile_id)
    if (profile_id) {
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
    }

    // 🔹 update guest
    const result = await pool.query(
      `
      UPDATE guests
      SET
        profile_id = COALESCE($1, profile_id),
        guest_type = COALESCE($2, guest_type),
        is_member = COALESCE($3, is_member)
      WHERE guest_id = $4
      RETURNING *
      `,
      [
        profile_id ?? null,
        guest_type ?? null,
        is_member ?? null,
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
        message: 'Guest updated successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('UPDATE GUEST ERROR:', err);

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