# Domain docs

## Layout

**Multi-context** monorepo layout (`packages/*`, `apps/*`).

- **Glossary routing:** Root `GLOSSARY-MAP.md` maps each bounded context to its own `GLOSSARY.md` (for example, Figma alignment tooling vs. the `@pagopa/ui` consumer design system). Until `GLOSSARY-MAP.md` is populated, the root [GLOSSARY.md](../../GLOSSARY.md) holds the Figma alignment vocabulary.
- **Architectural Decision Records (ADRs):** Shared repository ADRs live in [docs/decisions/](../decisions/) (`0001`–`0008` and subsequent records). Context-specific ADRs may live under `<context>/docs/decisions/` as bounded contexts grow.

## Consumer rules

Skills that write specs, tickets, code, or reviews must follow these rules:

1. **Read before naming:** Check `GLOSSARY-MAP.md` (or root [GLOSSARY.md](../../GLOSSARY.md) when no map entry exists yet) for the context you are touching before introducing or reusing domain terms.
2. **Respect canonical vocabulary:** Use each glossary's preferred terms and avoid any term listed under `_Avoid_`.
3. **Respect existing ADRs:** Read relevant ADRs in [docs/decisions/](../decisions/) before proposing architectural changes. Do not contradict accepted decisions or silently reopen deferred decisions without their documented trigger.
4. **Update domain docs when introducing new boundaries:** When a spec introduces a new bounded context or changes ubiquitous language, update `GLOSSARY-MAP.md` / the relevant `GLOSSARY.md` or record a new ADR in `docs/decisions/`.
