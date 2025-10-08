const crypto = require('crypto');

/**
 * RotationQRCode - Stateless time-based 6-digit code (TOTP-like) for QR rotation.
 * No timers, no DB writes. Code changes every 30s per secret.
 */
class RotationQRCode {
    constructor() {
        this.windowMs = 30 * 1000;
        this.modulus = 1_000_000; // 6 digits
    }

    /**
     * Generate a 6-digit code from secret and time window.
     * @param {string|Buffer} secret
     * @param {number} nowMs - default Date.now()
     * @returns {string} 6-digit string, zero-padded
     */
    generateCode(secret, nowMs = Date.now()) {
        const window = Math.floor(nowMs / this.windowMs);
        const hmac = crypto.createHmac('sha256', Buffer.isBuffer(secret) ? secret : Buffer.from(String(secret)));
        hmac.update(Buffer.from(String(window)));
        const digest = hmac.digest();
        // Take last 4 bytes as unsigned int for uniformity, then mod 1_000_000
        const offset = digest[digest.length - 1] & 0x0f;
        const binCode = ((digest[offset] & 0x7f) << 24) |
                        ((digest[offset + 1] & 0xff) << 16) |
                        ((digest[offset + 2] & 0xff) << 8) |
                        (digest[offset + 3] & 0xff);
        const code = (binCode % this.modulus).toString().padStart(6, '0');
        return code;
    }

    /** Convenience: current code for a secret */
    getCurrentCode(secret) {
        return this.generateCode(secret, Date.now());
    }

    /**
     * Verify provided code allowing small time drift.
     * @param {string|Buffer} secret
     * @param {string} providedCode
     * @param {number} driftWindows - number of windows to allow in +/- direction (default 1)
     * @param {number} nowMs
     * @returns {boolean}
     */
    verifyCode(secret, providedCode, driftWindows = 1, nowMs = Date.now()) {
        const currentWindow = Math.floor(nowMs / this.windowMs);
        for (let i = -driftWindows; i <= driftWindows; i++) {
            const candidate = this.generateCode(secret, (currentWindow + i) * this.windowMs);
            if (candidate === String(providedCode).padStart(6, '0')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Build display QR by appending 6-digit code to base QR.
     * Example output: `${baseQR}:${code}`
     * @param {string} baseQR
     * @param {string|Buffer} secret
     * @param {number} nowMs
     */
    buildDisplayQR(baseQR, secret, nowMs = Date.now()) {
        const code = this.generateCode(secret, nowMs);
        return `${baseQR}:${code}`;
    }
}

module.exports = new RotationQRCode();


