const argon2 = require("argon2");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/**
 * Hash a password, secret key, or OTP code using Argon2d.
 */
const hashSecret = async (plain) => {
  return argon2.hash(String(plain), {
    type: argon2.argon2d,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
};

/**
 * Verify a candidate secret against an Argon2d (or legacy bcrypt) hash.
 */
const verifySecret = async (storedHash, plain) => {
  if (!storedHash || !plain) return false;
  const candidate = String(plain);
  const hashStr = String(storedHash);

  if (hashStr.startsWith("$argon2")) {
    return argon2.verify(hashStr, candidate);
  }
  if (hashStr.startsWith("$2")) {
    return bcrypt.compare(candidate, hashStr);
  }
  return hashStr === candidate;
};

/**
 * Deterministic SHA-256 digest used for secret-key indexed lookups without storing plaintext.
 */
const digestSecret = (plain) => {
  if (!plain) return "";
  return crypto
    .createHash("sha256")
    .update(String(plain).trim())
    .digest("hex");
};

const formatKeyHint = (plain) => {
  const s = String(plain || "").trim();
  if (!s) return "Configured";
  return s.length <= 4 ? "••••" : `••••${s.slice(-4)}`;
};

module.exports = {
  hashSecret,
  verifySecret,
  digestSecret,
  formatKeyHint,
};

