export type SaveStatus = 'saving' | 'saved' | 'error';
export interface WorkPatch {
  code: string;
  status: 'not_started' | 'in_progress';
  last_run_at?: string;
  last_run_success?: boolean;
  last_error_type?: string | null;
  last_error_summary?: string | null;
}

/** One writer per open exercise. Revisions prevent a completed old request from
 * reporting a newer edit as saved. Run results and code share the same queue. */
export class WorkAutosaver {
  private revision = 0;
  private savedRevision = 0;
  private pending: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private patch: WorkPatch;

  constructor(code: string, status: WorkPatch['status'],
    private readonly write: (patch: WorkPatch) => Promise<void>,
    private readonly notify: (status: SaveStatus) => void) {
    this.patch = { code, status };
  }

  change(code: string) {
    this.patch = { ...this.patch, code, status: 'in_progress' };
    this.revision++;
    this.notify('saving');
    this.schedule(1500);
  }

  recordRun(result: { success: boolean; errorType?: string; errorMessage?: string; outcome: string }) {
    this.patch = { ...this.patch, status: 'in_progress', last_run_at: new Date().toISOString(),
      last_run_success: result.success,
      last_error_type: result.success ? null : result.errorType ?? result.outcome,
      last_error_summary: result.success ? null : (result.errorMessage ?? result.outcome).slice(0, 1000) };
    this.revision++;
    void this.flush();
  }

  private schedule(delay: number) {
    clearTimeout(this.timer);
    if (!this.disposed) this.timer = setTimeout(() => { void this.flush(); }, delay);
  }

  flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.pending) return this.pending;
    if (this.savedRevision === this.revision) return Promise.resolve(true);
    // Defer the loop so pending is assigned even if write throws synchronously.
    this.pending = Promise.resolve().then(async () => {
      try {
        while (this.savedRevision !== this.revision) {
          const revision = this.revision;
          const patch = { ...this.patch };
          this.notify('saving');
          await this.write(patch);
          this.savedRevision = revision;
        }
        this.notify('saved');
        return true;
      } catch {
        this.notify('error');
        this.schedule(3000);
        return false;
      } finally { this.pending = null; }
    });
    return this.pending;
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    void this.flush();
  }
}
