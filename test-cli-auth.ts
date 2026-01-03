/**
 * CLI 인증 방식 테스트 스크립트
 *
 * Claude Code CLI를 통한 Max Plan 인증 테스트
 */

import { ClaudeCliClient } from './src/llm/claude-cli-client.js';

async function testCliAuth() {
  console.log('🔍 Claude Code CLI 인증 테스트 시작...\n');

  const client = new ClaudeCliClient('claude');

  // 1. CLI 사용 가능 여부 확인
  console.log('1️⃣  CLI 사용 가능 여부 확인...');
  const isAvailable = await client.isAvailable();
  console.log(`   ✓ Claude CLI 사용 가능: ${isAvailable ? '예' : '아니오'}\n`);

  if (!isAvailable) {
    console.error('❌ Claude CLI를 사용할 수 없습니다.');
    process.exit(1);
  }

  // 2. 간단한 질문 테스트
  console.log('2️⃣  간단한 질문 테스트 (Haiku 모델)...');
  try {
    const startTime = Date.now();
    const response = await client.complete({
      model: 'claude-haiku-4',
      messages: [
        {
          role: 'user',
          content: '간단하게 "테스트 성공!"이라고만 답해주세요.',
        },
      ],
      maxTokens: 50,
      temperature: 0.5,
    });
    const duration = Date.now() - startTime;

    console.log(`   ✓ 응답 받음 (${duration}ms)`);
    console.log(`   📝 응답: "${response.substring(0, 100)}..."\n`);
  } catch (error) {
    console.error('   ❌ 오류 발생:', error);
    process.exit(1);
  }

  // 3. 다른 모델 테스트 (Sonnet)
  console.log('3️⃣  Sonnet 모델 테스트...');
  try {
    const startTime = Date.now();
    const response = await client.complete({
      model: 'claude-sonnet-4',
      messages: [
        {
          role: 'user',
          content: 'TypeScript의 장점을 한 문장으로 설명해주세요.',
        },
      ],
      maxTokens: 100,
      temperature: 0.7,
    });
    const duration = Date.now() - startTime;

    console.log(`   ✓ 응답 받음 (${duration}ms)`);
    console.log(`   📝 응답: "${response.substring(0, 150)}..."\n`);
  } catch (error) {
    console.error('   ❌ 오류 발생:', error);
    process.exit(1);
  }

  // 4. 시스템 프롬프트 테스트
  console.log('4️⃣  시스템 프롬프트 테스트...');
  try {
    const startTime = Date.now();
    const response = await client.complete({
      model: 'claude-haiku-4',
      messages: [
        {
          role: 'user',
          content: '자기소개 해주세요.',
        },
      ],
      maxTokens: 100,
      temperature: 0.5,
      system: '당신은 AI Orchestrator Framework의 전문가입니다.',
    });
    const duration = Date.now() - startTime;

    console.log(`   ✓ 응답 받음 (${duration}ms)`);
    console.log(`   📝 응답: "${response.substring(0, 150)}..."\n`);
  } catch (error) {
    console.error('   ❌ 오류 발생:', error);
    process.exit(1);
  }

  console.log('✅ 모든 테스트 통과!');
  console.log('\n🎉 Claude Code CLI 인증이 정상적으로 작동합니다!');
  console.log('💡 이제 .env 파일에서 LLM_AUTH_METHOD=cli로 설정하여 사용할 수 있습니다.');
}

// 테스트 실행
testCliAuth().catch(error => {
  console.error('\n❌ 테스트 실패:', error);
  process.exit(1);
});
