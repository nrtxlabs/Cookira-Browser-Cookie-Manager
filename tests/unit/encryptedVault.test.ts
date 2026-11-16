import { describe, expect, it } from 'vitest';
import {
  decryptCookiesVault,
  decryptProfilesVault,
  encryptCookiesVault,
  encryptProfilesVault,
  isEncryptedVaultPayload,
} from '../../src/crypto/encryptedVault';
import type { CookieRecord, SessionProfile } from '../../src/core/types';

const TEST_COOKIES: CookieRecord[] = [
  {
    name: 'sessionid',
    value: 'secret-token-value',
    domain: '.threads.com',
    path: '/',
    secure: true,
    httpOnly: true,
    hostOnly: false,
    session: false,
    expirationDate: 1900000000,
    sameSite: 'lax',
    storeId: '0',
  },
];

describe('Encrypted AES-256-GCM Vault', () => {
  it('encrypts with fresh random salt/IV using v2 AAD envelope and decrypts identically', async () => {
    const cipherA = await encryptCookiesVault(TEST_COOKIES, 'cookira-pass-123', 'threads.com');
    const cipherB = await encryptCookiesVault(TEST_COOKIES, 'cookira-pass-123', 'threads.com');

    expect(isEncryptedVaultPayload(cipherA)).toBe(true);
    expect(cipherA).not.toBe(cipherB); // Random salt & IV guarantee unique ciphertext
    expect(cipherA).not.toContain('secret-token-value');

    const envelope = JSON.parse(cipherA) as { version: number; exportedBy?: string; domain: string };
    expect(envelope.version).toBe(2);
    expect(envelope.exportedBy).toBe('cookira-v2');
    expect(envelope.domain).toBe('threads.com');

    const restored = await decryptCookiesVault(cipherA, 'cookira-pass-123');
    expect(restored.domain).toBe('threads.com');
    expect(restored.cookies).toEqual(TEST_COOKIES);
  });

  it('rejects explicitly when passphrase is wrong or v2 AAD metadata is tampered', async () => {
    const cipher = await encryptCookiesVault(TEST_COOKIES, 'right-pass', 'threads.com');
    await expect(decryptCookiesVault(cipher, 'wrong-pass')).rejects.toThrow(
      'Wrong passphrase or corrupted encrypted vault.',
    );

    const domainTampered = JSON.parse(cipher) as Record<string, unknown>;
    domainTampered.domain = 'evil.example';
    await expect(
      decryptCookiesVault(JSON.stringify(domainTampered), 'right-pass'),
    ).rejects.toThrow('Wrong passphrase or corrupted encrypted vault.');

    const downgraded = JSON.parse(cipher) as Record<string, unknown>;
    downgraded.version = 1;
    await expect(
      decryptCookiesVault(JSON.stringify(downgraded), 'right-pass'),
    ).rejects.toThrow('Wrong passphrase or corrupted encrypted vault.');
  });

  it('retains backward-compatible decryption for legacy Cookira v1 vaults', async () => {
    const pass = 'legacy-v1-pass';
    const salt = new Uint8Array(16).fill(7);
    const iv = new Uint8Array(12).fill(9);
    const baseKey = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pass),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    const key = await globalThis.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );
    const cipherBuf = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify({ cookies: TEST_COOKIES })),
    );
    const toB64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
    const legacyV1Envelope = JSON.stringify({
      format: 'cookira-vault',
      version: 1,
      vaultKind: 'cookies',
      kdf: 'PBKDF2-SHA256',
      iterations: 600_000,
      cipher: 'AES-GCM',
      domain: 'threads.com',
      createdAt: 1700000000000,
      saltB64: toB64(salt),
      ivB64: toB64(iv),
      ciphertextB64: toB64(new Uint8Array(cipherBuf)),
    });

    expect(isEncryptedVaultPayload(legacyV1Envelope)).toBe(true);
    const restored = await decryptCookiesVault(legacyV1Envelope, pass);
    expect(restored.domain).toBe('threads.com');
    expect(restored.cookies).toEqual(TEST_COOKIES);
  });

  it('encrypts and decrypts account session profiles vault identically', async () => {
    const profiles: SessionProfile[] = [
      {
        id: 'prof_1',
        name: '@akun_utama',
        domain: 'threads.com',
        includeSubdomains: true,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        cookies: TEST_COOKIES,
      },
    ];
    const enc = await encryptProfilesVault(profiles, 'profiles-secret');
    expect(enc).not.toContain('@akun_utama');
    const dec = await decryptProfilesVault(enc, 'profiles-secret');
    expect(dec).toEqual(profiles);
  });
});
