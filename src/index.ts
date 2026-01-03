/**
 * AI Orchestrator Framework
 *
 * Claude Code 중심의 AI 워크플로우 프레임워크
 * - 사용자가 중앙에서 감독
 * - AI가 모든 작업 수행
 * - 승인 기반 실행
 */

export interface OrchestratorConfig {
  /** 프로젝트 이름 */
  name: string;
  /** 버전 */
  version: string;
  /** 승인 레벨 (L1-L4) */
  approvalLevel: ApprovalLevel;
}

export enum ApprovalLevel {
  /** 자동 승인 - 일반 코드 변경 */
  L1 = 'L1',
  /** 사용자 승인 - 아키텍처 변경 */
  L2 = 'L2',
  /** 이중 승인 - 보안 관련 */
  L3 = 'L3',
  /** 관리자 승인 - 프로덕션 배포 */
  L4 = 'L4',
}

export interface Agent {
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 역할 */
  role: 'planner' | 'coder' | 'reviewer';
  /** 에이전트 설명 */
  description: string;
}

export interface Skill {
  /** 스킬 이름 */
  name: string;
  /** 스킬 명령어 */
  command: string;
  /** 스킬 설명 */
  description: string;
}

/**
 * AI Orchestrator 인스턴스 생성
 */
export function createOrchestrator(config: OrchestratorConfig) {
  return {
    config,
    agents: [] as Agent[],
    skills: [] as Skill[],

    /**
     * 에이전트 등록
     */
    registerAgent(agent: Agent) {
      this.agents.push(agent);
      return this;
    },

    /**
     * 스킬 등록
     */
    registerSkill(skill: Skill) {
      this.skills.push(skill);
      return this;
    },

    /**
     * 승인 레벨 확인
     */
    checkApproval(level: ApprovalLevel): boolean {
      const levels = [ApprovalLevel.L1, ApprovalLevel.L2, ApprovalLevel.L3, ApprovalLevel.L4];
      const configIndex = levels.indexOf(this.config.approvalLevel);
      const requiredIndex = levels.indexOf(level);
      return configIndex >= requiredIndex;
    },

    /**
     * 오케스트레이터 정보 출력
     */
    getInfo() {
      return {
        name: this.config.name,
        version: this.config.version,
        approvalLevel: this.config.approvalLevel,
        agentCount: this.agents.length,
        skillCount: this.skills.length,
      };
    },
  };
}

// 기본 에이전트 정의
export const defaultAgents: Agent[] = [
  {
    name: 'Planner',
    role: 'planner',
    description: '작업 분해 및 계획 수립',
  },
  {
    name: 'Coder',
    role: 'coder',
    description: '계획에 따른 코드 작성',
  },
  {
    name: 'Reviewer',
    role: 'reviewer',
    description: '코드 품질 분석 및 리뷰',
  },
];

// 기본 스킬 정의
export const defaultSkills: Skill[] = [
  { name: 'Interview', command: '/interview', description: '요구사항 수집' },
  { name: 'Commit', command: '/commit', description: 'Git 커밋' },
  { name: 'Test', command: '/test', description: '테스트 실행' },
  { name: 'Review PR', command: '/review-pr', description: 'PR 생성/리뷰' },
  { name: 'Deploy', command: '/deploy', description: '배포' },
  { name: 'Docs', command: '/docs', description: '문서 생성' },
];

/**
 * 승인 레벨에 따른 설명 반환
 */
export function getApprovalLevelDescription(level: ApprovalLevel): string {
  const descriptions: Record<ApprovalLevel, string> = {
    [ApprovalLevel.L1]: '자동 승인 - 일반 코드 변경, CI 통과 시 자동 머지',
    [ApprovalLevel.L2]: '사용자 승인 - 아키텍처 변경, 리뷰어 1명 필요',
    [ApprovalLevel.L3]: '이중 승인 - 보안 관련, 보안팀 리뷰 필요',
    [ApprovalLevel.L4]: '관리자 승인 - 프로덕션 배포, 관리자 승인 필요',
  };
  return descriptions[level];
}

/**
 * 스킬 검색
 */
export function findSkillByCommand(command: string): Skill | undefined {
  return defaultSkills.find(skill => skill.command === command);
}

/**
 * 에이전트 검색
 */
export function findAgentByRole(role: Agent['role']): Agent | undefined {
  return defaultAgents.find(agent => agent.role === role);
}
