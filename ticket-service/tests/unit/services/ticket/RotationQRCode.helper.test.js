const RotationQRCode = require('../../../../src/services/ticket/helpers/RotationQRCode.helper');

describe('RotationQRCode.helper', () => {
    const secretString = 'super-secret';
    const secretBuffer = Buffer.from('buffer-secret');

    test('generateCode produces deterministic 6-digit code for fixed time', () => {
        const fixedMs = 1_700_000_000_000; // fixed epoch ms
        const code1 = RotationQRCode.generateCode(secretString, fixedMs);
        const code2 = RotationQRCode.generateCode(secretString, fixedMs);
        expect(code1).toHaveLength(6);
        expect(code1).toMatch(/^\d{6}$/);
        expect(code1).toBe(code2);
    });

    test('generateCode accepts Buffer secrets', () => {
        const fixedMs = 1_700_000_015_000; // next window
        const code = RotationQRCode.generateCode(secretBuffer, fixedMs);
        expect(code).toHaveLength(6);
        expect(code).toMatch(/^\d{6}$/);
    });

    test('codes differ across windows for same secret', () => {
        const base = 1_700_000_000_000;
        const codeA = RotationQRCode.generateCode(secretString, base);
        const codeB = RotationQRCode.generateCode(secretString, base + RotationQRCode.windowMs);
        expect(codeA).not.toBe(codeB);
    });

    test('verifyCode returns true for current window', () => {
        const fixedMs = 1_700_000_030_000;
        const code = RotationQRCode.generateCode(secretString, fixedMs);
        expect(RotationQRCode.verifyCode(secretString, code, 0, fixedMs)).toBe(true);
    });

    test('verifyCode tolerates +/- drift windows', () => {
        const currentWindowStart = 1_700_000_045_000; // treat as now
        const prevWindow = currentWindowStart - RotationQRCode.windowMs;
        const nextWindow = currentWindowStart + RotationQRCode.windowMs;

        const prevCode = RotationQRCode.generateCode(secretString, prevWindow);
        const nextCode = RotationQRCode.generateCode(secretString, nextWindow);

        expect(RotationQRCode.verifyCode(secretString, prevCode, 1, currentWindowStart)).toBe(true);
        expect(RotationQRCode.verifyCode(secretString, nextCode, 1, currentWindowStart)).toBe(true);
        expect(RotationQRCode.verifyCode(secretString, prevCode, 0, currentWindowStart)).toBe(false);
    });

    test('verifyCode performs zero-padding on provided code', () => {
        const fixedMs = 1_700_000_060_000;
        const code = RotationQRCode.generateCode(secretString, fixedMs);
        const noPad = String(parseInt(code, 10)); // remove leading zeros
        expect(RotationQRCode.verifyCode(secretString, noPad, 0, fixedMs)).toBe(true);
    });

    test('buildDisplayQR appends code to base QR with colon', () => {
        const fixedMs = 1_700_000_075_000;
        const baseQR = 'qr:base:v1';
        const code = RotationQRCode.generateCode(secretString, fixedMs);
        const display = RotationQRCode.buildDisplayQR(baseQR, secretString, fixedMs);
        expect(display).toBe(`${baseQR}:${code}`);
    });
});


