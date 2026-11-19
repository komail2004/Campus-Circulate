// Accounts. In local mode this is the whole sign-up; a backend adds real email verification.

import type { Data, User } from "../../types.ts";
import { campusForEmail, placesOnCampus } from "../campus.ts";
import type { RuleContext } from "./context.ts";
import { check } from "./errors.ts";

export const NAME_MAX = 60;
export type SignUpInput = { name: string; email: string; dorm?: string };

export function isEduEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.edu$/i.test(email.trim());
}

export function signUp(data: Data, ctx: RuleContext, input: SignUpInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  check(name.length > 0 && name.length <= NAME_MAX, `Enter your name (up to ${NAME_MAX} characters).`);
  check(isEduEmail(email), "CampusCirculate is for students only. Use your .edu email.");
  check(!data.users.some((u) => u.email === email), "There's already an account with that email. Sign in instead.");

  // Only a hall on the student's own campus counts; students at other schools have no dorm here.
  const campus = campusForEmail(email);
  const dorm = campus && placesOnCampus(campus.id).some((p) => p.name === input.dorm) ? input.dorm : undefined;
  const user: User = { id: ctx.newId("u"), name, email, dorm, joinedAt: ctx.now, stats: { completedHandoffs: 0, thumbsUp: 0, thumbsDown: 0 } };
  return { data: { ...data, users: [...data.users, user] }, user };
}
