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
  it('encrypts with fresh random salt/IV each call and decrypts identically', async () => {
    const cipherA = await encryptCookiesVault(TEST_COOKIES, 'cookira-pass-123', 'threads.com');
    const cipherB = await encryptCookiesVault(TEST_COOKIES, 'cookira-pass-123', 'threads.com');

    expect(isEncryptedVaultPayload(cipherA)).toBe(true);
    expect(cipherA).not.toBe(cipherB); // Random salt & IV guarantee unique ciphertext
    expect(cipherA).not.toContain('secret-token-value');

    const restored = await decryptCookiesVault(cipherA, 'cookira-pass-123');
    expect(restored.domain).toBe('threads.com');
    expect(restored.cookies).toEqual(TEST_COOKIES);
  });

  it('rejects explicitly when passphrase is wrong or payload is tampered', async () => {
    const cipher = await encryptCookiesVault(TEST_COOKIES, 'right-pass', 'threads.com');
    await expect(decryptCookiesVault(cipher, 'wrong-pass')).rejects.toThrow(
      'Wrong passphrase or corrupted encrypted vault.',
    );
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
