"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.safeDecrypt = safeDecrypt;
exports.encryptSecret = encryptSecret;
exports.safeDecryptSecret = safeDecryptSecret;
exports.hashToken = hashToken;
exports.generateCsrfToken = generateCsrfToken;
const crypto_1 = require("crypto");
const ALG = 'aes-256-gcm';
const SALT = 'psicosaas-field-enc-v1';
const IV_LEN = 12;
const TAG_LEN = 16;
const SECRET_PREFIX = 'psicosaas.secret.v1:';
let _key = null;
function getKey() {
    if (_key)
        return _key;
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret || secret.length < 32) {
        throw new Error('[crypto] ENCRYPTION_KEY ausente ou muito curta (mínimo 32 chars)');
    }
    _key = (0, crypto_1.scryptSync)(secret, SALT, 32);
    return _key;
}
function encrypt(text) {
    const key = getKey();
    const iv = (0, crypto_1.randomBytes)(IV_LEN);
    const cipher = (0, crypto_1.createCipheriv)(ALG, key, iv, { authTagLength: TAG_LEN });
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
        iv.toString('base64url'),
        enc.toString('base64url'),
        tag.toString('base64url'),
    ].join('.');
}
function decrypt(payload) {
    const parts = payload.split('.');
    if (parts.length !== 3)
        throw new Error('[crypto] Payload inválido');
    const [ivB64, encB64, tagB64] = parts;
    const iv = Buffer.from(ivB64, 'base64url');
    const enc = Buffer.from(encB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const key = getKey();
    const decipher = (0, crypto_1.createDecipheriv)(ALG, key, iv, { authTagLength: TAG_LEN });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
function safeDecrypt(value) {
    if (!value)
        return value ?? undefined;
    try {
        return decrypt(value);
    }
    catch {
        return value;
    }
}
function encryptSecret(value) {
    if (value.startsWith(SECRET_PREFIX))
        return value;
    return `${SECRET_PREFIX}${encrypt(value)}`;
}
function safeDecryptSecret(value) {
    if (typeof value !== 'string')
        return value;
    if (!value.startsWith(SECRET_PREFIX))
        return value;
    return safeDecrypt(value.slice(SECRET_PREFIX.length)) ?? value;
}
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
function generateCsrfToken(userId) {
    const secret = process.env.JWT_SECRET ?? '';
    return (0, crypto_1.createHmac)('sha256', secret).update(`csrf:${userId}`).digest('hex');
}
//# sourceMappingURL=encrypt.util.js.map