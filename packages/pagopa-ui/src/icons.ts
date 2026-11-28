// The icon family on its own entry: each component is one pinned source
// identity, so a consumer that imports one keeps every other icon out of its
// bundle. Every export renders through the `Icon` shell, so this entry and
// `PagoPAIcon` paint the same box and honour the same accessibility props;
// `PagoPAIcon` resolves a runtime name and is served by the main entry.
export * from "./components/icons/generated"
