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
      first_name,
      last_name,
      date_of_birth,
      gender,
      marital_status,
      contact_number,
      profile_type
    } = data;

    // 🔹 check if profile exists
    const check = await pool.query(
      `SELECT * FROM profiles WHERE profile_id = $1`,
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
          message: 'Profile not found'
        }),
      };
    }

    // 🔹 update
    const result = await pool.query(
      `
      UPDATE profiles
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        marital_status = COALESCE($5, marital_status),
        contact_number = COALESCE($6, contact_number),
        profile_type = COALESCE($7, profile_type)
      WHERE profile_id = $8
      RETURNING *
      `,
      [
        first_name ?? null,
        last_name ?? null,
        date_of_birth ?? null,
        gender ?? null,
        marital_status ?? null,
        contact_number ?? null,
        profile_type ?? null,
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
        message: 'Profile updated successfully',
        data: result.rows[0]
      }),
    };

  } catch (err) {
    console.error('UPDATE PROFILE ERROR:', err);

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