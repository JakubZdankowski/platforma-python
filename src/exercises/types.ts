export type RuntimeType = 'python-console' | 'python-turtle';

export interface Exercise {
  id: string;
  title: string;
  instructionsMarkdown: string;
  starterCode: string;
  /** `python-turtle` shows the Turtle canvas and provides Turtle functions without an import. */
  runtimeType: RuntimeType;
}
