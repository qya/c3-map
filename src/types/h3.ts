export interface H3Codec {
  ALPHABET32: string;
  BASE: bigint;
  normalizeCode(input: string): string;
  getResolution(h3: bigint): number;
  getBaseCell(h3: bigint): number;
  h3ToRank(h3hex: string): { resolution: number; rank: bigint };
  rankToH3(rank: bigint, resolution: number): string;
  encodeBase32(num: bigint): string;
  decodeBase32(str: string): bigint;
  compresC3(h3hex: string): string;
  decompresC3(code: string): string;
}
