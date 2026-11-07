export type ParityOutput = { code: number; out: string[]; err: string[]; data?: unknown }

export function output(
  code: number,
  out: string[] = [],
  err: string[] = [],
  data?: unknown,
): ParityOutput {
  return { code, out, err, ...(data === undefined ? {} : { data }) }
}
