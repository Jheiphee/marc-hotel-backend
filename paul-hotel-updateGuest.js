const { Pool } = require('pg');

// ✅ reuse connection (important for Lambda)
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

// ✅ reusable response
const response = (status, message, data = null) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  body: JSON.stringify({
    message,
    data
  })
});

module.exports.handler = async (event) => {
  try {
    const db = getPool();

    // ✅ FIXED: correct param name
    const { guest_id } = event.pathParameters || {};

    if (!guest_id) {
      return response(400, "guest_id is required in path");
    }

    // ✅ SAFE JSON PARSE
    let data = {};
    try {
      data = event.body ? JSON.parse(event.body) : {};
    } catch (err) {
      return response(400, "Invalid JSON body");
    }

    let {
      profile_id,
      guest_type,
      is_member
    } = data;

    // ✅ BOOLEAN FIX (important)
    if (typeof is_member === 'string') {
      is_member = is_member.toLowerCase() === 'true';
    }

    // 🔹 CHECK IF GUEST EXISTS
    const check = await db.query(
      `SELECT 1 FROM guests WHERE guest_id = $1`,
      [guest_id]
    );

    if (check.rows.length === 0) {
      return response(404, "Guest not found");
    }

    // 🔹 VALIDATE PROFILE (if provided)
    if (profile_id !== undefined && profile_id !== null) {
      const profileCheck = await db.query(
        `SELECT 1 FROM profiles WHERE profile_id = $1`,
        [profile_id]
      );

      if (profileCheck.rows.length === 0) {
        return response(404, "Profile does not exist");
      }
    }

    // 🔥 DYNAMIC UPDATE (BEST PRACTICE)
    let fields = [];
    let values = [];
    let index = 1;

    if (profile_id !== undefined) {
      fields.push(`profile_id = $${index++}`);
      values.push(profile_id);
    }

    if (guest_type !== undefined) {
      fields.push(`guest_type = $${index++}`);
      values.push(guest_type);
    }

    if (is_member !== undefined) {
      fields.push(`is_member = $${index++}`);
      values.push(is_member);
    }

    // ❗ WALANG UPDATE NA BINIGAY
    if (fields.length === 0) {
      return response(400, "No fields provided for update");
    }

    // add guest_id as last param
    values.push(guest_id);

    const query = `
      UPDATE guests
      SET ${fields.join(', ')}
      WHERE guest_id = $${index}
      RETURNING *
    `;

    const result = await db.query(query, values);

    return response(200, "Guest updated successfully", result.rows[0]);

  } catch (err) {
    console.error("UPDATE GUEST ERROR:", err);
    return response(500, err.message);
  }
};