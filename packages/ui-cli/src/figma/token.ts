const MISSING_MESSAGE = [
  "FIGMA_TOKEN is missing or empty in the process environment.",
  "The live Figma tools need a read-only token with the file_content:read and library_content:read scopes.",
  "Export the token in the environment that runs this command and re-run it, for example:",
  "  export FIGMA_TOKEN=figd_...",
  "The tools never read .env automatically.",
].join("\n")

const WHITESPACE_MESSAGE =
  "FIGMA_TOKEN contains whitespace; export the token value exactly as issued."

export function figmaToken(): string {
  const raw = process.env.FIGMA_TOKEN
  if (raw === undefined || raw.trim() === "") throw new Error(MISSING_MESSAGE)
  const token = raw.trim()
  if (/\s/.test(token)) throw new Error(WHITESPACE_MESSAGE)
  return token
}

export function requireFigmaToken(): string {
  try {
    return figmaToken()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`error: ${message}`)
    process.exit(1)
  }
}
