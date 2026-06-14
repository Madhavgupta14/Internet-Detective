import crypto from "node:crypto";
import fs from "node:fs";

// Generate an RSA key pair. The public key (SPKI/DER, base64) goes in
// manifest.json as "key" and pins a stable extension ID across reloads,
// folder moves, and machines.
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "der" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

const keyB64 = publicKey.toString("base64");

// Chrome derives the ID from SHA-256 of the DER public key: take the first
// 16 bytes and map each hex nibble 0-f to letters a-p.
const hash = crypto.createHash("sha256").update(publicKey).digest();
const id = [...hash.subarray(0, 16)]
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("")
  .split("")
  .map((c) => String.fromCharCode(97 + parseInt(c, 16)))
  .join("");

fs.writeFileSync("spectra-extension-key.pem", privateKey);

console.log("EXTENSION_ID=" + id);
console.log("MANIFEST_KEY=" + keyB64);
