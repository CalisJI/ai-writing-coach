let pending: number | null = null;
export function setReadingResumeHandoff(sessionId: number): void { pending = Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null; }
export function consumeReadingResumeHandoff(): number | null { const value = pending; pending = null; return value; }
export function clearReadingResumeHandoff(): void { pending = null; }
