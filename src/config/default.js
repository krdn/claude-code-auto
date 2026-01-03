/**
 * 기본 설정
 */
export const defaultConfig = {
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
//# sourceMappingURL=default.js.map