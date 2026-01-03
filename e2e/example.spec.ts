import { test, expect } from '@playwright/test';

/**
 * E2E 테스트 예제
 *
 * 이 파일은 Playwright E2E 테스트의 예제입니다.
 * 실제 프로젝트에 맞게 수정하여 사용하세요.
 */

test.describe('Example E2E Tests', () => {
  test.skip('should load the homepage', async ({ page }) => {
    // 페이지 로드
    await page.goto('/');

    // 제목 확인
    await expect(page).toHaveTitle(/AI Orchestrator/);
  });

  test.skip('should navigate to documentation', async ({ page }) => {
    await page.goto('/');

    // 문서 링크 클릭
    await page.click('text=Documentation');

    // URL 확인
    await expect(page).toHaveURL(/docs/);
  });
});

/**
 * 테스트 실행 방법:
 *
 * 1. Playwright 설치
 *    npm install -D @playwright/test
 *    npx playwright install
 *
 * 2. 테스트 실행
 *    npx playwright test
 *
 * 3. 리포트 확인
 *    npx playwright show-report
 */
