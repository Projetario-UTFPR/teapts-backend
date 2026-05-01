import * as jose from "jose";

const { privateKey, publicKey } = await jose.generateKeyPair("RS256", {
  extractable: true,
});

const privatePem = await jose.exportPKCS8(privateKey);
console.log("Private Key (PEM; base64 encoded):");
console.log(Buffer.from(privatePem).toString("base64"));

const publicPem = await jose.exportSPKI(publicKey);
console.log("Public Key (PEM; base64 encoded):");
console.log(Buffer.from(publicPem).toString("base64"));
