import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

/**
 * Derives a consistent 32-byte cryptographic key from the configured environment secret.
 */
const getEncryptionKey = () => {
  const secret = process.env.MFA_ENCRYPTION_KEY || 'tenantguard_default_mfa_encryption_key_32chars!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a sensitive string (e.g. TOTP secret) at rest using AES-256-GCM authenticated encryption.
 * @param {string} plaintext - Raw secret string
 * @returns {string} Serialized encrypted payload: "iv:authTag:ciphertext"
 */
export const encryptSecret = (plaintext) => {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext string is required for encryption.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an authenticated AES-256-GCM ciphertext payload.
 * Throws an error if the authentication tag verification fails (detecting tampering).
 * @param {string} encryptedPayload - Serialized string: "iv:authTag:ciphertext"
 * @returns {string} Original plaintext secret
 */
export const decryptSecret = (encryptedPayload) => {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('Valid encrypted payload string is required for decryption.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload format.');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export default {
  encryptSecret,
  decryptSecret
};
