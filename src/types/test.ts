/**
 * Test Runner Types
 *
 * 테스트 실행 및 결과 파싱 관련 타입 정의
 */

/**
 * 지원하는 테스트 프레임워크
 */
export type TestFramework = 'vitest' | 'jest' | 'mocha';

/**
 * 테스트 실행 옵션
 */
export interface TestRunOptions {
  /** 테스트 프레임워크 (기본: 'vitest') */
  framework?: TestFramework;
  /** 테스트 파일 패턴 */
  pattern?: string;
  /** 커버리지 수집 여부 */
  coverage?: boolean;
  /** Watch 모드 (기본: false) */
  watch?: boolean;
  /** 타임아웃 (ms) */
  timeout?: number;
  /** 환경 변수 */
  env?: Record<string, string>;
}

/**
 * 개별 테스트 결과
 */
export interface TestCase {
  /** 테스트 이름 */
  name: string;
  /** 테스트 파일 경로 */
  file: string;
  /** 상태 */
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  /** 실행 시간 (ms) */
  duration: number;
  /** 에러 메시지 (실패 시) */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * 테스트 파일 결과
 */
export interface TestFile {
  /** 파일 경로 */
  path: string;
  /** 총 테스트 수 */
  total: number;
  /** 통과 수 */
  passed: number;
  /** 실패 수 */
  failed: number;
  /** 스킵 수 */
  skipped: number;
  /** 실행 시간 (ms) */
  duration: number;
  /** 개별 테스트 케이스 */
  cases: TestCase[];
}

/**
 * 커버리지 정보
 */
export interface CoverageInfo {
  /** Statements 커버리지 (%) */
  statements: number;
  /** Branches 커버리지 (%) */
  branches: number;
  /** Functions 커버리지 (%) */
  functions: number;
  /** Lines 커버리지 (%) */
  lines: number;
  /** 커버되지 않은 라인 (파일별) */
  uncoveredLines?: Record<string, number[]>;
}

/**
 * 테스트 실행 결과
 */
export interface TestRunResult {
  /** 성공 여부 (모든 테스트 통과) */
  success: boolean;
  /** 총 테스트 수 */
  total: number;
  /** 통과 수 */
  passed: number;
  /** 실패 수 */
  failed: number;
  /** 스킵 수 */
  skipped: number;
  /** 전체 실행 시간 (ms) */
  duration: number;
  /** 테스트 파일 결과 */
  files: TestFile[];
  /** 커버리지 정보 */
  coverage?: CoverageInfo;
  /** 에러 메시지 (실행 실패 시) */
  error?: string;
  /** 원본 출력 */
  stdout?: string;
  stderr?: string;
}

/**
 * 타입 체크 결과
 */
export interface TypeCheckResult {
  /** 성공 여부 */
  success: boolean;
  /** 에러 수 */
  errorCount: number;
  /** 경고 수 */
  warningCount: number;
  /** 에러 목록 */
  errors: TypeCheckError[];
}

/**
 * 타입 체크 에러
 */
export interface TypeCheckError {
  /** 파일 경로 */
  file: string;
  /** 라인 번호 */
  line: number;
  /** 컬럼 번호 */
  column: number;
  /** 에러 코드 (TS####) */
  code: string;
  /** 에러 메시지 */
  message: string;
}

/**
 * Lint 결과
 */
export interface LintResult {
  /** 성공 여부 */
  success: boolean;
  /** 에러 수 */
  errorCount: number;
  /** 경고 수 */
  warningCount: number;
  /** 문제 목록 */
  problems: LintProblem[];
}

/**
 * Lint 문제
 */
export interface LintProblem {
  /** 파일 경로 */
  file: string;
  /** 라인 번호 */
  line: number;
  /** 컬럼 번호 */
  column: number;
  /** 심각도 */
  severity: 'error' | 'warning';
  /** 규칙 이름 */
  rule: string;
  /** 메시지 */
  message: string;
}
