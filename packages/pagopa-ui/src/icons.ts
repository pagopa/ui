// The icon family on its own entry: each component is one pinned source
// identity, so a consumer that imports one keeps every other icon out of its
// bundle. `PagoPAIcon` resolves a runtime name and is served by the main entry.
export * from "./components/icons/generated"
