const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

function generateSuffix(length: number = 4): string {
  const alphabetLength = ALPHABET.length;
  const limit = 252;

  let result = "";
  const bufferSize = length + 8;
  const buffer = new Uint8Array(bufferSize);

  while (result.length < length) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (byte < limit) {
        result += ALPHABET[byte % alphabetLength];
        if (result.length === length) break;
      }
    }
  }
  return result;
}

export const SlugUtil = {
  sanitize(input: string): string {
    return input
      .normalize("NFD") // Decompose chars (e.g. ü -> u + ¨)
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, ""); // Trim dashes
  },

  generateNext(base: string, attempt: number): string {
    const safeBase = this.sanitize(base);
    if (attempt === 0) {
      return safeBase || "workspace"; // Fallback for empty strings
    }
    return `${safeBase}-${generateSuffix()}`;
  },
};
