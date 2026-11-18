// Unique ids and secret number codes from the browser's cryptographic random source.
// Never Math.random: a handoff code is all that stands between a buyer's money and the seller.

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// `digits` random digits, e.g. "048213". Bytes of 250 and up are skipped so every digit is equally likely.
export function newCode(digits: number): string {
  const byte = new Uint8Array(1);
  let code = "";
  while (code.length < digits) {
    crypto.getRandomValues(byte);
    if (byte[0] < 250) code += byte[0] % 10;
  }
  return code;
}
