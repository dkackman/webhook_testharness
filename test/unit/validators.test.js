/**
 * Tests for validators.js
 */

import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Validators', function () {
  let window;

  before(function () {
    // Set up DOM and load validators
    const dom = new JSDOM('<!DOCTYPE html>');
    window = dom.window;
    global.window = window;

    const validatorsPath = join(__dirname, '../../public/javascripts/validators.js');
    const code = readFileSync(validatorsPath, 'utf-8');
    const script = new window.Function(code);
    script.call(window);
  });

  describe('validateHexString', function () {
    it('should validate correct hex strings', function () {
      const result = window.validateHexString('abcd1234');
      expect(result.valid).to.be.true;
      expect(result.value).to.equal('abcd1234');
    });

    it('should reject non-hex characters', function () {
      const result = window.validateHexString('xyz123');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('hexadecimal');
    });

    it('should reject odd-length hex strings', function () {
      const result = window.validateHexString('abc');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('even number');
    });

    it('should validate exact length when specified', function () {
      const result = window.validateHexString('abcd1234', 8);
      expect(result.valid).to.be.true;
    });

    it('should reject wrong length when exact length specified', function () {
      const result = window.validateHexString('abcd', 8);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('8 characters');
    });

    it('should reject empty strings', function () {
      const result = window.validateHexString('');
      expect(result.valid).to.be.false;
      expect(result.error).to.include('required');
    });

    it('should trim whitespace', function () {
      const result = window.validateHexString('  abcd1234  ');
      expect(result.valid).to.be.true;
      expect(result.value).to.equal('abcd1234');
    });
  });

  describe('validateTransactionId', function () {
    it('should validate 64-character hex string', function () {
      const txId = 'a'.repeat(64);
      const result = window.validateTransactionId(txId);
      expect(result.valid).to.be.true;
    });

    it('should reject wrong length', function () {
      const txId = 'a'.repeat(32);
      const result = window.validateTransactionId(txId);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('64 characters');
    });
  });

  describe('validateCoinIds', function () {
    it('should validate single coin ID', function () {
      const coinId = 'a'.repeat(64);
      const result = window.validateCoinIds(coinId);
      expect(result.valid).to.be.true;
      expect(result.values).to.deep.equal([coinId]);
    });

    it('should validate multiple comma-separated coin IDs', function () {
      const id1 = 'a'.repeat(64);
      const id2 = 'b'.repeat(64);
      const result = window.validateCoinIds(`${id1}, ${id2}`);
      expect(result.valid).to.be.true;
      expect(result.values).to.have.lengthOf(2);
    });

    it('should reject if any ID is invalid', function () {
      const id1 = 'a'.repeat(64);
      const id2 = 'xyz';
      const result = window.validateCoinIds(`${id1}, ${id2}`);
      expect(result.valid).to.be.false;
      expect(result.error).to.include('ID 2');
    });

    it('should handle extra whitespace', function () {
      const id1 = 'a'.repeat(64);
      const id2 = 'b'.repeat(64);
      const result = window.validateCoinIds(`  ${id1}  ,  ${id2}  `);
      expect(result.valid).to.be.true;
      expect(result.values).to.have.lengthOf(2);
    });
  });

  describe('validateAssetIds', function () {
    it('should validate asset IDs', function () {
      const assetId = 'f'.repeat(64);
      const result = window.validateAssetIds(assetId);
      expect(result.valid).to.be.true;
    });
  });

  describe('validateLauncherIds', function () {
    it('should validate launcher IDs', function () {
      const launcherId = '1'.repeat(64);
      const result = window.validateLauncherIds(launcherId);
      expect(result.valid).to.be.true;
    });
  });

  describe('sanitizeInput', function () {
    it('should escape HTML characters', function () {
      const result = window.sanitizeInput('<script>alert("xss")</script>');
      expect(result).to.not.include('<script>');
      expect(result).to.include('&lt;script&gt;');
    });

    it('should escape quotes', function () {
      const result = window.sanitizeInput('"test" and \'test\'');
      expect(result).to.include('&quot;');
      expect(result).to.include('&#039;');
    });

    it('should handle empty strings', function () {
      const result = window.sanitizeInput('');
      expect(result).to.equal('');
    });
  });
});
