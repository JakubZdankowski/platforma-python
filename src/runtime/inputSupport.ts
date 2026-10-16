export type InputSupport = 'supported' | 'missing-jspi' | 'initialization-failed';

/** Check browser APIs separately from the runtime probe: a failed probe is not proof of an old browser. */
export async function detectInputSupport(
  wasm: { Suspending?: unknown; promising?: unknown },
  probe: () => Promise<unknown>,
  reportError: (error: unknown) => void,
): Promise<InputSupport> {
  if (typeof wasm.Suspending !== 'function' || typeof wasm.promising !== 'function') return 'missing-jspi';
  try {
    if (await probe() === true) return 'supported';
    reportError(new Error('JSPI input probe did not return true.'));
  } catch (error) { reportError(error); }
  return 'initialization-failed';
}
