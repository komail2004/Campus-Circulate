// A rule refusing an action. Its message is shown to the student as-is, so keep it plain and kind.
export class RuleError extends Error {
  name = "RuleError";
}

export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleError(message);
}

// Refuse when a `whyNot…` helper gave a reason. Pages call the same helpers to hide buttons,
// so the screen and the rules can't disagree.
export function allow(reason: string | null): void {
  if (reason) throw new RuleError(reason);
}

// What to tell the student when an action fails. Unexpected errors get a generic message (and go to
// the console for us) so internals never reach the screen.
export function friendlyError(error: unknown): string {
  if (error instanceof RuleError) return error.message;
  console.error(error);
  return "Something went wrong. Please try again.";
}
