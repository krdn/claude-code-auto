import type { OrchestratorConfig } from './default.js';

/**
 * 개발 환경 설정
 *
 * 기본 설정을 오버라이드하는 부분만 정의합니다.
 */
export const developmentConfig: Partial<OrchestratorConfig> = {
  agents: {
    planner: {
      model: 'claude-sonnet-4', // 개발 환경에서는 Sonnet 사용 (비용 절감)
      maxTokens: 4096,
      temperature: 0.7,
    },
    coder: {
      model: 'claude-sonnet-4',
      maxTokens: 8192,
      temperature: 0.5,
    },
    reviewer: {
      model: 'claude-haiku-4', // 개발 환경에서는 Haiku 사용 (속도 우선)
      maxTokens: 4096,
      temperature: 0.3,
    },
  },
  workflow: {
    selfHealing: {
      enabled: true,
      maxAttempts: 3,
      timeout: 180000, // 3분 (개발 환경에서는 짧게)
    },
    approval: {
      autoApprove: false,
      level: 'L1', // 개발 환경에서는 L1으로 완화
    },
  },
  git: {
    autoCommit: false, // 개발 환경에서는 수동 커밋
    commitMessageTemplate: 'conventional-commits',
  },
};
