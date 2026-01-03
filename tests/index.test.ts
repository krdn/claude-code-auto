import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOrchestrator,
  ApprovalLevel,
  defaultAgents,
  defaultSkills,
  getApprovalLevelDescription,
  findSkillByCommand,
  findAgentByRole,
  type OrchestratorConfig,
  type Agent,
  type Skill,
} from '../src/index';

describe('AI Orchestrator', () => {
  let config: OrchestratorConfig;

  beforeEach(() => {
    config = {
      name: 'test-project',
      version: '1.0.0',
      approvalLevel: ApprovalLevel.L2,
    };
  });

  describe('createOrchestrator', () => {
    it('should create an orchestrator with config', () => {
      const orchestrator = createOrchestrator(config);

      expect(orchestrator.config).toEqual(config);
      expect(orchestrator.agents).toEqual([]);
      expect(orchestrator.skills).toEqual([]);
    });

    it('should register agents', () => {
      const orchestrator = createOrchestrator(config);
      const agent: Agent = {
        name: 'TestAgent',
        role: 'planner',
        description: 'Test agent',
      };

      orchestrator.registerAgent(agent);

      expect(orchestrator.agents).toHaveLength(1);
      expect(orchestrator.agents[0]).toEqual(agent);
    });

    it('should register skills', () => {
      const orchestrator = createOrchestrator(config);
      const skill: Skill = {
        name: 'TestSkill',
        command: '/test-skill',
        description: 'Test skill',
      };

      orchestrator.registerSkill(skill);

      expect(orchestrator.skills).toHaveLength(1);
      expect(orchestrator.skills[0]).toEqual(skill);
    });

    it('should chain registrations', () => {
      const orchestrator = createOrchestrator(config);

      orchestrator
        .registerAgent(defaultAgents[0])
        .registerAgent(defaultAgents[1])
        .registerSkill(defaultSkills[0]);

      expect(orchestrator.agents).toHaveLength(2);
      expect(orchestrator.skills).toHaveLength(1);
    });
  });

  describe('checkApproval', () => {
    it('should allow L1 when configured for L2', () => {
      const orchestrator = createOrchestrator(config);
      expect(orchestrator.checkApproval(ApprovalLevel.L1)).toBe(true);
    });

    it('should allow L2 when configured for L2', () => {
      const orchestrator = createOrchestrator(config);
      expect(orchestrator.checkApproval(ApprovalLevel.L2)).toBe(true);
    });

    it('should deny L3 when configured for L2', () => {
      const orchestrator = createOrchestrator(config);
      expect(orchestrator.checkApproval(ApprovalLevel.L3)).toBe(false);
    });

    it('should deny L4 when configured for L2', () => {
      const orchestrator = createOrchestrator(config);
      expect(orchestrator.checkApproval(ApprovalLevel.L4)).toBe(false);
    });

    it('should allow all levels when configured for L4', () => {
      config.approvalLevel = ApprovalLevel.L4;
      const orchestrator = createOrchestrator(config);

      expect(orchestrator.checkApproval(ApprovalLevel.L1)).toBe(true);
      expect(orchestrator.checkApproval(ApprovalLevel.L2)).toBe(true);
      expect(orchestrator.checkApproval(ApprovalLevel.L3)).toBe(true);
      expect(orchestrator.checkApproval(ApprovalLevel.L4)).toBe(true);
    });
  });

  describe('getInfo', () => {
    it('should return orchestrator info', () => {
      const orchestrator = createOrchestrator(config);
      defaultAgents.forEach(agent => orchestrator.registerAgent(agent));
      defaultSkills.forEach(skill => orchestrator.registerSkill(skill));

      const info = orchestrator.getInfo();

      expect(info.name).toBe('test-project');
      expect(info.version).toBe('1.0.0');
      expect(info.approvalLevel).toBe(ApprovalLevel.L2);
      expect(info.agentCount).toBe(3);
      expect(info.skillCount).toBe(6);
    });
  });

  describe('defaultAgents', () => {
    it('should have 3 default agents', () => {
      expect(defaultAgents).toHaveLength(3);
    });

    it('should have planner, coder, reviewer roles', () => {
      const roles = defaultAgents.map(a => a.role);
      expect(roles).toContain('planner');
      expect(roles).toContain('coder');
      expect(roles).toContain('reviewer');
    });
  });

  describe('defaultSkills', () => {
    it('should have 6 default skills', () => {
      expect(defaultSkills).toHaveLength(6);
    });

    it('should have correct commands', () => {
      const commands = defaultSkills.map(s => s.command);
      expect(commands).toContain('/interview');
      expect(commands).toContain('/commit');
      expect(commands).toContain('/test');
      expect(commands).toContain('/review-pr');
      expect(commands).toContain('/deploy');
      expect(commands).toContain('/docs');
    });
  });

  describe('getApprovalLevelDescription', () => {
    it('should return description for L1', () => {
      const desc = getApprovalLevelDescription(ApprovalLevel.L1);
      expect(desc).toContain('자동 승인');
    });

    it('should return description for L4', () => {
      const desc = getApprovalLevelDescription(ApprovalLevel.L4);
      expect(desc).toContain('관리자 승인');
    });
  });

  describe('findSkillByCommand', () => {
    it('should find skill by command', () => {
      const skill = findSkillByCommand('/interview');
      expect(skill).toBeDefined();
      expect(skill?.name).toBe('Interview');
    });

    it('should return undefined for unknown command', () => {
      const skill = findSkillByCommand('/unknown');
      expect(skill).toBeUndefined();
    });
  });

  describe('findAgentByRole', () => {
    it('should find agent by role', () => {
      const agent = findAgentByRole('planner');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('Planner');
    });

    it('should return undefined for unknown role', () => {
      const agent = findAgentByRole('unknown' as Agent['role']);
      expect(agent).toBeUndefined();
    });
  });
});
