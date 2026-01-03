import type { ClaudeModel } from '../llm/anthropic-client.js';

/**
 * Agent 설정
 */
export interface AgentConfig {
  /** 사용할 모델 */
  model: ClaudeModel;
  /** 최대 토큰 수 */
  maxTokens: number;
  /** 온도 (0.0 ~ 1.0) */
  temperature: number;
}

/**
 * 전체 설정 구조
 */
export interface OrchestratorConfig {
  /** LLM 설정 */
  llm: {
    /** API 제공자 */
    provider: 'anthropic';
    /** API 키 */
    apiKey: string;
  };
  /** Agent 설정 */
  agents: {
    planner: AgentConfig;
    coder: AgentConfig;
    reviewer: AgentConfig;
  };
  /** Workflow 설정 */
  workflow: {
    /** Self-healing 설정 */
    selfHealing: {
      /** Self-healing 활성화 여부 */
      enabled: boolean;
      /** 최대 재시도 횟수 */
      maxAttempts: number;
      /** 타임아웃 (ms) */
      timeout: number;
    };
    /** 승인 설정 */
    approval: {
      /** 자동 승인 여부 */
      autoApprove: boolean;
      /** 기본 승인 레벨 */
      level: 'L1' | 'L2' | 'L3' | 'L4';
    };
  };
  /** Git 설정 */
  git: {
    /** 자동 커밋 여부 */
    autoCommit: boolean;
    /** 커밋 메시지 템플릿 */
    commitMessageTemplate: 'conventional-commits' | 'simple';
  };
  /** 프롬프트 디렉토리 */
  promptsDir: string;
}

/**
 * 기본 설정
 */
export const defaultConfig: OrchestratorConfig = {
  llm: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  agents: {
    planner: {
      model: 'claude-opus-4',
      maxTokens: 4096,
      temperature: 0.7,
    },
    coder: {
      model: 'claude-sonnet-4',
      maxTokens: 8192,
      temperature: 0.5,
    },
    reviewer: {
      model: 'claude-sonnet-4',
      maxTokens: 4096,
      temperature: 0.3,
    },
  },
  workflow: {
    selfHealing: {
      enabled: true,
      maxAttempts: 3,
      timeout: 300000, // 5분
    },
    approval: {
      autoApprove: false,
      level: 'L2',
    },
  },
  git: {
    autoCommit: false,
    commitMessageTemplate: 'conventional-commits',
  },
  promptsDir: './prompts',
};
