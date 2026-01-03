/**
 * Agent 타입 정의
 *
 * Planner, Coder, Reviewer 에이전트의 공통 인터페이스와 타입을 정의합니다.
 */

/** 에이전트 역할 타입 */
export type AgentRole = 'planner' | 'coder' | 'reviewer';

/** 모델 타입 */
export type ModelType = 'opus' | 'sonnet' | 'haiku';

/** 에이전트 상태 */
export type AgentStatus = 'idle' | 'running' | 'waiting_approval' | 'completed' | 'failed';

/** 승인 상태 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

/** 에이전트 설정 */
export interface AgentConfig {
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 역할 */
  role: AgentRole;
  /** 설명 */
  description: string;
  /** 사용할 모델 */
  model: ModelType;
  /** 최대 재시도 횟수 */
  maxRetries?: number;
  /** 타임아웃 (ms) */
  timeout?: number;
}

/** 에이전트 입력 */
export interface AgentInput {
  /** 사용자 요청 또는 이전 에이전트의 출력 */
  request: string;
  /** 추가 컨텍스트 */
  context?: Record<string, unknown>;
  /** 이전 계획 (Coder용) */
  plan?: PlanResult;
  /** 이전 구현 결과 (Reviewer용) */
  implementation?: ImplementationResult;
}

/** 에이전트 출력 기본 인터페이스 */
export interface AgentOutput {
  /** 에이전트 역할 */
  role: AgentRole;
  /** 성공 여부 */
  success: boolean;
  /** 결과 메시지 */
  message: string;
  /** 오류 (실패 시) */
  error?: string;
  /** 다음 단계 */
  nextStep?: AgentRole | 'complete' | 'user_intervention';
}

/** Planner 에이전트 결과 */
export interface PlanResult extends AgentOutput {
  role: 'planner';
  /** 계획 제목 */
  title: string;
  /** 목표 */
  objective: string;
  /** 영향받는 파일 목록 */
  affectedFiles: AffectedFile[];
  /** 단계별 작업 */
  phases: Phase[];
  /** 리스크 */
  risks: Risk[];
  /** 승인 상태 */
  approvalStatus: ApprovalStatus;
  /** 거부 사유 (rejected일 때) */
  rejectionReason?: string;
}

/** 영향받는 파일 */
export interface AffectedFile {
  /** 파일 경로 */
  path: string;
  /** 변경 유형 */
  changeType: 'create' | 'modify' | 'delete';
  /** 변경 설명 */
  description: string;
}

/** 작업 단계 */
export interface Phase {
  /** 단계 번호 */
  number: number;
  /** 단계 제목 */
  title: string;
  /** 작업 목록 */
  tasks: Task[];
}

/** 개별 작업 */
export interface Task {
  /** 작업 ID */
  id: string;
  /** 작업 설명 */
  description: string;
  /** 완료 여부 */
  completed: boolean;
  /** 관련 파일 */
  file?: string;
}

/** 리스크 */
export interface Risk {
  /** 리스크 설명 */
  description: string;
  /** 영향도 */
  impact: 'high' | 'medium' | 'low';
  /** 대응 방안 */
  mitigation: string;
}

/** Coder 에이전트 결과 */
export interface ImplementationResult extends AgentOutput {
  role: 'coder';
  /** 생성/수정된 파일 목록 */
  files: FileChange[];
  /** 테스트 결과 */
  testResults: TestResults;
  /** Self-healing 시도 횟수 */
  healingAttempts: number;
}

/** 파일 변경 */
export interface FileChange {
  /** 파일 경로 */
  path: string;
  /** 변경 유형 */
  changeType: 'create' | 'modify' | 'delete';
  /** 변경 요약 */
  summary: string;
  /** 라인 수 (추가/삭제) */
  linesChanged: { added: number; removed: number };
}

/** 테스트 결과 */
export interface TestResults {
  /** 통과 여부 */
  passed: boolean;
  /** 총 테스트 수 */
  total: number;
  /** 통과 테스트 수 */
  passedCount: number;
  /** 실패 테스트 수 */
  failedCount: number;
  /** 커버리지 (%) */
  coverage?: number;
  /** 타입 체크 통과 */
  typeCheck: boolean;
  /** 린트 통과 */
  lint: boolean;
}

/** Reviewer 에이전트 결과 */
export interface ReviewResult extends AgentOutput {
  role: 'reviewer';
  /** 전체 점수 (0-100) */
  score: number;
  /** 요약 */
  summary: ReviewSummary;
  /** 긍정적 요소 */
  positives: string[];
  /** Critical 이슈 */
  criticalIssues: ReviewIssue[];
  /** 개선 제안 */
  suggestions: ReviewIssue[];
  /** 보안 검사 결과 */
  securityCheck: SecurityCheck;
  /** 최종 결정 */
  decision: 'approved' | 'conditional' | 'rejected';
  /** 조건 (conditional일 경우) */
  conditions?: string[];
}

/** 리뷰 요약 */
export interface ReviewSummary {
  /** 전체 품질 */
  quality: 'pass' | 'warning' | 'fail';
  /** 보안 */
  security: 'pass' | 'warning' | 'fail';
  /** 성능 */
  performance: 'pass' | 'warning' | 'fail';
  /** 테스트 커버리지 */
  testCoverage: 'pass' | 'warning' | 'fail';
}

/** 리뷰 이슈 */
export interface ReviewIssue {
  /** 파일 경로 */
  file: string;
  /** 라인 번호 */
  line?: number;
  /** 이슈 설명 */
  description: string;
  /** 권장 조치 */
  recommendation?: string;
}

/** 보안 검사 결과 */
export interface SecurityCheck {
  sqlInjection: 'safe' | 'warning' | 'vulnerable' | 'na';
  xss: 'safe' | 'warning' | 'vulnerable' | 'na';
  csrf: 'safe' | 'warning' | 'vulnerable' | 'na';
  authentication: 'proper' | 'warning' | 'improper' | 'na';
  sensitiveData: 'none' | 'warning' | 'exposed' | 'na';
}

/** 워크플로우 상태 */
export interface WorkflowState {
  /** 워크플로우 ID */
  id: string;
  /** 현재 단계 */
  currentStep: AgentRole | 'complete';
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 에이전트 결과들 */
  results: {
    planner?: PlanResult;
    coder?: ImplementationResult;
    reviewer?: ReviewResult;
  };
  /** 에러 */
  error?: string;
}
