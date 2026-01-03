/**
 * CLI 유틸리티 함수
 */

/** ANSI 색상 코드 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

type ColorName = keyof typeof COLORS;

/**
 * 텍스트에 색상 적용
 */
export function colorize(text: string, color: ColorName): string {
  // CI 환경이나 NO_COLOR 환경변수가 설정된 경우 색상 비활성화
  if (process.env.NO_COLOR || process.env.CI) {
    return text;
  }
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * 시간 포맷팅 (ms → 읽기 쉬운 형식)
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/** 상태 아이콘 */
export const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  running: '⟳',
  waiting: '⏳',
  start: '▶',
  pending: '○',
  skip: '⊘',
} as const;

/**
 * 진행률 바 생성
 */
export function progressBar(current: number, total: number, width = 20): string {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage.toFixed(0)}%`;
}

/**
 * 박스 그리기
 */
export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length), title?.length ?? 0);
  const width = maxLength + 4;

  const top = title
    ? `┌─ ${title} ${'─'.repeat(width - title.length - 5)}┐`
    : `┌${'─'.repeat(width - 2)}┐`;
  const bottom = `└${'─'.repeat(width - 2)}┘`;

  const middle = lines.map(line => `│ ${line.padEnd(maxLength + 1)}│`).join('\n');

  return `${top}\n${middle}\n${bottom}`;
}

/**
 * 테이블 생성
 */
export function table(headers: string[], rows: string[][]): string {
  const columnWidths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map(row => (row[i] || '').length))
  );

  const separator = columnWidths.map(w => '─'.repeat(w + 2)).join('┼');
  const headerRow = headers.map((h, i) => ` ${h.padEnd(columnWidths[i])} `).join('│');
  const dataRows = rows
    .map(row => row.map((cell, i) => ` ${(cell || '').padEnd(columnWidths[i])} `).join('│'))
    .join('\n');

  return `${headerRow}\n─${separator}─\n${dataRows}`;
}

/**
 * 스피너 클래스 (간단한 구현)
 */
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.frames[this.frameIndex]} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r' + ' '.repeat(this.message.length + 3) + '\r');
    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  update(message: string): void {
    this.message = message;
  }
}

/**
 * 인터랙티브 프롬프트 (간단한 구현)
 */
export async function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(`${question} `);

    const stdin = process.stdin;
    stdin.setEncoding('utf8');
    stdin.once('data', (data: string) => {
      resolve(data.trim());
    });
    stdin.resume();
  });
}

/**
 * 확인 프롬프트
 */
export async function confirm(question: string): Promise<boolean> {
  const answer = await prompt(`${question} (y/n)`);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}
