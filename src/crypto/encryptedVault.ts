import type { CookieRecord } from '../core/types';

export interface EncryptedVaultEnvelope {
  format: 'cookira-vault';
  version: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  cipher: 'AES-GCM';
  domain: string;
  createdAt: number;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
}

const DEFAULT_PBKDF2_ITERATIONS = 600_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: 'encrypt' | 'decrypt',
): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  );
}

export function isEncryptedVaultPayload(rawText: string): boolean {
  try {
    const parsed = JSON.parse(rawText) as Partial<EncryptedVaultEnvelope>;
    return parsed?.format === 'cookira-vault' && parsed?.version === 1;
  } catch {
    return false;
  }
}

export async function encryptCookiesVault(
  cookies: CookieRecord[],
  passphrase: string,
  domainLabel: string,
): Promise<string> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase must be at least 4 characters long.');
  }

  const salt = new Uint8Array(new ArrayBuffer(16));
  const iv = new Uint8Array(new ArrayBuffer(12));
  globalThis.crypto.getRandomValues(salt);
  globalThis.crypto.getRandomValues(iv);

  const key = await deriveAesGcmKey(passphrase, salt, DEFAULT_PBKDF2_ITERATIONS, 'encrypt');
  const plaintext = new TextEncoder().encode(JSON.stringify({ cookies }));
  const cipherBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );

  const envelope: EncryptedVaultEnvelope = {
    format: 'cookira-vault',
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: DEFAULT_PBKDF2_ITERATIONS,
    cipher: 'AES-GCM',
    domain: domainLabel,
    createdAt: Date.now(),
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    ciphertextB64: bytesToBase64(new Uint8Array(cipherBuffer)),
  };

  return JSON.stringify(envelope, null, 2);
}

export async function decryptCookiesVault(
  rawJson: string,
  passphrase: string,
): Promise<{ domain: string; createdAt: number; cookies: CookieRecord[] }> {
  if (!passphrase) {
    throw new Error('Passphrase is required to decrypt vault.');
  }

  const envelope = JSON.parse(rawJson) as Partial<EncryptedVaultEnvelope>;
  if (
    envelope.format !== 'cookira-vault' ||
    envelope.version !== 1 ||
    !envelope.saltB64 ||
    !envelope.ivB64 ||
    !envelope.ciphertextB64 ||
    typeof envelope.iterations !== 'number' ||
    envelope.iterations < 100_000
  ) {
    throw new Error('Invalid or unsupported Cookira encrypted vault envelope.');
  }

  const salt = base64ToBytes(envelope.saltB64);
  const iv = base64ToBytes(envelope.ivB64);
  const ciphertext = base64ToBytes(envelope.ciphertextB64);

  const key = await deriveAesGcmKey(passphrase, salt, envelope.iterations, 'decrypt');

  try {
    const plainBuffer = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );
    const decoded = new TextDecoder('utf-8').decode(plainBuffer);
    const parsed = JSON.parse(decoded) as { cookies?: CookieRecord[] };
    if (!Array.isArray(parsed.cookies)) {
      throw new Error('Corrupted vault payload.');
    }
    return {
      domain: envelope.domain ?? '',
      createdAt: envelope.createdAt ?? 0,
      cookies: parsed.cookies,
    };
  } catch {
    throw new Error('Wrong passphrase or corrupted encrypted vault.');
  }
}
