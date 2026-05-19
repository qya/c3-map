import type { H3Codec } from '../types/h3';

export const C3Codec: H3Codec = {
  ALPHABET32: "F29KBRJDPW8C7V06XTSM14NQGH5ABEYZ",
  BASE: BigInt("32"),

  normalizeCode(input: string): string {
    return input.toUpperCase();
  },

  getResolution(h3: bigint): number {
    return Number((h3 >> 52n) & 0xfn);
  },

  getBaseCell(h3: bigint): number {
    return Number((h3 >> 45n) & 0x7fn);
  },

  h3ToRank(h3hex: string) {
    const h3 = BigInt("0x" + h3hex);
    const resolution = C3Codec.getResolution(h3);
    const baseCell = C3Codec.getBaseCell(h3);

    let path = 0n;

    for (let i = 0; i < resolution; i++) {
      const shift = 3n * BigInt(14 - i);
      const digit = Number((h3 >> shift) & 0x7n);

      if (digit > 6) {
        throw new Error(`Invalid H3 digit at resolution ${i + 1}: ${digit}`);
      }

      path = path * 7n + BigInt(digit);
    }

    const rank = BigInt(baseCell) * (7n ** BigInt(resolution)) + path;

    return { resolution, rank };
  },

  rankToH3(rank: bigint, resolution: number) {
    rank = BigInt(rank);

    const digitSpace = 7n ** BigInt(resolution);
    const baseCell = Number(rank / digitSpace);
    let path = rank % digitSpace;

    const digits = [];

    for (let i = 0; i < resolution; i++) {
      digits.unshift(Number(path % 7n));
      path /= 7n;
    }

    let h3 = 0n;

    h3 |= 1n << 59n;
    h3 |= BigInt(resolution) << 52n;
    h3 |= BigInt(baseCell) << 45n;

    for (let i = 0; i < 15; i++) {
      let digit = 7;
      if (i < resolution) {
        digit = digits[i];
      }
      const shift = 3n * BigInt(14 - i);
      h3 |= BigInt(digit) << shift;
    }

    return h3.toString(16);
  },

  encodeBase32(num: bigint): string {
    num = BigInt(num);

    if (num === 0n) {
      return C3Codec.ALPHABET32[0];
    }

    let out = "";

    while (num > 0n) {
      const rem = num % C3Codec.BASE;
      out = C3Codec.ALPHABET32[Number(rem)] + out;
      num /= C3Codec.BASE;
    }

    return out;
  },

  decodeBase32(str: string): bigint {
    str = C3Codec.normalizeCode(str);

    let num = 0n;

    for (const c of str) {
      const idx = C3Codec.ALPHABET32.indexOf(c);

      if (idx === -1) {
        throw new Error(`Invalid character '${c}'`);
      }

      num = num * C3Codec.BASE + BigInt(idx);
    }

    return num;
  },

  compresC3(h3hex: string): string {
    const { resolution, rank } = C3Codec.h3ToRank(h3hex);
    const packed = (rank << 4n) | BigInt(resolution);
    return C3Codec.encodeBase32(packed);
  },

  decompresC3(code: string): string {
    const packed = C3Codec.decodeBase32(C3Codec.normalizeCode(code));
    const resolution = Number(packed & 0xfn);
    const rank = packed >> 4n;
    return C3Codec.rankToH3(rank, resolution);
  }
};
