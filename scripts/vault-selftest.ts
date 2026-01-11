import { randomBytes } from "crypto";

import { decryptSecret, encryptSecret } from "../lib/crypto/vault";

const run = async () => {
  const passphrase = randomBytes(32).toString("hex");
  const plaintextKey = `test-key-${randomBytes(8).toString("hex")}`;

  const record = await encryptSecret(plaintextKey, passphrase);
  const decrypted = await decryptSecret(record, passphrase);

  if (decrypted !== plaintextKey) {
    throw new Error("Vault selftest failed");
  }

  console.log("vault selftest ok");
};

run().catch(() => {
  console.error("vault selftest failed");
  process.exit(1);
});
