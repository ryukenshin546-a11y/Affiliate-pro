/**
 * AES-256 Encryption utilities for secure token storage
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

// Get encryption key from environment or generate one
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = import.meta.env.VITE_ENCRYPTION_KEY || 'flow-affiliate-pro-default-key-32b';
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial.padEnd(32, '0').slice(0, 32));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      data
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string value
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(ciphertext).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt an object (JSON serializable)
 */
export async function encryptObject<T>(obj: T): Promise<string> {
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString);
}

/**
 * Decrypt to an object
 */
export async function decryptObject<T>(ciphertext: string): Promise<T> {
  const jsonString = await decrypt(ciphertext);
  return JSON.parse(jsonString) as T;
}

/**
 * Generate a random ID
 */
export function generateId(length?: number): string {
  if (!length) {
    return crypto.randomUUID();
  }

  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function generateJobId(): string {
  return `job_${generateId(12)}`;
}

export function generateSessionId(): string {
  return `session_${generateId(12)}`;
}

/**
 * Hash a string using SHA-256
 */
export async function hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Aliases for backward compatibility
export const encryptData = encrypt;
export const decryptData = decrypt;
