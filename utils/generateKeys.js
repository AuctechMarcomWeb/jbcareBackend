// generateKeys.js
import fs from "fs";
import { generateKeyPairSync } from "crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
  },
});

fs.writeFileSync("jwt_private.pem", privateKey);
fs.writeFileSync("jwt_public.pem", publicKey);

console.log("✅ RSA key pair generated: jwt_private.pem & jwt_public.pem");
