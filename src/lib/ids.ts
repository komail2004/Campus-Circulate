// Makes unique IDs like "lst_m2k9x3ab12" and random number codes like "4829".

export function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function makeCode(digits: number) {
  let code = "";
  for (let i = 0; i < digits; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}
