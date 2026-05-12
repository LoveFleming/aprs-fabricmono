/**
 * HelloWorld Node - Test Suite
 * Covers Input/Output Contract validation and business logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HelloWorldProcessor, helloWorldProcessor } from './helloWorld';

describe('HelloWorld Node - Core Process', () => {
  let processor: HelloWorldProcessor;

  beforeEach(() => {
    processor = new HelloWorldProcessor();
  });

  describe('Input Contract Validation', () => {
    it('should require traceId field', () => {
      expect(() =>
        processor.process({ traceId: '' })
      ).toThrow('BIZ_HELLO_WORLD_REQUEST_INVALID');
    });

    it('should accept valid traceId', () => {
      const result = processor.process({
        traceId: 'test-trace-123',
      });
      expect(result.traceId).toBe('test-trace-123');
    });
  });

  describe('Output Contract Compliance', () => {
    it('should return all required output fields', () => {
      const result = processor.process({
        traceId: 'test-trace-123',
        name: 'Alice',
      });

      // Verify Output Contract fields
      expect(result).toHaveProperty('traceId');
      expect(result).toHaveProperty('greeting');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('nodeInfo');

      // Verify nodeInfo structure
      expect(result.nodeInfo).toHaveProperty('nodeId');
      expect(result.nodeInfo).toHaveProperty('version');
      expect(result.nodeInfo).toHaveProperty('factory');
    });

    it('should include ISO timestamp', () => {
      const result = processor.process({
        traceId: 'test-trace-123',
      });
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('Language Support', () => {
    const testCases = [
      { lang: 'en', name: 'Alice', expected: 'Hello, Alice!' },
      { lang: 'zh', name: 'Bob', expected: '你好, Bob!' },
      { lang: 'ja', name: 'Carol', expected: 'こんにちは, Carol!' },
      { lang: 'es', name: 'David', expected: '¡Hola, David!' },
    ];

    testCases.forEach(({ lang, name, expected }) => {
      it(`should greet in ${lang}`, () => {
        const result = processor.process({
          traceId: 'test-trace',
          name,
          language: lang as any,
        });
        expect(result.message).toContain(expected);
        expect(result.language).toBe(lang);
      });
    });

    it('should default to English for unknown languages', () => {
      const result = processor.process({
        traceId: 'test-trace',
        language: 'fr' as any,
      });
      expect(result.greeting).toBe('Hello');
    });
  });

  describe('Default Values', () => {
    it('should use "World" as default name', () => {
      const result = processor.process({
        traceId: 'test-trace',
      });
      expect(result.message).toContain('World');
    });

    it('should use "en" as default language', () => {
      const result = processor.process({
        traceId: 'test-trace',
      });
      expect(result.language).toBe('en');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', () => {
      const health = processor.health();
      expect(health.status).toBe('healthy');
      expect(health.nodeId).toBe('hello-world-node');
    });
  });
});

describe('HelloWorld Singleton Instance', () => {
  it('should be exported and functional', () => {
    const result = helloWorldProcessor.process({
      traceId: 'singleton-test',
      name: 'Factory',
    });
    expect(result.greeting).toBe('Hello');
    expect(result.message).toContain('Factory');
  });
});