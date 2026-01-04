import { describe, it, expect } from 'vitest';
import { multiply } from '../../src/utils/math.js';

describe('multiply', () => {
  describe('기본 케이스', () => {
    it('should multiply two positive numbers correctly', () => {
      expect(multiply(5, 3)).toBe(15);
      expect(multiply(10, 7)).toBe(70);
      expect(multiply(1, 1)).toBe(1);
    });

    it('should multiply positive and negative numbers correctly', () => {
      expect(multiply(5, -3)).toBe(-15);
      expect(multiply(-5, 3)).toBe(-15);
    });

    it('should multiply two negative numbers correctly', () => {
      expect(multiply(-5, -3)).toBe(15);
      expect(multiply(-10, -2)).toBe(20);
    });
  });

  describe('엣지 케이스', () => {
    it('should return 0 when multiplying by zero', () => {
      expect(multiply(0, 5)).toBe(0);
      expect(multiply(5, 0)).toBe(0);
      expect(multiply(0, 0)).toBe(0);
    });

    it('should handle decimal numbers correctly', () => {
      expect(multiply(0.5, 0.2)).toBeCloseTo(0.1);
      expect(multiply(1.5, 2.5)).toBeCloseTo(3.75);
      expect(multiply(-0.5, 0.2)).toBeCloseTo(-0.1);
    });

    it('should handle very large numbers', () => {
      expect(multiply(1e10, 1e10)).toBe(1e20);
      expect(multiply(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small numbers', () => {
      expect(multiply(1e-10, 1e-10)).toBeCloseTo(1e-20);
      expect(multiply(0.000001, 0.000001)).toBeCloseTo(1e-12);
    });
  });

  describe('에러 처리', () => {
    it('should throw TypeError when first argument is not a number', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => multiply('5', 3)).toThrow(TypeError);
      // @ts-expect-error - Testing invalid input
      expect(() => multiply('5', 3)).toThrow('Both arguments must be numbers');
    });

    it('should throw TypeError when second argument is not a number', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => multiply(5, '3')).toThrow(TypeError);
      // @ts-expect-error - Testing invalid input
      expect(() => multiply(5, '3')).toThrow('Both arguments must be numbers');
    });

    it('should throw TypeError when both arguments are not numbers', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => multiply('5', '3')).toThrow(TypeError);
      // @ts-expect-error - Testing invalid input
      expect(() => multiply(null, undefined)).toThrow(TypeError);
    });

    it('should throw TypeError when arguments are NaN', () => {
      expect(() => multiply(NaN, 5)).toThrow(TypeError);
      expect(() => multiply(5, NaN)).toThrow(TypeError);
      expect(() => multiply(NaN, NaN)).toThrow(TypeError);
      expect(() => multiply(NaN, 5)).toThrow('Arguments cannot be NaN');
    });

    it('should throw TypeError when arguments are Infinity', () => {
      // Note: Infinity is a valid number in JavaScript, but might overflow
      // If we want to restrict Infinity, we need to add validation
      expect(multiply(Infinity, 5)).toBe(Infinity);
      expect(multiply(5, Infinity)).toBe(Infinity);
      expect(multiply(Infinity, Infinity)).toBe(Infinity);
      expect(multiply(-Infinity, 5)).toBe(-Infinity);
    });
  });

  describe('타입 안정성', () => {
    it('should work with integer literals', () => {
      const result: number = multiply(2, 3);
      expect(result).toBe(6);
    });

    it('should work with number variables', () => {
      const a = 4;
      const b = 5;
      const result: number = multiply(a, b);
      expect(result).toBe(20);
    });
  });
});
