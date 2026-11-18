// Course codes like "MATH 120" or "CSCI 220L". Sellers type them any way; we store one form.

const COURSE_CODE = /^([A-Z]{2,4})[\s-]?(\d{3}[A-Z]?)$/;

export function normalizeCourseCode(input: string): string | null {
  const match = input.trim().toUpperCase().match(COURSE_CODE);
  return match ? `${match[1]} ${match[2]}` : null;
}

// For search: "math 120", "MATH-120" and "math120" all compare equal.
export function courseCodeKey(text: string): string {
  return text.toUpperCase().replace(/[\s-]/g, "");
}
