import {notifyManager} from '@tanstack/react-query';

// React 19's renderer keeps async work inside act only while the callback is
// pending. React Query's default timer scheduler can therefore notify after a
// test's awaited timer, leaving the renderer stale. Keep notifications in the
// active act turn without changing production scheduling.
notifyManager.setScheduler((callback) => callback());

const mockRoots = new Set<ReturnType<typeof import('react-test-renderer').create>>();
let mockActual: typeof import('react-test-renderer') | undefined;

jest.mock('react-test-renderer', () => {
  const actual = jest.requireActual<typeof import('react-test-renderer')>('react-test-renderer');
  mockActual = actual;
  let actDepth = 0;
  return {
    ...actual,
    act: (...args: Parameters<typeof actual.act>) => {
      actDepth += 1;
      try {
        return actual.act(...args);
      } finally {
        actDepth -= 1;
      }
    },
    create: (...args: Parameters<typeof actual.create>) => {
      let tree: ReturnType<typeof actual.create>;
      const render = () => { tree = actual.create(...args); };
      if (actDepth > 0) render();
      else actual.act(render);
      mockRoots.add(tree!);
      return tree!;
    },
  };
});

afterEach(() => {
  if (!mockActual) return;
  for (const root of mockRoots) {
    try {
      mockActual.act(() => root.unmount());
    } catch {
      // Tests may already have unmounted their renderer.
    }
  }
  mockRoots.clear();
});
