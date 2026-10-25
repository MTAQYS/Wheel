import { normalizeNames } from './parse';

const PREFIX = 'n=';
const MAX_HASH_LENGTH = 400_000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Names live in the URL hash, which browsers do not send to the server. */
export function encodeNamesHash(names: readonly string[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(names));
  return `#${PREFIX}${bytesToBase64Url(bytes)}`;
}

export function decodeNamesHash(hash: string): string[] | null {
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!body.startsWith(PREFIX)) return null;
  const payload = body.slice(PREFIX.length);
  if (!payload || payload.length > MAX_HASH_LENGTH) return null;
  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(payload));
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data) || !data.every((item) => typeof item === 'string')) return null;
    return normalizeNames(data).names;
  } catch {
    return null;
  }
}
