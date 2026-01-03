import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentExecutor,
  approvePlan,
  rejectPlan,
  requestRevision,
  getAgentConfig,
} from '../../src/engine/agent-executor';
import type { PlanResult, AgentInput } from '../../src/types/agent';

describe('AgentExecutor', () => {
  let executor: AgentExecutor;

  beforeEach(() => {
    executor = new AgentExecutor({ debug: false });
  });

  describe('getStatus', () => {
    it('should return idle status initially', () => {
      expect(executor.getStatus()).toBe('idle');
    });
  });

  describe('getCurrentAgent', () => {
    it('should return null initially', () => {
      expect(executor.getCurrentAgent()).toBe(null);
    });
  });

  describe('executePlanner', () => {
    it('should execute planner and return plan result', async () => {
      const input: AgentInput = {
        request: '사용자 프로필 페이지 추가',
      };

      const result = await executor.executePlanner(input);

      expect(result.role).toBe('planner');
      expect(result.success).toBe(true);
      expect(result.approvalStatus).toBe('pending');
      expect(result.phases.length).toBeGreaterThan(0);
    });

    it('should set status to waiting_approval after planning', async () => {
      const input: AgentInput = { request: '테스트 기능 추가' };

      await executor.executePlanner(input);

      expect(executor.getStatus()).toBe('waiting_approval');
    });
  });

  describe('executeCoder', () => {
    it('should throw error without approved plan', async () => {
      const input: AgentInput = {
        request: '테스트',
      };

      await expect(executor.executeCoder(input)).rejects.toThrow('Coder requires an approved plan');
    });

    it('should throw error with unapproved plan', async () => {
      const plan: PlanResult = {
        role: 'planner',
        success: true,
        message: '계획 완료',
        title: '테스트',
        objective: '테스트',
        affectedFiles: [],
        phases: [],
        risks: [],
        approvalStatus: 'pending',
      };

      const input: AgentInput = {
        request: '테스트',
        plan,
      };

      await expect(executor.executeCoder(input)).rejects.toThrow(
        'Plan must be approved before execution'
      );
    });

    it('should execute coder with approved plan', async () => {
      const plan: PlanResult = {
        role: 'planner',
        success: true,
        message: '계획 완료',
        title: '테스트',
        objective: '테스트',
        affectedFiles: [],
        phases: [],
        risks: [],
        approvalStatus: 'approved',
      };

      const input: AgentInput = {
        request: '테스트',
        plan,
      };

      const result = await executor.executeCoder(input);

      expect(result.role).toBe('coder');
      expect(result.healingAttempts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('executeReviewer', () => {
    it('should throw error without implementation', async () => {
      const input: AgentInput = {
        request: '테스트',
      };

      await expect(executor.executeReviewer(input)).rejects.toThrow(
        'Reviewer requires implementation result'
      );
    });

    it('should execute reviewer with implementation', async () => {
      const input: AgentInput = {
        request: '테스트',
        implementation: {
          role: 'coder',
          success: true,
          message: '구현 완료',
          files: [],
          testResults: {
            passed: true,
            total: 10,
            passedCount: 10,
            failedCount: 0,
            typeCheck: true,
            lint: true,
          },
          healingAttempts: 1,
        },
      };

      const result = await executor.executeReviewer(input);

      expect(result.role).toBe('reviewer');
      expect(result.decision).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('execute', () => {
    it('should route to correct executor based on role', async () => {
      const input: AgentInput = { request: '테스트' };

      const planResult = await executor.execute('planner', input);
      expect(planResult.role).toBe('planner');
    });

    it('should throw error for unknown role', async () => {
      const input: AgentInput = { request: '테스트' };

      await expect(executor.execute('unknown' as 'planner', input)).rejects.toThrow(
        'Unknown agent role'
      );
    });
  });

  describe('reset', () => {
    it('should reset executor state', async () => {
      const input: AgentInput = { request: '테스트' };
      await executor.executePlanner(input);

      executor.reset();

      expect(executor.getStatus()).toBe('idle');
      expect(executor.getCurrentAgent()).toBe(null);
    });
  });
});

describe('Plan Approval Functions', () => {
  const basePlan: PlanResult = {
    role: 'planner',
    success: true,
    message: '계획 완료',
    title: '테스트',
    objective: '테스트 목표',
    affectedFiles: [],
    phases: [],
    risks: [],
    approvalStatus: 'pending',
  };

  describe('approvePlan', () => {
    it('should set approval status to approved', () => {
      const approved = approvePlan(basePlan);

      expect(approved.approvalStatus).toBe('approved');
    });

    it('should not modify original plan', () => {
      approvePlan(basePlan);

      expect(basePlan.approvalStatus).toBe('pending');
    });
  });

  describe('rejectPlan', () => {
    it('should set approval status to rejected', () => {
      const rejected = rejectPlan(basePlan);

      expect(rejected.approvalStatus).toBe('rejected');
    });

    it('should include rejection reason', () => {
      const reason = '범위가 너무 넓습니다';
      const rejected = rejectPlan(basePlan, reason);

      expect(rejected.message).toBe(reason);
    });
  });

  describe('requestRevision', () => {
    it('should set approval status to needs_revision', () => {
      const revised = requestRevision(basePlan, '수정 필요');

      expect(revised.approvalStatus).toBe('needs_revision');
    });

    it('should include feedback message', () => {
      const feedback = '테스트 단계를 더 상세히 작성해주세요';
      const revised = requestRevision(basePlan, feedback);

      expect(revised.message).toBe(feedback);
    });
  });
});

describe('getAgentConfig', () => {
  it('should return planner config', () => {
    const config = getAgentConfig('planner');

    expect(config.name).toBe('Planner');
    expect(config.role).toBe('planner');
    expect(config.model).toBe('opus');
  });

  it('should return coder config', () => {
    const config = getAgentConfig('coder');

    expect(config.name).toBe('Coder');
    expect(config.role).toBe('coder');
    expect(config.model).toBe('sonnet');
  });

  it('should return reviewer config', () => {
    const config = getAgentConfig('reviewer');

    expect(config.name).toBe('Reviewer');
    expect(config.role).toBe('reviewer');
    expect(config.model).toBe('sonnet');
  });
});
