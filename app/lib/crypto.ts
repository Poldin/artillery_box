/**
 * Utility per cifratura/decifratura API keys e password
 * Usa AES-256 con la chiave dal env
 */

import CryptoJS from 'crypto-js';

function getEncryptionKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return key;
}

export function encryptApiKey(apiKey: string): string {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid input for encryption');
  }
  return CryptoJS.AES.encrypt(apiKey, getEncryptionKey()).toString();
}

export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey || typeof encryptedKey !== 'string') {
    throw new Error('Invalid input for decryption');
  }
  const bytes = CryptoJS.AES.decrypt(encryptedKey, getEncryptionKey());
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }
  return decrypted;
}
