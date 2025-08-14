import { encrypt, decrypt, isEncrypted } from '../encryption';

describe('AI Encryption', () => {
  const testApiKey = 'sk-test-api-key-12345';

  test('should encrypt and decrypt API keys correctly', () => {
    const encrypted = encrypt(testApiKey);
    expect(encrypted).not.toBe(testApiKey);
    expect(isEncrypted(encrypted)).toBe(true);
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(testApiKey);
  });

  test('should validate encrypted data format', () => {
    const encrypted = encrypt(testApiKey);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(isEncrypted('invalid-format')).toBe(false);
    expect(isEncrypted('abc:def')).toBe(true); // Valid format but may not decrypt properly
  });

  test('should throw error for invalid encrypted data', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted data format');
  });
});