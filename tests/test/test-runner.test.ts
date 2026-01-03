/**
 * TestRunner Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestRunner } from '../../src/test/test-runner';
import { execa } from 'execa';
import type { TestRunOptions } from '../../src/types/test';

// execa 모킹
vi.mock('execa');

describe('TestRunner', () => {
  let testRunner: TestRunner;

  beforeEach(() => {
    testRunner = new TestRunner({
      workingDir: '/test/dir',
      debug: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runTests', () => {
    describe('vitest', () => {
      it('should run vitest successfully with JSON output', async () => {
        const mockVitestOutput = {
          testResults: [
            {
              name: 'test.spec.ts',
              startTime: 1000,
              endTime: 1500,
              assertionResults: [
                {
                  title: 'should work',
                  status: 'passed',
                  duration: 100,
                },
                {
                  title: 'should fail',
                  status: 'failed',
                  duration: 50,
                  failureMessages: ['Expected true to be false'],
                },
              ],
            },
          ],
        };

        vi.mocked(execa).mockResolvedValue({
          stdout: JSON.stringify(mockVitestOutput),
          stderr: '',
          exitCode: 1,
        } as any);

        const result = await testRunner.runTests({
          framework: 'vitest',
          pattern: '*.test.ts',
        });

        expect(result.success).toBe(false);
        expect(result.total).toBe(2);
        expect(result.passed).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toBe('test.spec.ts');
        expect(result.files[0].cases).toHaveLength(2);
      });

      it('should handle vitest text output fallback', async () => {
        const mockTextOutput = `
Test Files  1 passed (1)
     Tests  5 passed (5)
  Start at  10:00:00
  Duration  2.5s
        `;

        vi.mocked(execa).mockResolvedValue({
          stdout: mockTextOutput,
          stderr: '',
          exitCode: 0,
        } as any);

        const result = await testRunner.runTests({
          framework: 'vitest',
        });

        expect(result.success).toBe(true);
        expect(result.passed).toBe(5);
        expect(result.total).toBe(5);
        expect(result.duration).toBeGreaterThan(0);
      });

      it('should add coverage flag when requested', async () => {
        vi.mocked(execa).mockResolvedValue({
          stdout: '{}',
          stderr: '',
          exitCode: 0,
        } as any);

        await testRunner.runTests({
          framework: 'vitest',
          coverage: true,
        });

        expect(execa).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['vitest', 'run', '--coverage', '--reporter=json']),
          expect.any(Object)
        );
      });

      it('should handle vitest execution error', async () => {
        vi.mocked(execa).mockRejectedValue(new Error('Command failed'));

        const result = await testRunner.runTests({
          framework: 'vitest',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Command failed');
        expect(result.total).toBe(0);
      });
    });

    describe('jest', () => {
      it('should run jest successfully', async () => {
        const mockJestOutput = {
          testResults: [
            {
              name: 'test.spec.ts',
              startTime: 1000,
              endTime: 1200,
              assertionResults: [
                {
                  title: 'test case',
                  status: 'passed',
                  duration: 50,
                },
              ],
            },
          ],
        };

        vi.mocked(execa).mockResolvedValue({
          stdout: JSON.stringify(mockJestOutput),
          stderr: '',
          exitCode: 0,
        } as any);

        const result = await testRunner.runTests({
          framework: 'jest',
        });

        expect(result.success).toBe(true);
        expect(result.total).toBe(1);
        expect(result.passed).toBe(1);
      });

      it('should handle jest JSON parse error', async () => {
        vi.mocked(execa).mockResolvedValue({
          stdout: 'invalid json',
          stderr: '',
          exitCode: 0,
        } as any);

        const result = await testRunner.runTests({
          framework: 'jest',
        });

        expect(result.success).toBe(true);
        expect(result.error).toBe('Failed to parse Jest output');
      });
    });

    it('should throw error for unsupported framework', async () => {
      const result = await testRunner.runTests({
        framework: 'mocha' as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported test framework');
    });

    it('should use default timeout', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
      } as any);

      await testRunner.runTests({});

      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({
          timeout: 300000, // 5분 기본값
        })
      );
    });

    it('should use custom timeout', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
      } as any);

      await testRunner.runTests({
        timeout: 60000,
      });

      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('should pass environment variables', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
      } as any);

      const env = { NODE_ENV: 'test', DEBUG: 'true' };

      await testRunner.runTests({
        env,
      });

      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({
          env,
        })
      );
    });
  });

  describe('runTypeCheck', () => {
    it('should run type check successfully', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await testRunner.runTypeCheck();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse TypeScript errors', async () => {
      const mockOutput = `
src/test.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
src/test.ts(15,3): error TS2345: Argument of type 'null' is not assignable to parameter of type 'string'.
      `;

      vi.mocked(execa).mockResolvedValue({
        stdout: mockOutput,
        stderr: '',
        exitCode: 1,
      } as any);

      const result = await testRunner.runTypeCheck();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toMatchObject({
        file: 'src/test.ts',
        line: 10,
        column: 5,
        code: 'TS2322',
        message: "Type 'string' is not assignable to type 'number'.",
      });
    });

    it('should handle type check execution error', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('tsc not found'));

      const result = await testRunner.runTypeCheck();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('runLint', () => {
    it('should run lint successfully', async () => {
      const mockLintOutput = [
        {
          filePath: '/test/file1.ts',
          messages: [
            {
              line: 5,
              column: 10,
              severity: 2,
              ruleId: 'no-unused-vars',
              message: "'x' is assigned a value but never used.",
            },
            {
              line: 8,
              column: 3,
              severity: 1,
              ruleId: 'prefer-const',
              message: "'y' is never reassigned. Use 'const' instead.",
            },
          ],
        },
      ];

      vi.mocked(execa).mockResolvedValue({
        stdout: JSON.stringify(mockLintOutput),
        stderr: '',
        exitCode: 1,
      } as any);

      const result = await testRunner.runLint();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.warningCount).toBe(1);
      expect(result.problems).toHaveLength(2);
      expect(result.problems[0]).toMatchObject({
        file: '/test/file1.ts',
        line: 5,
        column: 10,
        severity: 'error',
        rule: 'no-unused-vars',
      });
      expect(result.problems[1].severity).toBe('warning');
    });

    it('should handle lint JSON parse error', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: 'invalid json',
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await testRunner.runLint();

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.problems).toHaveLength(0);
    });

    it('should handle lint execution error', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('eslint not found'));

      const result = await testRunner.runLint();

      expect(result.success).toBe(false);
      expect(result.errorCount).toBe(0);
      expect(result.problems).toHaveLength(0);
    });

    it('should handle missing ruleId', async () => {
      const mockLintOutput = [
        {
          filePath: '/test/file.ts',
          messages: [
            {
              line: 1,
              column: 1,
              severity: 2,
              ruleId: null,
              message: 'Parsing error',
            },
          ],
        },
      ];

      vi.mocked(execa).mockResolvedValue({
        stdout: JSON.stringify(mockLintOutput),
        stderr: '',
        exitCode: 1,
      } as any);

      const result = await testRunner.runLint();

      expect(result.problems[0].rule).toBe('unknown');
    });
  });

  describe('configuration', () => {
    it('should use default config when not provided', () => {
      const runner = new TestRunner();
      expect(runner).toBeDefined();
    });

    it('should use provided working directory', async () => {
      const customRunner = new TestRunner({
        workingDir: '/custom/dir',
      });

      vi.mocked(execa).mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0,
      } as any);

      await customRunner.runTests({});

      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/custom/dir',
        })
      );
    });
  });

  describe('createTestRunner helper', () => {
    it('should create TestRunner instance', async () => {
      const { createTestRunner } = await import('../../src/test/test-runner');
      const runner = createTestRunner({ debug: true });

      expect(runner).toBeInstanceOf(TestRunner);
    });
  });
});
