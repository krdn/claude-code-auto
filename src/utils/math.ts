/**
 * Multiplies two numbers and returns the result.
 *
 * @param a - The first number
 * @param b - The second number
 * @returns The product of a and b
 * @throws {TypeError} If either parameter is not a valid number
 *
 * @example
 * ```typescript
 * multiply(5, 3); // Returns 15
 * multiply(-2, 4); // Returns -8
 * multiply(0.5, 0.2); // Returns 0.1
 * ```
 */
export function multiply(a: number, b: number): number {
  // Validate inputs to ensure they are valid numbers
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Both arguments must be numbers');
  }

  if (isNaN(a) || isNaN(b)) {
    throw new TypeError('Arguments cannot be NaN');
  }

  return a * b;
}
