/**
 * Tests for webhook state management
 */

import { expect } from 'chai';
import { getSecret, setSecret, clearSecret } from '../../services/webhook-state.js';

describe('Webhook State', function () {
  afterEach(function () {
    clearSecret();
  });

  describe('getSecret', function () {
    it('should return null initially', function () {
      clearSecret();
      expect(getSecret()).to.be.null;
    });

    it('should return the set secret', function () {
      setSecret('my-secret');
      expect(getSecret()).to.equal('my-secret');
    });
  });

  describe('setSecret', function () {
    it('should set a secret', function () {
      setSecret('test-secret');
      expect(getSecret()).to.equal('test-secret');
    });

    it('should overwrite existing secret', function () {
      setSecret('first-secret');
      setSecret('second-secret');
      expect(getSecret()).to.equal('second-secret');
    });

    it('should convert empty string to null', function () {
      setSecret('');
      expect(getSecret()).to.be.null;
    });

    it('should convert undefined to null', function () {
      setSecret(undefined);
      expect(getSecret()).to.be.null;
    });

    it('should set null explicitly', function () {
      setSecret('some-secret');
      setSecret(null);
      expect(getSecret()).to.be.null;
    });

    it('should handle special characters in secret', function () {
      const specialSecret = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      setSecret(specialSecret);
      expect(getSecret()).to.equal(specialSecret);
    });

    it('should handle unicode in secret', function () {
      const unicodeSecret = '密码🔐';
      setSecret(unicodeSecret);
      expect(getSecret()).to.equal(unicodeSecret);
    });
  });

  describe('clearSecret', function () {
    it('should clear the secret', function () {
      setSecret('secret-to-clear');
      clearSecret();
      expect(getSecret()).to.be.null;
    });

    it('should be idempotent', function () {
      clearSecret();
      clearSecret();
      expect(getSecret()).to.be.null;
    });
  });

  describe('isolation', function () {
    it('should maintain state across multiple calls', function () {
      setSecret('persistent');
      expect(getSecret()).to.equal('persistent');
      expect(getSecret()).to.equal('persistent');
      expect(getSecret()).to.equal('persistent');
    });
  });
});
