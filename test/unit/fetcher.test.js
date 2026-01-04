/**
 * Tests for fetcher utilities
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Fetcher', function () {
  let window, fetchStub, originalFetch;
  let fetchWithTimeout, fetchWithRetry, fetchWithCache, buildUrl, clearCache;

  beforeEach(function () {
    // Set up DOM with AbortController
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost:3000',
    });
    window = dom.window;
    global.window = window;
    global.document = window.document;
    global.AbortController = window.AbortController;

    // Mock AppConfig
    window.AppConfig = {
      TIMEOUTS: { FETCH: 5000 },
      CACHE: { TTL: 60000, MAX_SIZE: 50 },
      ERRORS: { FETCH_TIMEOUT: 'Request timed out' },
    };
    global.AppConfig = window.AppConfig;

    // Mock logger
    window.logger = {
      log: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    // Store original fetch and create stub
    originalFetch = global.fetch;
    fetchStub = sinon.stub();
    global.fetch = fetchStub;
    window.fetch = fetchStub;

    // Load fetcher module
    const fetcherPath = join(__dirname, '../../public/javascripts/fetcher.js');
    const fetcherCode = readFileSync(fetcherPath, 'utf-8');
    new window.Function(fetcherCode).call(window);

    // Get exported functions
    fetchWithTimeout = window.fetchWithTimeout;
    fetchWithRetry = window.fetchWithRetry;
    fetchWithCache = window.fetchWithCache;
    buildUrl = window.buildUrl;
    clearCache = window.clearCache;
  });

  afterEach(function () {
    global.fetch = originalFetch;
    sinon.restore();
    if (clearCache) clearCache();
  });

  describe('buildUrl', function () {
    it('should return base URL when no params', function () {
      expect(buildUrl('/api/test', {})).to.equal('/api/test');
    });

    it('should append single parameter', function () {
      expect(buildUrl('/api/test', { id: '123' })).to.equal('/api/test?id=123');
    });

    it('should append multiple parameters', function () {
      const url = buildUrl('/api/test', { a: '1', b: '2' });
      expect(url).to.include('/api/test?');
      expect(url).to.include('a=1');
      expect(url).to.include('b=2');
    });

    it('should encode special characters', function () {
      expect(buildUrl('/api/test', { q: 'hello world' })).to.equal('/api/test?q=hello%20world');
    });

    it('should exclude null values', function () {
      expect(buildUrl('/api/test', { a: '1', b: null })).to.equal('/api/test?a=1');
    });

    it('should exclude undefined values', function () {
      expect(buildUrl('/api/test', { a: '1', b: undefined })).to.equal('/api/test?a=1');
    });

    it('should include empty string values', function () {
      expect(buildUrl('/api/test', { a: '' })).to.equal('/api/test?a=');
    });

    it('should handle numeric values', function () {
      expect(buildUrl('/api/test', { count: 42 })).to.equal('/api/test?count=42');
    });
  });

  describe('fetchWithTimeout', function () {
    it('should return JSON on success', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ success: true }),
      };
      fetchStub.resolves(mockResponse);

      const result = await fetchWithTimeout('/api/test');

      expect(result).to.deep.equal({ success: true });
    });

    it('should use default timeout from config', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({}),
      };
      fetchStub.resolves(mockResponse);

      await fetchWithTimeout('/api/test');

      expect(fetchStub.calledOnce).to.be.true;
      const options = fetchStub.firstCall.args[1];
      expect(options.signal).to.exist;
    });

    it('should throw on non-OK response', async function () {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: sinon.stub().resolves({ error: 'Not found' }),
      };
      fetchStub.resolves(mockResponse);

      try {
        await fetchWithTimeout('/api/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).to.include('Not found');
        expect(error.statusCode).to.equal(404);
      }
    });

    it('should handle JSON parse error on error response', async function () {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: sinon.stub().rejects(new SyntaxError('Invalid JSON')),
      };
      fetchStub.resolves(mockResponse);

      try {
        await fetchWithTimeout('/api/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.statusCode).to.equal(500);
      }
    });

    it('should support POST method with body', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ created: true }),
      };
      fetchStub.resolves(mockResponse);

      await fetchWithTimeout('/api/test', {
        method: 'POST',
        body: { name: 'test' },
      });

      expect(fetchStub.calledOnce).to.be.true;
      const options = fetchStub.firstCall.args[1];
      expect(options.method).to.equal('POST');
      expect(options.body).to.equal('{"name":"test"}');
      expect(options.headers['Content-Type']).to.equal('application/json');
    });
  });

  describe('fetchWithRetry', function () {
    it('should return on first success', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ data: 'test' }),
      };
      fetchStub.resolves(mockResponse);

      const result = await fetchWithRetry('/api/test');

      expect(result).to.deep.equal({ data: 'test' });
      expect(fetchStub.calledOnce).to.be.true;
    });

    it('should retry on 5xx error', async function () {
      this.timeout(5000);

      const errorResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: sinon.stub().resolves({ error: 'Unavailable' }),
      };
      const successResponse = {
        ok: true,
        json: sinon.stub().resolves({ success: true }),
      };

      fetchStub.onCall(0).resolves(errorResponse);
      fetchStub.onCall(1).resolves(successResponse);

      const result = await fetchWithRetry('/api/test', {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(result).to.deep.equal({ success: true });
      expect(fetchStub.calledTwice).to.be.true;
    });

    it('should not retry on 4xx error', async function () {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: sinon.stub().resolves({ error: 'Bad request' }),
      };
      fetchStub.resolves(errorResponse);

      try {
        await fetchWithRetry('/api/test', { maxRetries: 3 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.statusCode).to.equal(400);
        expect(fetchStub.calledOnce).to.be.true;
      }
    });

    it('should respect maxRetries limit', async function () {
      this.timeout(10000);

      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: sinon.stub().resolves({ error: 'Error' }),
      };
      fetchStub.resolves(errorResponse);

      try {
        await fetchWithRetry('/api/test', {
          maxRetries: 2,
          initialDelay: 10,
        });
        expect.fail('Should have thrown');
      } catch (_error) {
        // Initial + 2 retries = 3 calls
        expect(fetchStub.callCount).to.equal(3);
      }
    });

    it('should pass method and body options through', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ success: true }),
      };
      fetchStub.resolves(mockResponse);

      await fetchWithRetry('/api/test', {
        method: 'POST',
        body: { test: true },
      });

      const options = fetchStub.firstCall.args[1];
      expect(options.method).to.equal('POST');
      expect(options.body).to.equal('{"test":true}');
    });
  });

  describe('fetchWithCache', function () {
    it('should cache successful responses', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ cached: true }),
      };
      fetchStub.resolves(mockResponse);

      // First call - should fetch
      await fetchWithCache('/api/test');
      expect(fetchStub.calledOnce).to.be.true;

      // Second call - should use cache
      const result = await fetchWithCache('/api/test');
      expect(result).to.deep.equal({ cached: true });
      expect(fetchStub.calledOnce).to.be.true; // Still only one fetch call
    });

    it('should skip cache when skipCache is true', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ fresh: true }),
      };
      fetchStub.resolves(mockResponse);

      // First call
      await fetchWithCache('/api/test');

      // Second call with skipCache
      await fetchWithCache('/api/test', { skipCache: true });

      expect(fetchStub.calledTwice).to.be.true;
    });

    it('should use different cache entries for different URLs', async function () {
      const mockResponse1 = {
        ok: true,
        json: sinon.stub().resolves({ url: 1 }),
      };
      const mockResponse2 = {
        ok: true,
        json: sinon.stub().resolves({ url: 2 }),
      };
      fetchStub.onCall(0).resolves(mockResponse1);
      fetchStub.onCall(1).resolves(mockResponse2);

      const result1 = await fetchWithCache('/api/test1');
      const result2 = await fetchWithCache('/api/test2');

      expect(result1).to.deep.equal({ url: 1 });
      expect(result2).to.deep.equal({ url: 2 });
      expect(fetchStub.calledTwice).to.be.true;
    });

    it('should clear cache', async function () {
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ data: 'test' }),
      };
      fetchStub.resolves(mockResponse);

      await fetchWithCache('/api/test');
      clearCache();
      await fetchWithCache('/api/test');

      expect(fetchStub.calledTwice).to.be.true;
    });
  });
});
