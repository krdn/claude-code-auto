/**
 * Test Runner
 *
 * 테스트 실행 및 결과 수집을 담당하는 클래스
 */

import { execa } from 'execa';
import type {
  TestRunOptions,
  TestRunResult,
  TestFile,
  TestCase,
  TypeCheckResult,
  LintResult,
} from '../types/test.js';

/**
 * TestRunner 설정
 */
export interface TestRunnerConfig {
  /** 작업 디렉토리 */
  workingDir: string;
  /** 디버그 모드 */
  debug: boolean;
}

/**
 * TestRunner 클래스
 *
 * 테스트 실행, 타입 체크, Lint 등을 수행
 */
export class TestRunner {
  private config: TestRunnerConfig;

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = {
      workingDir: config.workingDir || process.cwd(),
      debug: config.debug || false,
    };
  }

  /**
   * 테스트 실행
   */
  async runTests(options: TestRunOptions = {}): Promise<TestRunResult> {
    const framework = options.framework || 'vitest';
    const timeout = options.timeout || 300000; // 5분

    try {
      switch (framework) {
        case 'vitest':
          return await this.runVitest(options, timeout);
        case 'jest':
          return await this.runJest(options, timeout);
        default:
          throw new Error(`Unsupported test framework: ${framework}`);
      }
    } catch (error) {
      return {
        success: false,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        files: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Vitest 실행
   */
  private async runVitest(options: TestRunOptions, timeout: number): Promise<TestRunResult> {
    const args = ['run'];

    // 패턴 지정
    if (options.pattern) {
      args.push(options.pattern);
    }

    // 커버리지
    if (options.coverage) {
      args.push('--coverage');
    }

    // JSON 리포터로 결과 수집
    args.push('--reporter=json');

    try {
      const result = await execa('npx', ['vitest', ...args], {
        cwd: this.config.workingDir,
        timeout,
        env: options.env,
        reject: false, // 테스트 실패해도 예외 발생 안 함
      });

      return this.parseVitestOutput(result.stdout, result.stderr, result.exitCode === 0);
    } catch (error) {
      return {
        success: false,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        files: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Jest 실행
   */
  private async runJest(options: TestRunOptions, timeout: number): Promise<TestRunResult> {
    const args = [];

    // 패턴 지정
    if (options.pattern) {
      args.push(options.pattern);
    }

    // 커버리지
    if (options.coverage) {
      args.push('--coverage');
    }

    // JSON 리포터
    args.push('--json');

    try {
      const result = await execa('npx', ['jest', ...args], {
        cwd: this.config.workingDir,
        timeout,
        env: options.env,
        reject: false,
      });

      return this.parseJestOutput(result.stdout, result.stderr, result.exitCode === 0);
    } catch (error) {
      return {
        success: false,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        files: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Vitest 출력 파싱
   */
  private parseVitestOutput(stdout: string, stderr: string, success: boolean): TestRunResult {
    try {
      // Vitest JSON 출력 파싱
      const jsonMatch = stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return this.convertVitestResult(data, success);
      }

      // JSON 파싱 실패 시 텍스트 파싱
      return this.parseVitestText(stdout, stderr, success);
    } catch (error) {
      if (this.config.debug) {
        console.error('[TestRunner] Vitest parsing error:', error);
      }
      return this.parseVitestText(stdout, stderr, success);
    }
  }

  /**
   * Vitest 텍스트 출력 파싱 (폴백)
   */
  private parseVitestText(stdout: string, stderr: string, success: boolean): TestRunResult {
    // 텍스트 출력에서 테스트 결과 추출
    const output = stdout + stderr;

    // "Tests  X passed (X)" 패턴 찾기
    const testsMatch = output.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
    const durationMatch = output.match(/Duration\s+([\d.]+)/);

    const passed = testsMatch ? parseInt(testsMatch[1], 10) : 0;
    const total = testsMatch ? parseInt(testsMatch[2], 10) : 0;
    const failed = total - passed;
    const duration = durationMatch ? parseFloat(durationMatch[1]) * 1000 : 0;

    return {
      success,
      total,
      passed,
      failed,
      skipped: 0,
      duration,
      files: [],
      stdout,
      stderr,
    };
  }

  /**
   * Vitest JSON 결과 변환
   */
  private convertVitestResult(data: any, success: boolean): TestRunResult {
    const testResults = data.testResults || [];
    const files: TestFile[] = [];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalDuration = 0;

    for (const fileResult of testResults) {
      const cases: TestCase[] = [];

      for (const test of fileResult.assertionResults || []) {
        const status =
          test.status === 'passed' ? 'passed' : test.status === 'failed' ? 'failed' : 'skipped';

        cases.push({
          name: test.title || test.name,
          file: fileResult.name,
          status,
          duration: test.duration || 0,
          error: test.failureMessages ? { message: test.failureMessages.join('\n') } : undefined,
        });

        totalTests++;
        if (status === 'passed') passedTests++;
        else if (status === 'failed') failedTests++;
        else skippedTests++;
      }

      const fileDuration = fileResult.endTime - fileResult.startTime || 0;
      totalDuration += fileDuration;

      files.push({
        path: fileResult.name,
        total: cases.length,
        passed: cases.filter(c => c.status === 'passed').length,
        failed: cases.filter(c => c.status === 'failed').length,
        skipped: cases.filter(c => c.status === 'skipped').length,
        duration: fileDuration,
        cases,
      });
    }

    return {
      success,
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      duration: totalDuration,
      files,
    };
  }

  /**
   * Jest 출력 파싱
   */
  private parseJestOutput(stdout: string, _stderr: string, success: boolean): TestRunResult {
    try {
      const data = JSON.parse(stdout);
      return this.convertVitestResult(data, success); // Jest 형식도 비슷함
    } catch (error) {
      return {
        success,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        files: [],
        error: 'Failed to parse Jest output',
      };
    }
  }

  /**
   * 타입 체크 실행
   */
  async runTypeCheck(): Promise<TypeCheckResult> {
    try {
      const result = await execa('npx', ['tsc', '--noEmit'], {
        cwd: this.config.workingDir,
        reject: false,
      });

      return this.parseTypeCheckOutput(result.stdout + result.stderr, result.exitCode === 0);
    } catch (error) {
      return {
        success: false,
        errorCount: 0,
        warningCount: 0,
        errors: [],
      };
    }
  }

  /**
   * 타입 체크 출력 파싱
   */
  private parseTypeCheckOutput(output: string, success: boolean): TypeCheckResult {
    const errors = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // "src/file.ts(10,5): error TS####: message" 패턴
      const match = line.match(/^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          code: match[4],
          message: match[5],
        });
      }
    }

    return {
      success,
      errorCount: errors.length,
      warningCount: 0,
      errors,
    };
  }

  /**
   * Lint 실행
   */
  async runLint(): Promise<LintResult> {
    try {
      const result = await execa('npx', ['eslint', '.', '--format=json'], {
        cwd: this.config.workingDir,
        reject: false,
      });

      return this.parseLintOutput(result.stdout, result.exitCode === 0);
    } catch (error) {
      return {
        success: false,
        errorCount: 0,
        warningCount: 0,
        problems: [],
      };
    }
  }

  /**
   * Lint 출력 파싱
   */
  private parseLintOutput(output: string, success: boolean): LintResult {
    try {
      const data = JSON.parse(output);
      const problems = [];
      let errorCount = 0;
      let warningCount = 0;

      for (const fileResult of data) {
        for (const message of fileResult.messages || []) {
          const severity: 'error' | 'warning' = message.severity === 2 ? 'error' : 'warning';

          problems.push({
            file: fileResult.filePath,
            line: message.line,
            column: message.column,
            severity,
            rule: message.ruleId || 'unknown',
            message: message.message,
          });

          if (message.severity === 2) errorCount++;
          else warningCount++;
        }
      }

      return {
        success,
        errorCount,
        warningCount,
        problems,
      };
    } catch (error) {
      return {
        success,
        errorCount: 0,
        warningCount: 0,
        problems: [],
      };
    }
  }
}

/**
 * TestRunner 인스턴스 생성 헬퍼
 */
export function createTestRunner(config?: Partial<TestRunnerConfig>): TestRunner {
  return new TestRunner(config);
}
