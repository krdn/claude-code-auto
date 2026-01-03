import type { ClaudeModel } from '../src/llm/anthropic-client.js';
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
export declare const defaultConfig: OrchestratorConfig;
//# sourceMappingURL=default.d.ts.map