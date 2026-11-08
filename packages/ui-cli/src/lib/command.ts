// The domain's exit codes, shared by every command. A check that found a real
// violation exits 1; a command that could not run because its input or
// evidence is missing exits 2. The distinction is part of the public contract
// documented in the README and consumed by the CI jobs.
export class UsageError extends Error {
  readonly exitCode = 2

  constructor(message: string) {
    super(message)
    this.name = "UsageError"
  }
}

export class CheckFailure extends Error {
  readonly exitCode = 1

  constructor(message: string) {
    super(message)
    this.name = "CheckFailure"
  }
}

export function exitCodeOf(error: unknown): number {
  if (error instanceof UsageError) return error.exitCode
  if (error instanceof CheckFailure) return error.exitCode
  return 1
}
