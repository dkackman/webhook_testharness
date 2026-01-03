/**
 * Tests for pageModule.js
 */

import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PageModule', function () {
  let window, createPageModule;

  beforeEach(function () {
    // Set up DOM
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="test-form">
            <input id="test-input" type="text" />
          </form>
          <div id="loading"></div>
          <div id="error"></div>
          <div id="error-message"></div>
          <div id="container"></div>
          <div id="data"></div>
        </body>
      </html>
    `);
    window = dom.window;
    global.window = window;
    global.document = window.document;

    // Make window available in Function constructor scope
    global.window = window;

    // Load dependencies
    const configPath = join(__dirname, '../../public/javascripts/config.js');
    const configCode = readFileSync(configPath, 'utf-8');
    new window.Function(configCode).call(window);

    const loggerPath = join(__dirname, '../../public/javascripts/logger.js');
    const loggerCode = readFileSync(loggerPath, 'utf-8');
    new window.Function(loggerCode).call(window);

    const stateManagerPath = join(__dirname, '../../public/javascripts/stateManager.js');
    const stateManagerCode = readFileSync(stateManagerPath, 'utf-8');
    new window.Function(stateManagerCode).call(window);
    // Make createStateManager available globally for pageModule
    global.createStateManager = window.createStateManager;

    const validatorsPath = join(__dirname, '../../public/javascripts/validators.js');
    const validatorsCode = readFileSync(validatorsPath, 'utf-8');
    new window.Function(validatorsCode).call(window);

    const jsonRendererPath = join(__dirname, '../../public/javascripts/jsonRenderer.js');
    const jsonRendererCode = readFileSync(jsonRendererPath, 'utf-8');
    new window.Function(jsonRendererCode).call(window);
    // Make renderJsonWithSyntax available globally for pageModule
    global.renderJsonWithSyntax = window.renderJsonWithSyntax;

    const fetcherPath = join(__dirname, '../../public/javascripts/fetcher.js');
    const fetcherCode = readFileSync(fetcherPath, 'utf-8');
    new window.Function(fetcherCode).call(window);
    // Make fetcher functions available globally for pageModule
    global.buildUrl = window.buildUrl;
    global.fetchWithCache = window.fetchWithCache;

    // Load pageModule
    const pageModulePath = join(__dirname, '../../public/javascripts/pageModule.js');
    const code = readFileSync(pageModulePath, 'utf-8');
    new window.Function(code).call(window);
    createPageModule = window.createPageModule;
  });

  describe('createPageModule', function () {
    it('should create a page module with valid config', function () {
      const module = createPageModule({
        formId: 'test-form',
        inputId: 'test-input',
        entityType: 'test',
        apiEndpoint: '/api/test',
        validateFunction: window.validateCoinIds,
        urlParamName: 'test_ids',
        stateConfig: {
          loading: 'loading',
          error: 'error',
          errorMessage: 'error-message',
          container: 'container',
          data: 'data',
        },
      });

      expect(module).to.be.an('object');
      expect(module.init).to.be.a('function');
      expect(module.fetchData).to.be.a('function');
    });

    it('should throw error for missing required config', function () {
      expect(() => {
        createPageModule({
          formId: 'test-form',
          // Missing other required fields
        });
      }).to.throw('Missing required config');
    });

    it('should throw error if form element not found', function () {
      expect(() => {
        createPageModule({
          formId: 'nonexistent-form',
          inputId: 'test-input',
          entityType: 'test',
          apiEndpoint: '/api/test',
          validateFunction: window.validateCoinIds,
          urlParamName: 'test_ids',
          stateConfig: {
            loading: 'loading',
            error: 'error',
            errorMessage: 'error-message',
            container: 'container',
            data: 'data',
          },
        });
      }).to.throw('Form element not found');
    });

    it('should throw error if input element not found', function () {
      expect(() => {
        createPageModule({
          formId: 'test-form',
          inputId: 'nonexistent-input',
          entityType: 'test',
          apiEndpoint: '/api/test',
          validateFunction: window.validateCoinIds,
          urlParamName: 'test_ids',
          stateConfig: {
            loading: 'loading',
            error: 'error',
            errorMessage: 'error-message',
            container: 'container',
            data: 'data',
          },
        });
      }).to.throw('Input element not found');
    });
  });
});
