import "server-only";

import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, encodedKey] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !encodedKey) return false;

  const expectedKey = Buffer.from(encodedKey, "base64url");
  const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;
  return expectedKey.length === actualKey.length && crypto.timingSafeEqual(expectedKey, actualKey);
}
