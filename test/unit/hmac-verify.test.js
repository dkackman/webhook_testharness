/**
 * Tests for HMAC signature verification middleware
 */

import { expect } from 'chai';
import crypto from 'node:crypto';
import { verifySignature } from '../../middleware/hmac-verify.js';
import * as webhookState from '../../services/webhook-state.js';

describe('HMAC Verification', function () {
  const testSecret = 'test-secret-key';
  const testBody = Buffer.from('{"event":"test","data":{}}');

  // Helper to create valid signature
  function createSignature(body, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    return 'sha256=' + hmac.digest('hex');
  }

  beforeEach(function () {
    webhookState.clearSecret();
  });

  afterEach(function () {
    webhookState.clearSecret();
  });

  describe('when no secret is configured', function () {
    it('should return valid without signature', function () {
      const result = verifySignature(testBody, null);

      expect(result.isValid).to.be.true;
      expect(result.status).to.equal('No signature required');
    });

    it('should return valid even with signature provided', function () {
      const signature = createSignature(testBody, testSecret);
      const result = verifySignature(testBody, signature);

      expect(result.isValid).to.be.true;
      expect(result.status).to.equal('No signature required');
    });
  });

  describe('when secret is configured', function () {
    beforeEach(function () {
      webhookState.setSecret(testSecret);
    });

    it('should verify valid signature', function () {
      const signature = createSignature(testBody, testSecret);
      const result = verifySignature(testBody, signature);

      expect(result.isValid).to.be.true;
      expect(result.status).to.include('VERIFIED');
    });

    it('should fail when signature is missing', function () {
      const result = verifySignature(testBody, null);

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Missing signature header');
    });

    it('should fail when signature is empty string', function () {
      const result = verifySignature(testBody, '');

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Missing signature header');
    });

    it('should fail with invalid signature format - missing prefix', function () {
      const result = verifySignature(testBody, 'abc123');

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Invalid signature format');
    });

    it('should fail with invalid signature format - wrong algorithm', function () {
      const result = verifySignature(testBody, 'sha512=abc123');

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Invalid signature format');
    });

    it('should fail with invalid signature format - multiple equals', function () {
      const result = verifySignature(testBody, 'sha256=abc=123');

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Invalid signature format');
    });

    it('should fail with signature mismatch', function () {
      const wrongSignature = 'sha256=' + 'a'.repeat(64);
      const result = verifySignature(testBody, wrongSignature);

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Signature mismatch');
    });

    it('should fail when body is different', function () {
      const signature = createSignature(testBody, testSecret);
      const differentBody = Buffer.from('{"event":"different"}');
      const result = verifySignature(differentBody, signature);

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Signature mismatch');
    });

    it('should fail when secret is different', function () {
      const signature = createSignature(testBody, 'wrong-secret');
      const result = verifySignature(testBody, signature);

      expect(result.isValid).to.be.false;
      expect(result.status).to.include('Signature mismatch');
    });

    it('should handle empty body', function () {
      const emptyBody = Buffer.from('');
      const signature = createSignature(emptyBody, testSecret);
      const result = verifySignature(emptyBody, signature);

      expect(result.isValid).to.be.true;
      expect(result.status).to.include('VERIFIED');
    });

    it('should handle binary body', function () {
      const binaryBody = Buffer.from([0x00, 0x01, 0x02, 0xff]);
      const signature = createSignature(binaryBody, testSecret);
      const result = verifySignature(binaryBody, signature);

      expect(result.isValid).to.be.true;
      expect(result.status).to.include('VERIFIED');
    });

    it('should handle unicode in body', function () {
      const unicodeBody = Buffer.from('{"emoji":"🎉","text":"こんにちは"}');
      const signature = createSignature(unicodeBody, testSecret);
      const result = verifySignature(unicodeBody, signature);

      expect(result.isValid).to.be.true;
      expect(result.status).to.include('VERIFIED');
    });
  });
});
