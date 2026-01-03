import { config as dotenvConfig } from 'dotenv';
import { defaultConfig } from './default.js';
import { developmentConfig } from './development.js';
import { productionConfig } from './production.js';
// .env 파일 로드
dotenvConfig();
/**
 * 현재 환경 가져오기
 */
function getEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production' || env === 'development' || env === 'test') {
        return env;
    }
    return 'development';
}
/**
 * 환경별 설정 오버라이드 가져오기
 */
function getEnvironmentConfig(env) {
    switch (env) {
        case 'production':
            return productionConfig;
        case 'development':
            return developmentConfig;
        case 'test':
            return {
                // 테스트 환경에서는 가장 빠른 모델 사용
                agents: {
                    planner: {
                        model: 'claude-haiku-4',
                        maxTokens: 2048,
                        temperature: 0.5,
                    },
                    coder: {
                        model: 'claude-haiku-4',
                        maxTokens: 4096,
                        temperature: 0.5,
                    },
                    reviewer: {
                        model: 'claude-haiku-4',
                        maxTokens: 2048,
                        temperature: 0.3,
                    },
                },
                workflow: {
                    selfHealing: {
                        enabled: false, // 테스트에서는 비활성화
                        maxAttempts: 1,
                        timeout: 30000, // 30초
                    },
                    approval: {
                        autoApprove: true, // 테스트에서는 자동 승인
                        level: 'L1',
                    },
                },
            };
        default:
            return {};
    }
}
/**
 * Deep merge 헬퍼 함수
 */
function deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = output[key];
            if (sourceValue &&
                typeof sourceValue === 'object' &&
                !Array.isArray(sourceValue) &&
                targetValue &&
                typeof targetValue === 'object' &&
                !Array.isArray(targetValue)) {
                output[key] = deepMerge(targetValue, sourceValue);
            }
            else if (sourceValue !== undefined) {
                output[key] = sourceValue;
            }
        }
    }
    return output;
}
/**
 * 최종 설정 객체
 */
const environment = getEnvironment();
const envConfig = getEnvironmentConfig(environment);
export const config = deepMerge(defaultConfig, envConfig);
/**
 * 설정 검증
 */
function validateConfig(cfg) {
    // API 키 검증
    if (!cfg.llm.apiKey || cfg.llm.apiKey.trim() === '') {
        throw new Error('ANTHROPIC_API_KEY is not set. Please set it in .env file or environment variable.');
    }
    // 타임아웃 검증
    if (cfg.workflow.selfHealing.timeout < 1000) {
        throw new Error('Self-healing timeout must be at least 1000ms');
    }
    // 재시도 횟수 검증
    if (cfg.workflow.selfHealing.maxAttempts < 1 || cfg.workflow.selfHealing.maxAttempts > 10) {
        throw new Error('Self-healing max attempts must be between 1 and 10');
    }
}
// 설정 검증 (프로덕션에서만)
if (environment === 'production') {
    validateConfig(config);
}
export { environment };
/**
 * 설정 출력 (디버깅용)
 */
export function printConfig() {
    console.log('=== AI Orchestrator Configuration ===');
    console.log(`Environment: ${environment}`);
    console.log(`LLM Provider: ${config.llm.provider}`);
    console.log(`API Key: ${config.llm.apiKey ? '****' + config.llm.apiKey.slice(-4) : 'NOT SET'}`);
    console.log('\nAgent Models:');
    console.log(`  Planner: ${config.agents.planner.model}`);
    console.log(`  Coder: ${config.agents.coder.model}`);
    console.log(`  Reviewer: ${config.agents.reviewer.model}`);
    console.log('\nWorkflow:');
    console.log(`  Self-healing: ${config.workflow.selfHealing.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  Max attempts: ${config.workflow.selfHealing.maxAttempts}`);
    console.log(`  Approval level: ${config.workflow.approval.level}`);
    console.log('=====================================\n');
}
//# sourceMappingURL=index.js.map