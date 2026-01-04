/**
 * Tests for SSE connection manager
 */

import { expect } from 'chai';
import sinon from 'sinon';
import sseManager from '../../services/sse-manager.js';

describe('SSE Manager', function () {
  // Mock response object
  function createMockResponse() {
    return {
      write: sinon.stub(),
      written: [],
    };
  }

  beforeEach(function () {
    // Clear all connections before each test
    sseManager.connections.clear();
  });

  describe('addConnection', function () {
    it('should add a connection', function () {
      const res = createMockResponse();

      sseManager.addConnection(res);

      expect(sseManager.connections.size).to.equal(1);
      expect(sseManager.connections.has(res)).to.be.true;
    });

    it('should add multiple connections', function () {
      const res1 = createMockResponse();
      const res2 = createMockResponse();

      sseManager.addConnection(res1);
      sseManager.addConnection(res2);

      expect(sseManager.connections.size).to.equal(2);
    });

    it('should not duplicate same connection', function () {
      const res = createMockResponse();

      sseManager.addConnection(res);
      sseManager.addConnection(res);

      expect(sseManager.connections.size).to.equal(1);
    });
  });

  describe('removeConnection', function () {
    it('should remove a connection', function () {
      const res = createMockResponse();
      sseManager.addConnection(res);

      sseManager.removeConnection(res);

      expect(sseManager.connections.size).to.equal(0);
    });

    it('should handle removing non-existent connection', function () {
      const res = createMockResponse();

      expect(() => sseManager.removeConnection(res)).to.not.throw();
      expect(sseManager.connections.size).to.equal(0);
    });

    it('should only remove specified connection', function () {
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      sseManager.addConnection(res1);
      sseManager.addConnection(res2);

      sseManager.removeConnection(res1);

      expect(sseManager.connections.size).to.equal(1);
      expect(sseManager.connections.has(res2)).to.be.true;
    });
  });

  describe('broadcast', function () {
    it('should send message to single connection', function () {
      const res = createMockResponse();
      sseManager.addConnection(res);

      sseManager.broadcast({
        id: 1,
        event: 'webhook',
        data: '{"test":true}',
      });

      expect(res.write.calledOnce).to.be.true;
      const message = res.write.firstCall.args[0];
      expect(message).to.include('id: 1');
      expect(message).to.include('event: webhook');
      expect(message).to.include('data: {"test":true}');
      expect(message).to.match(/\n\n$/);
    });

    it('should send message to multiple connections', function () {
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      sseManager.addConnection(res1);
      sseManager.addConnection(res2);

      sseManager.broadcast({
        id: 1,
        event: 'test',
        data: '{}',
      });

      expect(res1.write.calledOnce).to.be.true;
      expect(res2.write.calledOnce).to.be.true;
    });

    it('should handle no connections gracefully', function () {
      expect(() =>
        sseManager.broadcast({
          id: 1,
          event: 'test',
          data: '{}',
        })
      ).to.not.throw();
    });

    it('should remove failed connections', function () {
      const goodRes = createMockResponse();
      const badRes = createMockResponse();
      badRes.write.throws(new Error('Connection closed'));

      sseManager.addConnection(goodRes);
      sseManager.addConnection(badRes);

      sseManager.broadcast({
        id: 1,
        event: 'test',
        data: '{}',
      });

      expect(sseManager.connections.size).to.equal(1);
      expect(sseManager.connections.has(goodRes)).to.be.true;
      expect(sseManager.connections.has(badRes)).to.be.false;
    });

    it('should continue broadcasting after failed connection', function () {
      const res1 = createMockResponse();
      const badRes = createMockResponse();
      const res2 = createMockResponse();
      badRes.write.throws(new Error('Connection closed'));

      sseManager.addConnection(res1);
      sseManager.addConnection(badRes);
      sseManager.addConnection(res2);

      sseManager.broadcast({
        id: 1,
        event: 'test',
        data: '{}',
      });

      expect(res1.write.calledOnce).to.be.true;
      expect(res2.write.calledOnce).to.be.true;
    });

    it('should format message correctly with SSE spec', function () {
      const res = createMockResponse();
      sseManager.addConnection(res);

      sseManager.broadcast({
        id: 42,
        event: 'custom-event',
        data: '{"key":"value"}',
      });

      const message = res.write.firstCall.args[0];
      expect(message).to.equal('id: 42\nevent: custom-event\ndata: {"key":"value"}\n\n');
    });
  });
});
