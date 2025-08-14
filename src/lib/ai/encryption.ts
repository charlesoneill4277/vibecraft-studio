import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.AI_ENCRYPTION_KEY || 'default-key-for-development-only-change-in-production-32-chars';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts sensitive data like API keys
 */
export function encrypt(text: string): string {
  try {
    // Ensure key is 32 bytes for AES-256
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine iv and encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts sensitive data like API keys
 */
export function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Ensure key is 32 bytes for AES-256
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Validates if a string is properly encrypted
 */
export function isEncrypted(data: string): boolean {
  const parts = data.split(':');
  return parts.length === 2 && parts.every(part => /^[0-9a-f]+$/i.test(part));
}