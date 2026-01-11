import assert from "node:assert/strict";
import { test } from "node:test";

import { decryptSecret, deriveKey, encryptSecret } from "../crypto/vault";

test("encryptSecret and decryptSecret roundtrip", async () => {
  const plaintext = "test-api-key-12345";
  const passphrase = "test-passphrase";

  const record = await encryptSecret(plaintext, passphrase);
  assert.ok(record.encryptedKey);
  assert.ok(record.salt);
  assert.ok(record.iv);
  assert.ok(record.tag);
  assert.equal(record.kdf, "scrypt");
  assert.ok(record.kdfParams);

  const decrypted = await decryptSecret(record, passphrase);
  assert.equal(decrypted, plaintext);
});

test("encryptSecret produces different output each time", async () => {
  const plaintext = "same-key";
  const passphrase = "same-passphrase";

  const record1 = await encryptSecret(plaintext, passphrase);
  const record2 = await encryptSecret(plaintext, passphrase);

  // Salt and IV should be different (random)
  assert.notEqual(record1.salt, record2.salt);
  assert.notEqual(record1.iv, record2.iv);
  assert.notEqual(record1.encryptedKey, record2.encryptedKey);

  // But both should decrypt to the same value
  const decrypted1 = await decryptSecret(record1, passphrase);
  const decrypted2 = await decryptSecret(record2, passphrase);
  assert.equal(decrypted1, plaintext);
  assert.equal(decrypted2, plaintext);
});

test("decryptSecret fails with wrong passphrase", async () => {
  const plaintext = "test-key";
  const passphrase = "correct-passphrase";
  const wrongPassphrase = "wrong-passphrase";

  const record = await encryptSecret(plaintext, passphrase);
  await assert.rejects(
    decryptSecret(record, wrongPassphrase),
    /Unsupported key derivation function|bad decrypt|bad tag/i
  );
});

test("decryptSecret fails with unsupported KDF", async () => {
  const record = {
    encryptedKey: "test",
    salt: "test",
    iv: "test",
    tag: "test",
    kdf: "pbkdf2",
    kdfParams: null,
  };
  await assert.rejects(
    decryptSecret(record, "passphrase"),
    /Unsupported key derivation function/i
  );
});

test("deriveKey produces consistent output", async () => {
  const passphrase = "test-passphrase";
  const salt = Buffer.from("testsalt12345678", "utf8").toString("base64");

  const key1 = await deriveKey(passphrase, salt);
  const key2 = await deriveKey(passphrase, salt);

  assert.deepEqual(key1, key2);
  assert.equal(key1.length, 32); // Default keyLen
});

test("encryptSecret handles long keys", async () => {
  const longKey = "a".repeat(1000);
  const passphrase = "test-passphrase";

  const record = await encryptSecret(longKey, passphrase);
  const decrypted = await decryptSecret(record, passphrase);
  assert.equal(decrypted, longKey);
});

test("encryptSecret handles special characters", async () => {
  const specialKey = "key-with-special-chars!@#$%^&*()_+-=[]{}|;':\",./<>?";
  const passphrase = "test-passphrase";

  const record = await encryptSecret(specialKey, passphrase);
  const decrypted = await decryptSecret(record, passphrase);
  assert.equal(decrypted, specialKey);
});
