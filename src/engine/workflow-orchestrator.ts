/**
 * Workflow Orchestrator
 *
 * 에이전트와 스킬의 실행을 조율하여 전체 워크플로우를 관리합니다.
 * Planner → 승인 → Coder → Reviewer → Commit 순서로 진행됩니다.
 */

import type {
  WorkflowConfig,
  WorkflowContext,
  WorkflowStatus,
  WorkflowStep,
  WorkflowEvent,
  WorkflowEventType,
  WorkflowListener,
  WorkflowSummary,
  ApprovalRequest,
  ApprovalResponse,
} from '../types/workflow.js';
import type { AgentInput } from '../types/agent.js';
import { AgentExecutor, approvePlan, rejectPlan } from './agent-executor.js';
import { SkillExecutor } from './skill-executor.js';

/** 기본 워크플로우 설정 */
const DEFAULT_CONFIG: WorkflowConfig = {
  name: 'default-workflow',
  autoApprove: false,
  maxHealingAttempts: 3,
  autoCommit: false,
  debug: false,
};

/**
 * Workflow Orchestrator 클래스
 *
 * 전체 AI 워크플로우를 조율합니다.
 */
export class WorkflowOrchestrator {
  private config: WorkflowConfig;
  private agentExecutor: AgentExecutor;
  private skillExecutor: SkillExecutor;
  private context: WorkflowContext | null = null;
  private listeners: WorkflowListener[] = [];
  private approvalResolver: ((response: ApprovalResponse) => void) | null = null;

  constructor(config: Partial<WorkflowConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agentExecutor = new AgentExecutor({ debug: this.config.debug });
    this.skillExecutor = new SkillExecutor({ debug: this.config.debug, simulate: true });
  }

  /**
   * 현재 상태 반환
   */
  getStatus(): WorkflowStatus {
    return this.context?.status ?? 'idle';
  }

  /**
   * 현재 단계 반환
   */
  getCurrentStep(): WorkflowStep {
    return this.context?.currentStep ?? 'init';
  }

  /**
   * 현재 컨텍스트 반환
   */
  getContext(): WorkflowContext | null {
    return this.context;
  }

  /**
   * 이벤트 리스너 등록
   */
  on(listener: WorkflowListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 워크플로우 시작
   */
  async start(request: string): Promise<WorkflowSummary> {
    // 컨텍스트 초기화
    this.context = this.createContext(request);
    this.emit('workflow:started', { request });

    try {
      // Phase 1: Planning
      await this.runPlanningPhase();

      // Phase 2: Approval (승인 대기)
      if (!this.config.autoApprove) {
        await this.runApprovalPhase();
      } else {
        // 자동 승인
        this.context.agentResults.planner = approvePlan(this.context.agentResults.planner!);
      }

      // 거부되었으면 종료
      if (this.context.agentResults.planner?.approvalStatus === 'rejected') {
        this.context.status = 'cancelled';
        this.emit('workflow:cancelled', { reason: 'rejected' });
        return this.getSummary();
      }

      // Phase 3: Implementation
      await this.runImplementationPhase();

      // Phase 4: Review
      await this.runReviewPhase();

      // Phase 5: Commit (선택적)
      if (this.config.autoCommit && this.context.agentResults.reviewer?.decision === 'approved') {
        await this.runCommitPhase();
      }

      // 완료
      this.context.status = 'completed';
      this.context.completedAt = new Date();
      this.context.currentStep = 'complete';
      this.emit('workflow:completed', {});

      return this.getSummary();
    } catch (error) {
      this.context.status = 'failed';
      this.context.error = error instanceof Error ? error.message : String(error);
      this.emit('workflow:failed', { error: this.context.error });
      return this.getSummary();
    }
  }

  /**
   * 승인 제출 (외부에서 호출)
   */
  submitApproval(approved: boolean, feedback?: string): void {
    if (this.approvalResolver && this.context) {
      this.approvalResolver({
        workflowId: this.context.id,
        approved,
        feedback,
        respondedAt: new Date(),
      });
    }
  }

  /**
   * 워크플로우 취소
   */
  cancel(): void {
    if (this.context && this.context.status !== 'completed' && this.context.status !== 'failed') {
      this.context.status = 'cancelled';
      this.context.completedAt = new Date();
      this.emit('workflow:cancelled', { reason: 'manual' });
    }
  }

  /**
   * 오케스트레이터 리셋
   */
  reset(): void {
    this.context = null;
    this.agentExecutor.reset();
    this.skillExecutor.reset();
    this.approvalResolver = null;
  }

  // ==================== 내부 Phase 메서드 ====================

  private async runPlanningPhase(): Promise<void> {
    if (!this.context) return;

    this.context.status = 'planning';
    this.context.currentStep = 'plan';
    this.emit('agent:started', { agent: 'planner' });

    const input: AgentInput = {
      request: this.context.request,
    };

    const result = await this.agentExecutor.executePlanner(input);
    this.context.agentResults.planner = result;

    if (result.success) {
      this.emit('agent:completed', { agent: 'planner', result });
    } else {
      this.emit('agent:failed', { agent: 'planner', error: result.error });
      throw new Error(result.error || 'Planning failed');
    }
  }

  private async runApprovalPhase(): Promise<void> {
    if (!this.context || !this.context.agentResults.planner) return;

    this.context.status = 'awaiting_approval';
    this.context.currentStep = 'approve';

    const approvalRequest: ApprovalRequest = {
      workflowId: this.context.id,
      plan: this.context.agentResults.planner,
      requestedAt: new Date(),
    };

    // Promise와 resolver를 먼저 설정
    const approvalPromise = new Promise<ApprovalResponse>(resolve => {
      this.approvalResolver = resolve;
    });

    // 그 후 이벤트 발생 (리스너가 submitApproval 호출 가능)
    this.emit('approval:requested', { approvalRequest });

    // 승인 대기
    const response = await approvalPromise;
    this.emit('approval:received', { response });

    if (response.approved) {
      this.context.agentResults.planner = approvePlan(this.context.agentResults.planner);
    } else {
      this.context.agentResults.planner = rejectPlan(
        this.context.agentResults.planner,
        response.feedback
      );
    }
  }

  private async runImplementationPhase(): Promise<void> {
    if (!this.context) return;

    this.context.status = 'implementing';
    this.context.currentStep = 'implement';
    this.emit('agent:started', { agent: 'coder' });

    const input: AgentInput = {
      request: this.context.request,
      plan: this.context.agentResults.planner,
    };

    const result = await this.agentExecutor.executeCoder(input);
    this.context.agentResults.coder = result;

    // Self-healing 결과 보고
    if (result.healingAttempts > 1) {
      this.emit('healing:succeeded', { attempts: result.healingAttempts });
    }

    if (result.success) {
      this.emit('agent:completed', { agent: 'coder', result });
    } else {
      // 자동 복구 실패
      if (result.healingAttempts >= this.config.maxHealingAttempts) {
        this.emit('healing:failed', { attempts: result.healingAttempts });
      }
      this.emit('agent:failed', { agent: 'coder', error: result.error });
      throw new Error(result.error || 'Implementation failed');
    }
  }

  private async runReviewPhase(): Promise<void> {
    if (!this.context) return;

    this.context.status = 'reviewing';
    this.context.currentStep = 'review';
    this.emit('agent:started', { agent: 'reviewer' });

    const input: AgentInput = {
      request: this.context.request,
      implementation: this.context.agentResults.coder,
    };

    const result = await this.agentExecutor.executeReviewer(input);
    this.context.agentResults.reviewer = result;

    if (result.success) {
      this.emit('agent:completed', { agent: 'reviewer', result });
    } else {
      this.emit('agent:failed', { agent: 'reviewer', error: result.error });
      throw new Error(result.error || 'Review failed');
    }
  }

  private async runCommitPhase(): Promise<void> {
    if (!this.context) return;

    this.context.status = 'committing';
    this.context.currentStep = 'commit';
    this.emit('skill:started', { skill: 'commit' });

    const result = await this.skillExecutor.executeCommit();
    this.context.skillResults.commit = result;

    if (result.success) {
      this.emit('skill:completed', { skill: 'commit', result });
    } else {
      this.emit('skill:failed', { skill: 'commit', error: result.error });
    }
  }

  // ==================== 유틸리티 메서드 ====================

  private createContext(request: string): WorkflowContext {
    return {
      id: this.generateId(),
      request,
      startedAt: new Date(),
      status: 'idle',
      currentStep: 'init',
      agentResults: {},
      skillResults: {},
    };
  }

  private generateId(): string {
    return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private emit(type: WorkflowEventType, data: Record<string, unknown>): void {
    if (!this.context) return;

    const event: WorkflowEvent = {
      type,
      timestamp: new Date(),
      workflowId: this.context.id,
      step: this.context.currentStep,
      data,
    };

    if (this.config.debug) {
      console.log(`[Workflow] ${type}`, data);
    }

    // 리스너들에게 이벤트 전달
    this.listeners.forEach(listener => {
      try {
        void listener(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Workflow listener error:', error);
      }
    });
  }

  private getSummary(): WorkflowSummary {
    if (!this.context) {
      throw new Error('No workflow context');
    }

    const now = new Date();
    const duration = now.getTime() - this.context.startedAt.getTime();

    return {
      id: this.context.id,
      status: this.context.status,
      startedAt: this.context.startedAt,
      duration,
      steps: {
        plan: this.getStepStatus('plan'),
        implement: this.getStepStatus('implement'),
        review: this.getStepStatus('review'),
        commit: this.getStepStatus('commit'),
      },
      error: this.context.error,
    };
  }

  private getStepStatus(
    step: 'plan' | 'implement' | 'review' | 'commit'
  ): 'pending' | 'completed' | 'failed' | 'skipped' {
    if (!this.context) return 'pending';

    const stepMap: Record<string, keyof WorkflowContext['agentResults'] | 'commit'> = {
      plan: 'planner',
      implement: 'coder',
      review: 'reviewer',
      commit: 'commit',
    };

    const key = stepMap[step];

    if (step === 'commit') {
      const result = this.context.skillResults.commit;
      if (!result) return this.config.autoCommit ? 'pending' : 'skipped';
      return result.success ? 'completed' : 'failed';
    }

    const result = this.context.agentResults[key as keyof WorkflowContext['agentResults']];
    if (!result) return 'pending';
    return result.success ? 'completed' : 'failed';
  }
}

/**
 * 워크플로우 설정 빌더
 */
export function createWorkflowConfig(overrides: Partial<WorkflowConfig> = {}): WorkflowConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
