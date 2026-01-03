/**
 * Agent Executor
 *
 * 개별 에이전트의 실행을 담당합니다.
 * Planner, Coder, Reviewer 에이전트를 실행하고 결과를 반환합니다.
 */

import type {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentRole,
  AgentStatus,
  PlanResult,
  ImplementationResult,
  ReviewResult,
  ApprovalStatus,
} from '../types/agent.js';

/** 에이전트 실행기 설정 */
export interface AgentExecutorConfig {
  /** Self-healing 최대 시도 횟수 */
  maxHealingAttempts: number;
  /** 타임아웃 (ms) */
  timeout: number;
  /** 디버그 모드 */
  debug: boolean;
  /** 시뮬레이션 모드 */
  simulate: boolean;
}

/** 기본 설정 */
const DEFAULT_CONFIG: AgentExecutorConfig = {
  maxHealingAttempts: 3,
  timeout: 300000, // 5분
  debug: false,
  simulate: true,
};

/** 에이전트 설정 맵 */
const AGENT_CONFIGS: Record<AgentRole, AgentConfig> = {
  planner: {
    name: 'Planner',
    role: 'planner',
    description: '작업 계획 수립 에이전트',
    model: 'opus',
    maxRetries: 2,
  },
  coder: {
    name: 'Coder',
    role: 'coder',
    description: '코드 작성 에이전트',
    model: 'sonnet',
    maxRetries: 3,
  },
  reviewer: {
    name: 'Reviewer',
    role: 'reviewer',
    description: '코드 리뷰 에이전트',
    model: 'sonnet',
    maxRetries: 2,
  },
};

/**
 * Agent Executor 클래스
 *
 * 에이전트를 실행하고 결과를 수집합니다.
 */
export class AgentExecutor {
  private config: AgentExecutorConfig;
  private status: AgentStatus = 'idle';
  private currentAgent: AgentRole | null = null;

  constructor(config: Partial<AgentExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 현재 상태 반환
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * 현재 실행 중인 에이전트 반환
   */
  getCurrentAgent(): AgentRole | null {
    return this.currentAgent;
  }

  /**
   * Planner 에이전트 실행
   */
  async executePlanner(input: AgentInput): Promise<PlanResult> {
    this.status = 'running';
    this.currentAgent = 'planner';

    try {
      const config = AGENT_CONFIGS.planner;

      if (this.config.debug) {
        console.log(`[${config.name}] Starting with request: ${input.request}`);
      }

      // TODO(human): 실제 AI 모델 호출 로직 구현
      // 현재는 시뮬레이션된 결과 반환
      const result = await this.simulatePlannerExecution(input);

      this.status = 'waiting_approval';
      return result;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * Coder 에이전트 실행
   */
  async executeCoder(input: AgentInput): Promise<ImplementationResult> {
    if (!input.plan) {
      throw new Error('Coder requires an approved plan');
    }

    if (input.plan.approvalStatus !== 'approved') {
      throw new Error('Plan must be approved before execution');
    }

    this.status = 'running';
    this.currentAgent = 'coder';

    try {
      const config = AGENT_CONFIGS.coder;
      let attempts = 0;
      let result: ImplementationResult;

      // Self-healing 루프
      do {
        attempts++;

        if (this.config.debug) {
          console.log(`[${config.name}] Attempt ${attempts}/${this.config.maxHealingAttempts}`);
        }

        result = await this.simulateCoderExecution(input, attempts);

        // 테스트 통과 시 루프 종료
        if (result.testResults.passed) {
          break;
        }

        // 최대 시도 횟수 도달
        if (attempts >= this.config.maxHealingAttempts) {
          result.nextStep = 'user_intervention';
          break;
        }
      } while (!result.testResults.passed);

      this.status = result.success ? 'completed' : 'failed';
      return result;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * Reviewer 에이전트 실행
   */
  async executeReviewer(input: AgentInput): Promise<ReviewResult> {
    if (!input.implementation) {
      throw new Error('Reviewer requires implementation result');
    }

    this.status = 'running';
    this.currentAgent = 'reviewer';

    try {
      const config = AGENT_CONFIGS.reviewer;

      if (this.config.debug) {
        console.log(`[${config.name}] Reviewing ${input.implementation.files.length} files`);
      }

      const result = await this.simulateReviewerExecution(input);

      this.status = 'completed';
      return result;
    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * 에이전트 역할에 따라 실행
   */
  async execute(role: AgentRole, input: AgentInput): Promise<AgentOutput> {
    switch (role) {
      case 'planner':
        return this.executePlanner(input);
      case 'coder':
        return this.executeCoder(input);
      case 'reviewer':
        return this.executeReviewer(input);
      default:
        throw new Error(`Unknown agent role: ${role as string}`);
    }
  }

  /**
   * 실행기 리셋
   */
  reset(): void {
    this.status = 'idle';
    this.currentAgent = null;
  }

  // ==================== 시뮬레이션 메서드 ====================
  // 실제 구현 시 AI 모델 호출로 대체됨

  private async simulatePlannerExecution(input: AgentInput): Promise<PlanResult> {
    // 시뮬레이션된 지연
    await this.delay(100);

    return {
      role: 'planner',
      success: true,
      message: '계획이 성공적으로 수립되었습니다.',
      title: `작업: ${input.request.substring(0, 50)}`,
      objective: input.request,
      affectedFiles: [],
      phases: [
        {
          number: 1,
          title: '기본 구현',
          tasks: [
            { id: 'task-1', description: '기본 구조 생성', completed: false },
            { id: 'task-2', description: '테스트 작성', completed: false },
          ],
        },
      ],
      risks: [],
      approvalStatus: 'pending',
      nextStep: 'coder',
    };
  }

  private async simulateCoderExecution(
    _input: AgentInput,
    attempt: number
  ): Promise<ImplementationResult> {
    await this.delay(100);

    // 첫 시도에서 실패할 확률 시뮬레이션 (테스트용)
    const passed = attempt > 1 || Math.random() > 0.3;

    return {
      role: 'coder',
      success: passed,
      message: passed ? '구현이 완료되었습니다.' : '테스트 실패, 재시도 중...',
      files: [],
      testResults: {
        passed,
        total: 10,
        passedCount: passed ? 10 : 7,
        failedCount: passed ? 0 : 3,
        coverage: 85,
        typeCheck: true,
        lint: true,
      },
      healingAttempts: attempt,
      nextStep: passed ? 'reviewer' : undefined,
    };
  }

  private async simulateReviewerExecution(_input: AgentInput): Promise<ReviewResult> {
    await this.delay(100);

    return {
      role: 'reviewer',
      success: true,
      message: '코드 리뷰가 완료되었습니다.',
      score: 85,
      summary: {
        quality: 'pass',
        security: 'pass',
        performance: 'pass',
        testCoverage: 'pass',
      },
      positives: ['타입 정의가 명확함', '테스트 커버리지 우수'],
      criticalIssues: [],
      suggestions: [],
      securityCheck: {
        sqlInjection: 'na',
        xss: 'safe',
        csrf: 'na',
        authentication: 'proper',
        sensitiveData: 'none',
      },
      decision: 'approved',
      nextStep: 'complete',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 계획 승인 처리
 */
export function approvePlan(plan: PlanResult): PlanResult {
  return {
    ...plan,
    approvalStatus: 'approved' as ApprovalStatus,
  };
}

/**
 * 계획 거부 처리
 */
export function rejectPlan(plan: PlanResult, reason?: string): PlanResult {
  return {
    ...plan,
    approvalStatus: 'rejected' as ApprovalStatus,
    message: reason || '사용자에 의해 거부되었습니다.',
    rejectionReason: reason,
  };
}

/**
 * 계획 수정 요청 처리
 */
export function requestRevision(plan: PlanResult, feedback: string): PlanResult {
  return {
    ...plan,
    approvalStatus: 'needs_revision' as ApprovalStatus,
    message: feedback,
  };
}

/**
 * 에이전트 설정 가져오기
 */
export function getAgentConfig(role: AgentRole): AgentConfig {
  return AGENT_CONFIGS[role];
}
