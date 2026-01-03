/**
 * Skill 타입 정의
 *
 * 스킬 실행에 필요한 인터페이스와 타입을 정의합니다.
 */

import type { CoverageInfo } from './test.js';

/** 스킬 이름 타입 */
export type SkillName = 'commit' | 'test' | 'review-pr' | 'deploy' | 'docs' | 'interview';

/** 스킬 상태 */
export type SkillStatus = 'idle' | 'running' | 'completed' | 'failed';

/** 스킬 설정 */
export interface SkillConfig {
  /** 스킬 이름 */
  name: SkillName;
  /** 명령어 */
  command: string;
  /** 설명 */
  description: string;
  /** 타임아웃 (ms) */
  timeout?: number;
  /** 필수 입력 */
  requiredInputs?: string[];
}

/** 스킬 입력 */
export interface SkillInput {
  /** 명령 인자 */
  args?: string[];
  /** 옵션 */
  options?: Record<string, unknown>;
  /** 작업 디렉토리 */
  workingDir?: string;
}

/** 스킬 출력 기본 인터페이스 */
export interface SkillOutput {
  /** 스킬 이름 */
  skill: SkillName;
  /** 성공 여부 */
  success: boolean;
  /** 결과 메시지 */
  message: string;
  /** 오류 (실패 시) */
  error?: string;
  /** 다음 단계 제안 */
  nextSteps?: string[];
}

/** Commit 스킬 결과 */
export interface CommitResult extends SkillOutput {
  skill: 'commit';
  /** 커밋 해시 */
  hash?: string;
  /** 커밋 메시지 */
  commitMessage?: string;
  /** 변경된 파일 수 */
  filesChanged?: number;
  /** 추가/삭제 라인 수 */
  linesChanged?: { added: number; removed: number };
}

/** Test 스킬 결과 */
export interface TestResult extends SkillOutput {
  skill: 'test';
  /** 총 테스트 수 */
  total: number;
  /** 통과 수 */
  passed: number;
  /** 실패 수 */
  failed: number;
  /** 건너뛴 수 */
  skipped: number;
  /** 실행 시간 (ms) */
  duration: number;
  /** 커버리지 정보 */
  coverage?: CoverageInfo;
  /** 실패한 테스트 상세 */
  failedTests?: FailedTest[];
}

/** 실패한 테스트 정보 */
export interface FailedTest {
  /** 테스트 파일 */
  file: string;
  /** 테스트 이름 */
  name: string;
  /** 에러 메시지 */
  error: string;
  /** 원인 분석 */
  analysis?: string;
  /** 수정 제안 */
  suggestion?: string;
}

/** Review PR 스킬 결과 */
export interface ReviewPRResult extends SkillOutput {
  skill: 'review-pr';
  /** PR 번호 */
  prNumber?: number;
  /** PR URL */
  prUrl?: string;
  /** PR 상태 */
  status?: 'created' | 'updated' | 'merged' | 'closed';
}

/** Deploy 스킬 결과 */
export interface DeployResult extends SkillOutput {
  skill: 'deploy';
  /** 배포 환경 */
  environment?: string;
  /** 배포 URL */
  deployUrl?: string;
  /** 버전 */
  version?: string;
}

/** Docs 스킬 결과 */
export interface DocsResult extends SkillOutput {
  skill: 'docs';
  /** 생성된 문서 파일 */
  files?: string[];
  /** 문서 유형 */
  docType?: 'api' | 'readme' | 'changelog' | 'guide';
}

/** Interview 스킬 결과 */
export interface InterviewResult extends SkillOutput {
  skill: 'interview';
  /** 수집된 요구사항 */
  requirements?: string[];
  /** 확인된 질문과 답변 */
  qna?: Array<{ question: string; answer: string }>;
}

/** 모든 스킬 결과 타입 */
export type AnySkillResult =
  | CommitResult
  | TestResult
  | ReviewPRResult
  | DeployResult
  | DocsResult
  | InterviewResult;

/** 스킬 설정 맵 */
export const SKILL_CONFIGS: Record<SkillName, SkillConfig> = {
  commit: {
    name: 'commit',
    command: '/commit',
    description: 'Git 커밋 자동화',
    timeout: 30000,
  },
  test: {
    name: 'test',
    command: '/test',
    description: '테스트 실행 및 분석',
    timeout: 300000,
  },
  'review-pr': {
    name: 'review-pr',
    command: '/review-pr',
    description: 'PR 생성/리뷰',
    timeout: 60000,
  },
  deploy: {
    name: 'deploy',
    command: '/deploy',
    description: '배포 프로세스',
    timeout: 600000,
  },
  docs: {
    name: 'docs',
    command: '/docs',
    description: '문서 자동 생성',
    timeout: 60000,
  },
  interview: {
    name: 'interview',
    command: '/interview',
    description: '요구사항 수집',
    timeout: 300000,
  },
};
