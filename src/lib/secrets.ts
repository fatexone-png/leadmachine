import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENCRYPTED_SECRET_PREFIX = "enc:v1:";

function getEncryptionSeed() {
  return (
    process.env.APP_DATA_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.LINKEDIN_CLIENT_SECRET ||
    null
  );
}

function getEncryptionKey() {
  const seed = getEncryptionSeed();

  if (!seed) {
    return null;
  }

  return createHash("sha256").update(seed).digest();
}

export function canProtectStoredSecrets() {
  return Boolean(getEncryptionKey());
}

export function isEncryptedStoredSecret(value: string | null | undefined) {
  return Boolean(value?.startsWith(ENCRYPTED_SECRET_PREFIX));
}

export function encryptStoredSecret(value: string | null) {
  if (!value || isEncryptedStoredSecret(value)) {
    return value;
  }

  const key = getEncryptionKey();

  if (!key) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_SECRET_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptStoredSecret(value: string | null) {
  if (!value || !isEncryptedStoredSecret(value)) {
    return value;
  }

  const key = getEncryptionKey();

  if (!key) {
    throw new Error(
      "Encrypted application data found, but no encryption key is configured. Set APP_DATA_ENCRYPTION_KEY."
    );
  }

  const [, ivEncoded, authTagEncoded, payloadEncoded] = value.split(".");

  if (!ivEncoded || !authTagEncoded || !payloadEncoded) {
    throw new Error("Stored secret payload is malformed.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivEncoded, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadEncoded, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
