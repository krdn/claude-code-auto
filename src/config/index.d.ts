import { type OrchestratorConfig } from './default.js';
/**
 * 환경 타입
 */
export type Environment = 'development' | 'production' | 'test';
/**
 * 최종 설정 객체
 */
declare const environment: Environment;
export declare const config: OrchestratorConfig;
/**
 * 설정 내보내기
 */
export { type OrchestratorConfig, type AgentConfig } from './default.js';
export { environment };
/**
 * 설정 출력 (디버깅용)
 */
export declare function printConfig(): void;
//# sourceMappingURL=index.d.ts.map