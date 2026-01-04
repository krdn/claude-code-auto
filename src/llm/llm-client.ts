/**
 * Unified LLM Client
 *
 * API 키 또는 CLI 방식을 자동으로 선택하는 통합 클라이언트
 */

import { AnthropicClient, type CompleteParams } from './anthropic-client.js';
import { ClaudeCliClient } from './claude-cli-client.js';
import type { LlmAuthMethod } from '../config/default.js';

/**
 * LLM 클라이언트 설정
 */
export interface LlmClientConfig {
  /** 인증 방식 */
  authMethod: LlmAuthMethod;
  /** API 키 (authMethod='api-key'일 때 필요) */
  apiKey?: string;
  /** CLI 경로 (authMethod='cli'일 때 사용) */
  cliPath?: string;
  /** CLI 실패 시 API 키로 폴백 (하이브리드 모드) */
  fallbackToApiKey?: boolean;
}

/**
 * Unified LLM Client
 *
 * 설정에 따라 AnthropicClient 또는 ClaudeCliClient를 사용
 */
export class LlmClient {
  private client: AnthropicClient | ClaudeCliClient;
  private fallbackClient?: AnthropicClient;
  private readonly authMethod: LlmAuthMethod;
  private readonly fallbackEnabled: boolean;

  constructor(config: LlmClientConfig) {
    this.authMethod = config.authMethod;
    this.fallbackEnabled = config.fallbackToApiKey || false;

    if (config.authMethod === 'api-key') {
      // API 키 방식
      const apiKey = config.apiKey || '';
      this.client = new AnthropicClient(apiKey);
    } else {
      // CLI 방식
      const cliPath = config.cliPath || 'claude';
      this.client = new ClaudeCliClient(cliPath);

      // 하이브리드 모드: API 키 폴백 클라이언트 준비
      if (this.fallbackEnabled && config.apiKey) {
        this.fallbackClient = new AnthropicClient(config.apiKey);
      }
    }
  }

  /**
   * LLM 완성 요청 (하이브리드 모드 지원)
   */
  async complete(params: CompleteParams): Promise<string> {
    try {
      // 주 클라이언트로 시도
      return await this.client.complete(params);
    } catch (error) {
      // CLI 실패 시 API 키로 폴백
      if (this.fallbackEnabled && this.fallbackClient) {
        console.warn(
          '[LlmClient] CLI 실패, API 키로 폴백:',
          error instanceof Error ? error.message : error
        );
        return await this.fallbackClient.complete(params);
      }
      // 폴백 불가능하면 에러 전파
      throw error;
    }
  }

  /**
   * 스트리밍 완성 요청
   */
  async *completeStream(params: CompleteParams): AsyncGenerator<string, void, unknown> {
    yield* this.client.completeStream(params);
  }

  /**
   * 현재 인증 방식 반환
   */
  getAuthMethod(): LlmAuthMethod {
    return this.authMethod;
  }

  /**
   * CLI 사용 가능 여부 확인 (CLI 모드일 때만)
   */
  async isCliAvailable(): Promise<boolean> {
    if (this.client instanceof ClaudeCliClient) {
      return await this.client.isAvailable();
    }
    return false;
  }
}

/**
 * LLM 클라이언트 생성 헬퍼
 */
export function createLlmClient(config: LlmClientConfig): LlmClient {
  return new LlmClient(config);
}
