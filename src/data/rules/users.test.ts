import { describe, expect, it } from "vitest";
import { ctxAt, NOW, someData } from "../../test/fixtures.ts";
import { signUp } from "./users.ts";

describe("signUp", () => {
  it("creates a student with a dorm on their own campus", () => {
    const { data, user } = signUp(someData(), ctxAt(), { name: "  Kim Cho ", email: "Kim@G.CofC.edu", dorm: "Berry Hall" });
    expect(user).toMatchObject({ name: "Kim Cho", email: "kim@g.cofc.edu", dorm: "Berry Hall", joinedAt: NOW, stats: { completedHandoffs: 0, thumbsUp: 0, thumbsDown: 0 } });
    expect(data.users).toContainEqual(user);
  });

  it("drops a dorm that isn't on the student's campus", () => {
    expect(signUp(someData(), ctxAt(), { name: "Kim", email: "kim@clemson.edu", dorm: "Berry Hall" }).user.dorm).toBeUndefined();
    expect(signUp(someData(), ctxAt(), { name: "Kim", email: "kim@cofc.edu", dorm: "Made Up Hall" }).user.dorm).toBeUndefined();
  });

  it.each([
    [{ name: "", email: "kim@cofc.edu" }, /Enter your name/],
    [{ name: "x".repeat(61), email: "kim@cofc.edu" }, /Enter your name/],
    [{ name: "Kim", email: "kim@gmail.com" }, /students only/],
    [{ name: "Kim", email: "BOB@g.cofc.edu" }, /already an account/],
  ])("refuses %j", (input, message) => {
    expect(() => signUp(someData(), ctxAt(), input)).toThrow(message);
  });
});
