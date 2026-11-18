// What a rule needs from the outside world, passed in so rules stay pure: tests pass fixed values,
// the browser passes real ones, and a backend passes server time and server randomness.
export type RuleContext = {
  now: string; // ISO-8601 UTC
  newId: (prefix: string) => string;
  newCode: () => string; // a fresh handoff code
};
