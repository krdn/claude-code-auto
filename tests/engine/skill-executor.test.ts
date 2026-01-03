import { describe, it, expect, beforeEach } from 'vitest';
import { SkillExecutor, getSkillConfig } from '../../src/engine/skill-executor';

describe('SkillExecutor', () => {
  let executor: SkillExecutor;

  beforeEach(() => {
    executor = new SkillExecutor({ debug: false, simulate: true });
  });

  describe('getStatus', () => {
    it('should return idle status initially', () => {
      expect(executor.getStatus()).toBe('idle');
    });
  });

  describe('getCurrentSkill', () => {
    it('should return null initially', () => {
      expect(executor.getCurrentSkill()).toBe(null);
    });
  });

  describe('executeCommit', () => {
    it('should execute commit skill', async () => {
      const result = await executor.executeCommit();

      expect(result.skill).toBe('commit');
      expect(result.success).toBe(true);
      expect(result.message).toContain('커밋');
    });

    it('should return hash in result', async () => {
      const result = await executor.executeCommit();

      expect(result.hash).toBeDefined();
    });
  });

  describe('executeTest', () => {
    it('should execute test skill', async () => {
      const result = await executor.executeTest();

      expect(result.skill).toBe('test');
      expect(result.success).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should include coverage info', async () => {
      const result = await executor.executeTest();

      expect(result.coverage).toBeDefined();
      expect(result.coverage?.statements).toBeGreaterThan(0);
    });

    it('should calculate passed correctly', async () => {
      const result = await executor.executeTest();

      expect(result.passed).toBe(result.total - result.failed - result.skipped);
    });
  });

  describe('executeReviewPR', () => {
    it('should execute review-pr skill', async () => {
      const result = await executor.executeReviewPR();

      expect(result.skill).toBe('review-pr');
      expect(result.success).toBe(true);
    });

    it('should return PR info', async () => {
      const result = await executor.executeReviewPR();

      expect(result.prNumber).toBeDefined();
      expect(result.prUrl).toBeDefined();
      expect(result.status).toBe('created');
    });
  });

  describe('execute', () => {
    it('should route to commit skill', async () => {
      const result = await executor.execute('commit');
      expect(result.skill).toBe('commit');
    });

    it('should route to test skill', async () => {
      const result = await executor.execute('test');
      expect(result.skill).toBe('test');
    });

    it('should route to deploy skill', async () => {
      const result = await executor.execute('deploy');
      expect(result.skill).toBe('deploy');
    });

    it('should throw error for unknown skill', async () => {
      await expect(executor.execute('unknown' as 'commit')).rejects.toThrow('Unknown skill');
    });
  });

  describe('findSkillByCommand', () => {
    it('should find commit by /commit', () => {
      const skill = executor.findSkillByCommand('/commit');
      expect(skill).toBe('commit');
    });

    it('should find test by /test', () => {
      const skill = executor.findSkillByCommand('/test');
      expect(skill).toBe('test');
    });

    it('should find review-pr by /review-pr', () => {
      const skill = executor.findSkillByCommand('/review-pr');
      expect(skill).toBe('review-pr');
    });

    it('should return null for unknown command', () => {
      const skill = executor.findSkillByCommand('/unknown');
      expect(skill).toBeNull();
    });
  });

  describe('executeByCommand', () => {
    it('should execute skill by command', async () => {
      const result = await executor.executeByCommand('/commit');

      expect(result.skill).toBe('commit');
      expect(result.success).toBe(true);
    });

    it('should return error for unknown command', async () => {
      const result = await executor.executeByCommand('/unknown');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
    });
  });

  describe('reset', () => {
    it('should reset executor state', async () => {
      await executor.executeCommit();

      executor.reset();

      expect(executor.getStatus()).toBe('idle');
      expect(executor.getCurrentSkill()).toBe(null);
    });
  });

  describe('simulate mode', () => {
    it('should indicate simulation in message', async () => {
      const result = await executor.executeCommit();

      expect(result.message).toContain('시뮬레이션');
    });
  });
});

describe('getSkillConfig', () => {
  it('should return commit config', () => {
    const config = getSkillConfig('commit');

    expect(config.name).toBe('commit');
    expect(config.command).toBe('/commit');
    expect(config.timeout).toBe(30000);
  });

  it('should return test config', () => {
    const config = getSkillConfig('test');

    expect(config.name).toBe('test');
    expect(config.command).toBe('/test');
    expect(config.timeout).toBe(300000);
  });

  it('should return deploy config', () => {
    const config = getSkillConfig('deploy');

    expect(config.name).toBe('deploy');
    expect(config.command).toBe('/deploy');
    expect(config.timeout).toBe(600000);
  });

  it('should return interview config', () => {
    const config = getSkillConfig('interview');

    expect(config.name).toBe('interview');
    expect(config.command).toBe('/interview');
  });
});
