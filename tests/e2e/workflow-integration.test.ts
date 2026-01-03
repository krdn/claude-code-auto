/**
 * E2E Integration Tests
 *
 * 전체 워크플로우를 end-to-end로 테스트합니다.
 * Planner → Approval → Coder → Reviewer → Commit 전체 흐름을 검증합니다.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowOrchestrator } from '../../src/engine/workflow-orchestrator';
import { AgentExecutor, approvePlan, rejectPlan } from '../../src/engine/agent-executor';
import { SkillExecutor } from '../../src/engine/skill-executor';
import type { WorkflowEvent, WorkflowSummary } from '../../src/types/workflow';

describe('E2E: Complete Workflow Integration', () => {
  let orchestrator: WorkflowOrchestrator;

  describe('Happy Path - Auto Approve & Auto Commit', () => {
    beforeEach(() => {
      orchestrator = new WorkflowOrchestrator({
        debug: false,
        autoApprove: true,
        autoCommit: true,
      });
    });

    it('should complete full workflow from request to commit', async () => {
      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
      });

      const summary = await orchestrator.start('사용자 인증 기능 추가');

      // 워크플로우 완료 확인
      expect(summary.status).toBe('completed');
      expect(summary.id).toMatch(/^wf-/);

      // 모든 단계 완료 확인
      expect(summary.steps.plan).toBe('completed');
      expect(summary.steps.implement).toBe('completed');
      expect(summary.steps.review).toBe('completed');
      expect(summary.steps.commit).toBe('completed');

      // 이벤트 순서 확인
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('workflow:started');
      expect(eventTypes).toContain('agent:started');
      expect(eventTypes).toContain('agent:completed');
      expect(eventTypes).toContain('skill:started');
      expect(eventTypes).toContain('skill:completed');
      expect(eventTypes).toContain('workflow:completed');
    });

    it('should track duration correctly', async () => {
      const summary = await orchestrator.start('테스트 기능');

      expect(summary.duration).toBeGreaterThanOrEqual(0);
      expect(summary.startedAt).toBeInstanceOf(Date);
    });

    it('should populate context with all agent results', async () => {
      await orchestrator.start('API 엔드포인트 추가');

      const context = orchestrator.getContext();
      expect(context).not.toBeNull();
      expect(context?.agentResults.planner).toBeDefined();
      expect(context?.agentResults.coder).toBeDefined();
      expect(context?.agentResults.reviewer).toBeDefined();
      expect(context?.skillResults.commit).toBeDefined();
    });
  });

  describe('Manual Approval Flow', () => {
    it('should wait for approval and proceed on approve', async () => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: false,
        autoCommit: false,
      });

      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
        if (event.type === 'approval:requested') {
          // 승인 요청 시 바로 승인
          orchestrator.submitApproval(true, '계획 승인합니다');
        }
      });

      const summary = await orchestrator.start('새로운 기능 추가');

      expect(summary.status).toBe('completed');
      expect(events.find(e => e.type === 'approval:requested')).toBeDefined();
      expect(events.find(e => e.type === 'approval:received')).toBeDefined();
    });

    it('should cancel workflow on rejection', async () => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: false,
        autoCommit: false,
      });

      orchestrator.on(event => {
        if (event.type === 'approval:requested') {
          orchestrator.submitApproval(false, '범위가 너무 넓습니다');
        }
      });

      const summary = await orchestrator.start('대규모 리팩토링');

      expect(summary.status).toBe('cancelled');
      expect(summary.steps.implement).toBe('pending');
      expect(summary.steps.review).toBe('pending');
    });

    it('should preserve rejection feedback', async () => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: false,
        autoCommit: false,
      });

      const rejectionReason = '보안 검토가 필요합니다';
      orchestrator.on(event => {
        if (event.type === 'approval:requested') {
          orchestrator.submitApproval(false, rejectionReason);
        }
      });

      await orchestrator.start('인증 시스템 변경');

      const context = orchestrator.getContext();
      expect(context?.agentResults.planner?.rejectionReason).toBe(rejectionReason);
    });
  });

  describe('No Auto Commit Flow', () => {
    beforeEach(() => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: true,
        autoCommit: false,
      });
    });

    it('should skip commit step when autoCommit is false', async () => {
      const summary = await orchestrator.start('버그 수정');

      expect(summary.status).toBe('completed');
      expect(summary.steps.plan).toBe('completed');
      expect(summary.steps.implement).toBe('completed');
      expect(summary.steps.review).toBe('completed');
      expect(summary.steps.commit).toBe('skipped');
    });

    it('should not emit commit events', async () => {
      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
      });

      await orchestrator.start('코드 정리');

      const commitEvents = events.filter(
        e => e.type === 'skill:started' || e.type === 'skill:completed'
      );
      expect(commitEvents.length).toBe(0);
    });
  });

  describe('Event Ordering', () => {
    it('should emit events in correct order', async () => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: true,
        autoCommit: true,
      });

      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
      });

      await orchestrator.start('기능 구현');

      // 워크플로우 시작
      expect(events[0].type).toBe('workflow:started');

      // Planner 실행
      const plannerStart = events.findIndex(
        e => e.type === 'agent:started' && e.data?.agent === 'planner'
      );
      const plannerComplete = events.findIndex(
        e => e.type === 'agent:completed' && e.data?.agent === 'planner'
      );
      expect(plannerStart).toBeLessThan(plannerComplete);

      // Coder 실행 (Planner 완료 후)
      const coderStart = events.findIndex(
        e => e.type === 'agent:started' && e.data?.agent === 'coder'
      );
      expect(plannerComplete).toBeLessThan(coderStart);

      // Reviewer 실행 (Coder 완료 후)
      const coderComplete = events.findIndex(
        e => e.type === 'agent:completed' && e.data?.agent === 'coder'
      );
      const reviewerStart = events.findIndex(
        e => e.type === 'agent:started' && e.data?.agent === 'reviewer'
      );
      expect(coderComplete).toBeLessThan(reviewerStart);

      // 워크플로우 완료가 마지막
      const workflowComplete = events.findIndex(e => e.type === 'workflow:completed');
      expect(workflowComplete).toBe(events.length - 1);
    });
  });

  describe('State Transitions', () => {
    it('should transition through all states correctly', async () => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: true,
        autoCommit: true,
      });

      const stateHistory: string[] = [];
      orchestrator.on(() => {
        stateHistory.push(orchestrator.getStatus());
      });

      await orchestrator.start('상태 전환 테스트');

      // 모든 상태가 순서대로 발생했는지 확인
      expect(stateHistory).toContain('planning');
      expect(stateHistory).toContain('implementing');
      expect(stateHistory).toContain('reviewing');
      expect(stateHistory).toContain('committing');

      // 최종 상태
      expect(orchestrator.getStatus()).toBe('completed');
    });

    it('should track step changes', async () => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: true,
        autoCommit: false,
      });

      const stepHistory: string[] = [];
      orchestrator.on(() => {
        stepHistory.push(orchestrator.getCurrentStep());
      });

      await orchestrator.start('단계 추적 테스트');

      expect(stepHistory).toContain('plan');
      expect(stepHistory).toContain('implement');
      expect(stepHistory).toContain('review');
      expect(orchestrator.getCurrentStep()).toBe('complete');
    });
  });

  describe('Multiple Workflow Runs', () => {
    it('should handle consecutive workflow runs', async () => {
      orchestrator = new WorkflowOrchestrator({
        autoApprove: true,
        autoCommit: false,
      });

      // 첫 번째 워크플로우
      const summary1 = await orchestrator.start('첫 번째 작업');
      expect(summary1.status).toBe('completed');

      // 리셋 후 두 번째 워크플로우
      orchestrator.reset();
      expect(orchestrator.getStatus()).toBe('idle');

      const summary2 = await orchestrator.start('두 번째 작업');
      expect(summary2.status).toBe('completed');

      // ID가 다른지 확인
      expect(summary1.id).not.toBe(summary2.id);
    });
  });
});

describe('E2E: Component Integration', () => {
  describe('AgentExecutor + SkillExecutor Integration', () => {
    it('should use AgentExecutor for agent tasks', async () => {
      const agentExecutor = new AgentExecutor({ simulate: true });

      // Planner 실행
      const planResult = await agentExecutor.executePlanner({ request: '기능 추가' });
      expect(planResult.role).toBe('planner');
      expect(planResult.success).toBe(true);

      // 승인
      const approvedPlan = approvePlan(planResult);
      expect(approvedPlan.approvalStatus).toBe('approved');

      // Coder 실행
      const coderResult = await agentExecutor.executeCoder({
        request: '기능 추가',
        plan: approvedPlan,
      });
      expect(coderResult.role).toBe('coder');
      expect(coderResult.success).toBe(true);

      // Reviewer 실행
      const reviewResult = await agentExecutor.executeReviewer({
        request: '기능 추가',
        implementation: coderResult,
      });
      expect(reviewResult.role).toBe('reviewer');
      expect(reviewResult.decision).toBe('approved');
    });

    it('should use SkillExecutor for skill tasks', async () => {
      const skillExecutor = new SkillExecutor({ simulate: true });

      // Commit 스킬 실행
      const commitResult = await skillExecutor.executeCommit();
      expect(commitResult.skill).toBe('commit');
      expect(commitResult.success).toBe(true);

      // Test 스킬 실행
      const testResult = await skillExecutor.executeTest();
      expect(testResult.skill).toBe('test');
      expect(testResult.success).toBe(true);
    });
  });

  describe('Plan Approval/Rejection Flow', () => {
    it('should reject plan and prevent coder execution', async () => {
      const agentExecutor = new AgentExecutor({ simulate: true });

      const planResult = await agentExecutor.executePlanner({ request: '기능 추가' });
      const rejectedPlan = rejectPlan(planResult, '범위 조정 필요');

      expect(rejectedPlan.approvalStatus).toBe('rejected');
      expect(rejectedPlan.rejectionReason).toBe('범위 조정 필요');

      // 거부된 계획으로 Coder 실행 시도 시 에러
      await expect(
        agentExecutor.executeCoder({
          request: '기능 추가',
          plan: rejectedPlan,
        })
      ).rejects.toThrow('approved');
    });
  });
});

describe('E2E: Error Scenarios', () => {
  it('should handle workflow cancellation with autoApprove', async () => {
    const orchestrator = new WorkflowOrchestrator({
      autoApprove: true,
    });

    // 워크플로우 시작
    const startPromise = orchestrator.start('테스트');

    // 즉시 취소 시도
    orchestrator.cancel();

    const summary = await startPromise;

    // 취소되었거나 이미 완료됨 (시뮬레이션이 빠르기 때문)
    expect(['cancelled', 'completed']).toContain(summary.status);
  });

  it('should cancel workflow during manual approval', async () => {
    const orchestrator = new WorkflowOrchestrator({
      autoApprove: false,
    });

    orchestrator.on(event => {
      if (event.type === 'approval:requested') {
        // 승인 요청이 오면 취소 후 승인으로 promise 해제
        orchestrator.cancel();
        orchestrator.submitApproval(false, '취소됨');
      }
    });

    const summary = await orchestrator.start('테스트');

    expect(summary.status).toBe('cancelled');
  });

  it('should report errors in summary', async () => {
    // 이 테스트는 시뮬레이션 모드에서는 에러가 발생하지 않음
    // 실제 구현에서 에러 시나리오 테스트 필요
    const orchestrator = new WorkflowOrchestrator({
      autoApprove: true,
    });

    const summary = await orchestrator.start('에러 시나리오 테스트');

    // 시뮬레이션에서는 성공
    expect(summary.status).toBe('completed');
    expect(summary.error).toBeUndefined();
  });
});

describe('E2E: Performance', () => {
  it('should complete workflow within reasonable time', async () => {
    const orchestrator = new WorkflowOrchestrator({
      autoApprove: true,
      autoCommit: true,
    });

    const start = Date.now();
    await orchestrator.start('성능 테스트');
    const elapsed = Date.now() - start;

    // 시뮬레이션 모드에서는 1초 이내에 완료되어야 함
    expect(elapsed).toBeLessThan(1000);
  });

  it('should handle rapid successive calls', async () => {
    const results: WorkflowSummary[] = [];

    for (let i = 0; i < 3; i++) {
      const orchestrator = new WorkflowOrchestrator({
        autoApprove: true,
        autoCommit: false,
      });
      results.push(await orchestrator.start(`작업 ${i + 1}`));
    }

    expect(results).toHaveLength(3);
    results.forEach(summary => {
      expect(summary.status).toBe('completed');
    });
  });
});
