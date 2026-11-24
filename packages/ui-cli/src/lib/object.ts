/** Read a property from an arbitrary object value without copying it. */
export function readField(value: unknown, key: string): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Reflect.get(value, key)
    : undefined
}
