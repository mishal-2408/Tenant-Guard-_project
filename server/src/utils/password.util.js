import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcryptjs with cost factor 12.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Salted bcrypt hash
 */
export const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('A valid string password is required for hashing');
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plain-text password against a stored bcrypt hash.
 * @param {string} plainPassword - Plain text password from login attempt
 * @param {string} passwordHash - Stored hash from database
 * @returns {Promise<boolean>} True if match, false otherwise
 */
export const comparePassword = async (plainPassword, passwordHash) => {
  if (!plainPassword || !passwordHash) {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
};

export default {
  hashPassword,
  comparePassword
};
