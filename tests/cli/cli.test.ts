/**
 * CLI 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLI } from '../../src/cli/index';
import { colorize, formatDuration, symbols, progressBar, box, table } from '../../src/cli/utils';

describe('CLI', () => {
  let cli: CLI;
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let logOutput: string[];
  let errorOutput: string[];

  beforeEach(() => {
    cli = new CLI({ simulate: true });
    logOutput = [];
    errorOutput = [];

    originalLog = console.log;
    originalError = console.error;

    console.log = (...args: unknown[]) => {
      logOutput.push(args.map(a => String(a)).join(' '));
    };
    console.error = (...args: unknown[]) => {
      errorOutput.push(args.map(a => String(a)).join(' '));
    };
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  describe('help command', () => {
    it('should display help', async () => {
      await cli.run(['help']);

      const output = logOutput.join('\n');
      expect(output).toContain('AI Orchestrator CLI');
      expect(output).toContain('run');
      expect(output).toContain('skill');
    });

    it('should display help for empty args', async () => {
      await cli.run([]);

      const output = logOutput.join('\n');
      expect(output).toContain('사용법');
    });
  });

  describe('version command', () => {
    it('should display version', async () => {
      await cli.run(['version']);

      const output = logOutput.join('\n');
      expect(output).toContain('v0.1.0');
    });
  });

  describe('run command', () => {
    it('should run workflow with request', async () => {
      await cli.run(['run', '테스트 기능 추가', '--auto-approve']);

      const output = logOutput.join('\n');
      expect(output).toContain('워크플로우');
    });

    it('should fail without request', async () => {
      await cli.run(['run']);

      expect(errorOutput.length).toBeGreaterThan(0);
      expect(process.exitCode).toBe(1);
    });

    it('should accept --debug option', async () => {
      await cli.run(['run', '테스트', '--debug', '--auto-approve']);

      // Debug mode should run successfully
      expect(logOutput.length).toBeGreaterThan(0);
    });

    it('should accept --auto-commit option', async () => {
      await cli.run(['run', '테스트', '--auto-approve', '--auto-commit']);

      const output = logOutput.join('\n');
      expect(output).toContain('Commit');
    });
  });

  describe('skill command', () => {
    it('should run commit skill', async () => {
      await cli.run(['skill', 'commit']);

      const output = logOutput.join('\n');
      expect(output).toContain('commit');
    });

    it('should run test skill', async () => {
      await cli.run(['skill', 'test']);

      const output = logOutput.join('\n');
      expect(output).toContain('test');
    });

    it('should fail with invalid skill', async () => {
      await cli.run(['skill', 'invalid-skill']);

      expect(errorOutput.length).toBeGreaterThan(0);
      expect(process.exitCode).toBe(1);
    });

    it('should fail without skill name', async () => {
      await cli.run(['skill']);

      expect(errorOutput.length).toBeGreaterThan(0);
      expect(process.exitCode).toBe(1);
    });
  });

  describe('status command', () => {
    it('should show status when no workflow running', async () => {
      await cli.run(['status']);

      const output = logOutput.join('\n');
      expect(output).toContain('상태');
    });
  });

  describe('option parsing', () => {
    it('should create CLI with debug option', () => {
      const cliWithDebug = new CLI({ debug: true });
      expect(cliWithDebug).toBeDefined();
    });

    it('should create CLI with simulate option disabled', () => {
      const cliWithNoSimulate = new CLI({ simulate: false });
      expect(cliWithNoSimulate).toBeDefined();
    });
  });
});

describe('CLI Utils', () => {
  describe('colorize', () => {
    it('should apply color codes', () => {
      // Save original and clear NO_COLOR
      const original = process.env.NO_COLOR;
      delete process.env.NO_COLOR;
      delete process.env.CI;

      const colored = colorize('test', 'green');
      expect(colored).toContain('test');

      // Restore
      if (original !== undefined) {
        process.env.NO_COLOR = original;
      }
    });

    it('should not apply colors when NO_COLOR is set', () => {
      const original = process.env.NO_COLOR;
      process.env.NO_COLOR = '1';

      const result = colorize('test', 'green');
      expect(result).toBe('test');

      // Restore
      if (original === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = original;
      }
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5.0s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125000)).toBe('2m 5s');
    });
  });

  describe('symbols', () => {
    it('should have all required symbols', () => {
      expect(symbols.success).toBeDefined();
      expect(symbols.error).toBeDefined();
      expect(symbols.warning).toBeDefined();
      expect(symbols.running).toBeDefined();
    });
  });

  describe('progressBar', () => {
    it('should show 0% for 0 progress', () => {
      expect(progressBar(0, 100)).toContain('0%');
    });

    it('should show 50% for half progress', () => {
      expect(progressBar(50, 100)).toContain('50%');
    });

    it('should show 100% for complete', () => {
      expect(progressBar(100, 100)).toContain('100%');
    });
  });

  describe('box', () => {
    it('should create a box with content', () => {
      const result = box('Hello World');
      expect(result).toContain('─');
      expect(result).toContain('Hello World');
    });

    it('should create a box with title', () => {
      const result = box('Content', 'Title');
      expect(result).toContain('Title');
      expect(result).toContain('Content');
    });
  });

  describe('table', () => {
    it('should create a table', () => {
      const result = table(
        ['Name', 'Age'],
        [
          ['Alice', '30'],
          ['Bob', '25'],
        ]
      );
      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('Alice');
      expect(result).toContain('30');
    });
  });
});
