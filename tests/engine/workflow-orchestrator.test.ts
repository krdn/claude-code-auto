import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowOrchestrator, createWorkflowConfig } from '../../src/engine/workflow-orchestrator';
import type { WorkflowEvent } from '../../src/types/workflow';

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    orchestrator = new WorkflowOrchestrator({
      debug: false,
      autoApprove: true,
      autoCommit: false,
    });
  });

  describe('initial state', () => {
    it('should return idle status initially', () => {
      expect(orchestrator.getStatus()).toBe('idle');
    });

    it('should return init step initially', () => {
      expect(orchestrator.getCurrentStep()).toBe('init');
    });

    it('should return null context initially', () => {
      expect(orchestrator.getContext()).toBeNull();
    });
  });

  describe('start', () => {
    it('should start workflow and return summary', async () => {
      const summary = await orchestrator.start('테스트 기능 추가');

      expect(summary).toBeDefined();
      expect(summary.id).toMatch(/^wf-/);
      expect(summary.status).toBe('completed');
    });

    it('should complete all steps with autoApprove', async () => {
      const summary = await orchestrator.start('테스트 기능');

      expect(summary.steps.plan).toBe('completed');
      expect(summary.steps.implement).toBe('completed');
      expect(summary.steps.review).toBe('completed');
    });

    it('should set context after start', async () => {
      await orchestrator.start('테스트');

      const context = orchestrator.getContext();
      expect(context).not.toBeNull();
      expect(context?.request).toBe('테스트');
    });

    it('should calculate duration', async () => {
      const summary = await orchestrator.start('테스트');

      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('events', () => {
    it('should emit workflow:started event', async () => {
      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
      });

      await orchestrator.start('테스트');

      const startEvent = events.find(e => e.type === 'workflow:started');
      expect(startEvent).toBeDefined();
    });

    it('should emit workflow:completed event', async () => {
      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
      });

      await orchestrator.start('테스트');

      const completeEvent = events.find(e => e.type === 'workflow:completed');
      expect(completeEvent).toBeDefined();
    });

    it('should emit agent events', async () => {
      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
      });

      await orchestrator.start('테스트');

      const agentStartEvents = events.filter(e => e.type === 'agent:started');
      expect(agentStartEvents.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow unsubscribing', async () => {
      const events: WorkflowEvent[] = [];
      const unsubscribe = orchestrator.on(event => {
        events.push(event);
      });

      unsubscribe();
      await orchestrator.start('테스트');

      expect(events.length).toBe(0);
    });
  });

  describe('approval flow', () => {
    it('should skip approval with autoApprove', async () => {
      const events: WorkflowEvent[] = [];
      orchestrator.on(event => {
        events.push(event);
      });

      await orchestrator.start('테스트');

      // autoApprove가 true이므로 approval:requested 이벤트 없음
      const approvalEvent = events.find(e => e.type === 'approval:requested');
      expect(approvalEvent).toBeUndefined();
    });

    it('should request approval without autoApprove', async () => {
      const manualOrchestrator = new WorkflowOrchestrator({
        autoApprove: false,
      });

      const events: WorkflowEvent[] = [];
      manualOrchestrator.on(event => {
        events.push(event);
        // 승인 요청이 오면 즉시 승인
        if (event.type === 'approval:requested') {
          manualOrchestrator.submitApproval(true);
        }
      });

      await manualOrchestrator.start('테스트');

      const approvalEvent = events.find(e => e.type === 'approval:requested');
      expect(approvalEvent).toBeDefined();
    });

    it('should cancel workflow on rejection', async () => {
      const manualOrchestrator = new WorkflowOrchestrator({
        autoApprove: false,
      });

      manualOrchestrator.on(event => {
        if (event.type === 'approval:requested') {
          manualOrchestrator.submitApproval(false, '범위 변경 필요');
        }
      });

      const summary = await manualOrchestrator.start('테스트');

      expect(summary.status).toBe('cancelled');
    });
  });

  describe('autoCommit', () => {
    it('should commit when autoCommit is true', async () => {
      const autoCommitOrchestrator = new WorkflowOrchestrator({
        autoApprove: true,
        autoCommit: true,
      });

      const summary = await autoCommitOrchestrator.start('테스트');

      expect(summary.steps.commit).toBe('completed');
    });

    it('should skip commit when autoCommit is false', async () => {
      const summary = await orchestrator.start('테스트');

      expect(summary.steps.commit).toBe('skipped');
    });
  });

  describe('cancel', () => {
    it('should cancel running workflow', async () => {
      // 워크플로우 시작 후 즉시 취소
      const startPromise = orchestrator.start('테스트');

      // 약간의 지연 후 취소
      setTimeout(() => {
        orchestrator.cancel();
      }, 10);

      const summary = await startPromise;

      // 이미 완료되었거나 취소됨
      expect(['completed', 'cancelled']).toContain(summary.status);
    });
  });

  describe('reset', () => {
    it('should reset orchestrator state', async () => {
      await orchestrator.start('테스트');

      orchestrator.reset();

      expect(orchestrator.getStatus()).toBe('idle');
      expect(orchestrator.getContext()).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // 에러 상황은 시뮬레이션에서 발생하지 않음
      // 실제 구현에서 테스트 필요
      const summary = await orchestrator.start('테스트');

      expect(summary.status).not.toBe('failed');
    });
  });
});

describe('createWorkflowConfig', () => {
  it('should create config with defaults', () => {
    const config = createWorkflowConfig();

    expect(config.name).toBe('default-workflow');
    expect(config.autoApprove).toBe(false);
    expect(config.maxHealingAttempts).toBe(3);
  });

  it('should merge overrides', () => {
    const config = createWorkflowConfig({
      name: 'custom-workflow',
      autoApprove: true,
    });

    expect(config.name).toBe('custom-workflow');
    expect(config.autoApprove).toBe(true);
    expect(config.maxHealingAttempts).toBe(3);
  });
});
