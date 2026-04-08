import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive an encryption key from the master secret using scrypt.
 */
function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  return scryptSync(masterSecret, salt, KEY_LENGTH);
}

/**
 * Encrypt credentials JSON with AES-256-GCM.
 *
 * Format: base64(salt + iv + authTag + ciphertext)
 *
 * @param credentials - Plain object with credentials
 * @param masterSecret - The master encryption key (from env: INTEGRATION_ENCRYPTION_KEY)
 * @returns Encrypted string (base64)
 */
export function encryptCredentials(
  credentials: Record<string, string>,
  masterSecret: string
): string {
  const plaintext = JSON.stringify(credentials);
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(masterSecret, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // salt (32) + iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt credentials from the encrypted string.
 *
 * @param encryptedData - base64 encoded encrypted data
 * @param masterSecret - The master encryption key
 * @returns Decrypted credentials object
 */
export function decryptCredentials(
  encryptedData: string,
  masterSecret: string
): Record<string, string> {
  const combined = Buffer.from(encryptedData, "base64");

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(masterSecret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as Record<string, string>;
}
