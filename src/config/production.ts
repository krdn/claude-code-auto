import type { OrchestratorConfig } from './default.js';

/**
 * 프로덕션 환경 설정
 *
 * 기본 설정을 오버라이드하는 부분만 정의합니다.
 */
export const productionConfig: Partial<OrchestratorConfig> = {
  agents: {
    planner: {
      model: 'claude-opus-4', // 프로덕션에서는 최고 품질 모델 사용
      maxTokens: 4096,
      temperature: 0.7,
    },
    coder: {
      model: 'claude-sonnet-4', // 균형잡힌 모델
      maxTokens: 8192,
      temperature: 0.5,
    },
    reviewer: {
      model: 'claude-sonnet-4', // 프로덕션에서는 엄격한 리뷰
      maxTokens: 4096,
      temperature: 0.3,
    },
  },
  workflow: {
    selfHealing: {
      enabled: true,
      maxAttempts: 3,
      timeout: 600000, // 10분 (프로덕션에서는 충분한 시간 제공)
    },
    approval: {
      autoApprove: false,
      level: 'L3', // 프로덕션에서는 엄격한 승인 레벨
    },
  },
  git: {
    autoCommit: false, // 프로덕션에서는 반드시 수동 승인
    commitMessageTemplate: 'conventional-commits',
  },
};
