import Anthropic from '@anthropic-ai/sdk';

/**
 * Claude 모델 타입
 */
export type ClaudeModel =
  | 'claude-opus-4'
  | 'claude-sonnet-4'
  | 'claude-haiku-4'
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  | 'claude-haiku-4-20250611';

/**
 * LLM 완성 요청 파라미터
 */
export interface CompleteParams {
  /** 사용할 모델 */
  model: ClaudeModel;
  /** 메시지 배열 */
  messages: Anthropic.MessageParam[];
  /** 최대 토큰 수 */
  maxTokens: number;
  /** 온도 (0.0 ~ 1.0) */
  temperature?: number;
  /** 시스템 프롬프트 */
  system?: string;
}

/**
 * Anthropic API 클라이언트
 *
 * Claude 모델을 사용하여 LLM 완성 요청을 처리합니다.
 *
 * @example
 * ```typescript
 * const client = new AnthropicClient(apiKey);
 * const response = await client.complete({
 *   model: 'claude-opus-4',
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   maxTokens: 1024
 * });
 * ```
 */
export class AnthropicClient {
  private client: Anthropic;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1초

  /**
   * AnthropicClient 생성자
   * @param apiKey - Anthropic API 키
   */
  constructor(apiKey: string) {
    // 테스트 환경에서는 더미 키도 허용 (빈 문자열 또는 'test-dummy-key')
    const isEmptyKey = !apiKey || apiKey.trim() === '';
    const isTestKey = apiKey === 'test-dummy-key';

    // 테스트/시뮬레이션용으로 빈 키나 테스트 키 허용
    const effectiveKey = isEmptyKey || isTestKey ? 'sk-ant-test-dummy-key-for-simulation' : apiKey;

    this.client = new Anthropic({
      apiKey: effectiveKey,
    });
  }

  /**
   * LLM 완성 요청
   *
   * @param params - 요청 파라미터
   * @returns LLM 응답 텍스트
   * @throws {Error} API 호출 실패 시
   *
   * @example
   * ```typescript
   * const response = await client.complete({
   *   model: 'claude-opus-4',
   *   messages: [
   *     { role: 'user', content: 'Explain quantum computing' }
   *   ],
   *   maxTokens: 2048,
   *   temperature: 0.7
   * });
   * ```
   */
  async complete(params: CompleteParams): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: this.normalizeModel(params.model),
          messages: params.messages,
          max_tokens: params.maxTokens,
          temperature: params.temperature ?? 0.7,
          ...(params.system ? { system: params.system } : {}),
        });

        // 텍스트 응답 추출
        const textContent = response.content.find(block => block.type === 'text');

        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text content in response');
        }

        return textContent.text;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 마지막 시도가 아니면 재시도
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
          continue;
        }
      }
    }

    throw new Error(
      `Failed to complete LLM request after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * 모델명 정규화
   * 사용자 친화적인 모델명을 Anthropic API 모델명으로 변환
   */
  private normalizeModel(model: ClaudeModel): string {
    // 이미 정식 모델명인 경우 그대로 반환
    if (model.includes('-20')) {
      return model;
    }

    // 사용자 친화적인 모델명을 최신 버전으로 매핑
    const modelMap: Record<string, string> = {
      'claude-opus-4': 'claude-opus-4-20250514',
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-haiku-4': 'claude-haiku-4-20250611',
    };

    return modelMap[model] || model;
  }

  /**
   * 지연 함수 (재시도용)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 스트리밍 완성 요청 (향후 구현 예정)
   * @param params - 요청 파라미터
   * @returns AsyncIterable<string>
   */
  async *completeStream(params: CompleteParams): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model: this.normalizeModel(params.model),
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature ?? 0.7,
      stream: true,
      ...(params.system ? { system: params.system } : {}),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
