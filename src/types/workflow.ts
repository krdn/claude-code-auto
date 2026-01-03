/**
 * Workflow 타입 정의
 *
 * 워크플로우 오케스트레이션에 필요한 인터페이스와 타입을 정의합니다.
 */

import type { AgentRole, PlanResult, ImplementationResult, ReviewResult } from './agent.js';
import type { SkillName, SkillOutput } from './skill.js';

/** 워크플로우 상태 */
export type WorkflowStatus =
  | 'idle'
  | 'planning'
  | 'awaiting_approval'
  | 'implementing'
  | 'reviewing'
  | 'committing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** 워크플로우 단계 */
export type WorkflowStep =
  | 'init'
  | 'plan'
  | 'approve'
  | 'implement'
  | 'review'
  | 'commit'
  | 'complete';

/** 워크플로우 설정 */
export interface WorkflowConfig {
  /** 워크플로우 이름 */
  name: string;
  /** 자동 승인 활성화 */
  autoApprove: boolean;
  /** Self-healing 최대 시도 횟수 */
  maxHealingAttempts: number;
  /** 자동 커밋 활성화 */
  autoCommit: boolean;
  /** 디버그 모드 */
  debug: boolean;
}

/** 워크플로우 컨텍스트 */
export interface WorkflowContext {
  /** 워크플로우 ID */
  id: string;
  /** 사용자 요청 */
  request: string;
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt?: Date;
  /** 현재 상태 */
  status: WorkflowStatus;
  /** 현재 단계 */
  currentStep: WorkflowStep;
  /** 에이전트 결과 */
  agentResults: {
    planner?: PlanResult;
    coder?: ImplementationResult;
    reviewer?: ReviewResult;
  };
  /** 스킬 결과 */
  skillResults: {
    commit?: SkillOutput;
    test?: SkillOutput;
    [key: string]: SkillOutput | undefined;
  };
  /** 에러 */
  error?: string;
  /** 메타데이터 */
  metadata?: Record<string, unknown>;
}

/** 워크플로우 이벤트 타입 */
export type WorkflowEventType =
  | 'workflow:started'
  | 'workflow:step_changed'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'workflow:cancelled'
  | 'agent:started'
  | 'agent:completed'
  | 'agent:failed'
  | 'skill:started'
  | 'skill:completed'
  | 'skill:failed'
  | 'approval:requested'
  | 'approval:received'
  | 'healing:started'
  | 'healing:succeeded'
  | 'healing:failed';

/** 워크플로우 이벤트 */
export interface WorkflowEvent {
  /** 이벤트 타입 */
  type: WorkflowEventType;
  /** 타임스탬프 */
  timestamp: Date;
  /** 워크플로우 ID */
  workflowId: string;
  /** 현재 단계 */
  step: WorkflowStep;
  /** 관련 에이전트 */
  agent?: AgentRole;
  /** 관련 스킬 */
  skill?: SkillName;
  /** 추가 데이터 */
  data?: Record<string, unknown>;
}

/** 워크플로우 리스너 */
export type WorkflowListener = (event: WorkflowEvent) => void | Promise<void>;

/** 승인 요청 */
export interface ApprovalRequest {
  /** 워크플로우 ID */
  workflowId: string;
  /** 계획 */
  plan: PlanResult;
  /** 요청 시간 */
  requestedAt: Date;
  /** 만료 시간 */
  expiresAt?: Date;
}

/** 승인 응답 */
export interface ApprovalResponse {
  /** 워크플로우 ID */
  workflowId: string;
  /** 승인 여부 */
  approved: boolean;
  /** 피드백 */
  feedback?: string;
  /** 응답 시간 */
  respondedAt: Date;
}

/** 워크플로우 요약 */
export interface WorkflowSummary {
  /** 워크플로우 ID */
  id: string;
  /** 상태 */
  status: WorkflowStatus;
  /** 시작 시간 */
  startedAt: Date;
  /** 소요 시간 (ms) */
  duration: number;
  /** 단계별 상태 */
  steps: {
    plan: 'pending' | 'completed' | 'failed' | 'skipped';
    implement: 'pending' | 'completed' | 'failed' | 'skipped';
    review: 'pending' | 'completed' | 'failed' | 'skipped';
    commit: 'pending' | 'completed' | 'failed' | 'skipped';
  };
  /** 에러 */
  error?: string;
}
