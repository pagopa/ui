# Figma drift and Chromatic secrets

Every value below is a repository secret inserted by the person. An agent
writes the workflow and this table; it never inserts a secret, never prints one
and never reads `.env` — the tools read the process environment only.

## Secrets

| Secret                    | Used by                              | Scopes / permissions                                             | Failure mode                                                                 |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `FIGMA_TOKEN`             | `figma-drift.yml`, live local steps  | `file_content:read`, `library_content:read` (read-only)          | The drift preflight fails explicitly; live local steps stop and use the evidence slice. |
| `DRIFT_PR_TOKEN`          | `figma-drift.yml`                    | contents: write, pull requests: write (fine-grained token)       | The workflow falls back to `GITHUB_TOKEN`: the PR opens, its checks stay empty until a human re-runs them. |
| `GITHUB_TOKEN`            | every workflow                       | provided by Actions                                             | `pnpm install` cannot resolve the DX packages from GitHub Packages.          |
| `CHROMATIC_PROJECT_TOKEN` | `chromatic.yml`                      | the Chromatic project token for this repository                  | The opt-in job skips with a notice; no pull request is blocked.              |

The registry token is the `GITHUB_TOKEN` passed to
`pagopa/dx/actions/setup-npm-registry`; add a dedicated `NODE_AUTH_TOKEN` only
if the organisation requires it.

## Create and rotate

### `FIGMA_TOKEN`

1. In Figma, create a personal access token with `file_content:read` and
   `library_content:read`. Do not grant a write scope: the repository is
   read-only against the design file.
2. Add it as the repository secret `FIGMA_TOKEN`.
3. To rotate it, create a new token, update the secret and revoke the old one.

The drift job preflights it and fails with an explicit message when it is
missing; a skipped check cannot certify alignment.

### `DRIFT_PR_TOKEN`

1. Create a fine-grained personal access token scoped to this repository with
   **Contents: read and write** and **Pull requests: read and write**.
2. Add it as `DRIFT_PR_TOKEN`.
3. Rotate it the same way; revoke the old token after the new one is in place.

The default `GITHUB_TOKEN` cannot start workflow runs on its own pull request,
so the drift PR would merge without checks. The workflow falls back to it, and
the missing checks are the visible signal.

### `CHROMATIC_PROJECT_TOKEN`

1. Create the project in Chromatic and link it to this repository.
2. Copy the project token from **Manage → Configure → Project token**.
3. Add it as the repository secret `CHROMATIC_PROJECT_TOKEN`.
4. Create the `chromatic` label on the repository: adding that label to a pull
   request is the opt-in trigger.
5. To rotate it, generate a new token in Chromatic and update the secret; the
   old token stops working.

The label is `chromatic`. A normal pull request runs nothing; a labelled one
runs the baseline. The job is not a required check, and a missing token is a
skip with a notice, never a red build.

## Rules

- No agent inserts, prints or commits a secret.
- No agent reads, sources or loads `.env`; the token comes from the process
  environment exported by the person.
- The Figma token is read-only. No workflow uses it for a write request.
