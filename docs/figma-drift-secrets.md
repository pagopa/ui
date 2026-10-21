# Figma drift and Chromatic secrets

The three tokens are **GitHub environment secrets of `app-dev-ci`**, the
environment the drift and Chromatic jobs declare. They are created and rotated
out of band, not by Terraform:

- the value lives in the common Key Vault;
- the GitHub environment secret is a copy of it;
- `infra/bootstrapper/dev/secrets.tf` only contains `removed` blocks that forget
  the resources created during an earlier Terraform attempt, without destroying
  the existing secrets.

No agent inserts, prints or reads a secret, and no Terraform `data` source reads
a Key Vault secret value. The tools read the process environment only.

## Secrets

| GitHub environment secret | Key Vault secret             | Used by                             | Scopes / permissions                                       | Failure mode                                                                                               |
| ------------------------- | ---------------------------- | ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `FIGMA_TOKEN`             | `ui-figma-token`             | `figma-drift.yml`, live local steps | `file_content:read`, `library_content:read` (read-only)    | The drift preflight fails explicitly; live local steps stop and use the evidence slice.                    |
| `DRIFT_PR_TOKEN`          | `ui-drift-pr-token`          | `figma-drift.yml`                   | contents: write, pull requests: write (fine-grained token) | The workflow falls back to `GITHUB_TOKEN`: the PR opens, its checks stay empty until a human re-runs them. |
| `CHROMATIC_PROJECT_TOKEN` | `ui-chromatic-project-token` | `chromatic.yml`                     | the Chromatic project token for this repository            | The opt-in job skips with a notice; no pull request is blocked.                                            |
| `GITHUB_TOKEN`            | —                            | every workflow                      | provided by Actions                                        | `pnpm install` cannot resolve the DX packages from GitHub Packages.                                        |

The registry token is the `GITHUB_TOKEN` passed to
`pagopa/dx/actions/setup-npm-registry`; add a dedicated `NODE_AUTH_TOKEN` only
if the organisation requires it.

The bootstrap module also sets `ARM_CLIENT_ID` and `ARM_SUBSCRIPTION_ID` as
environment secrets of `app-dev-ci` and `ARM_TENANT_ID` as a repository secret;
the drift and Chromatic jobs do not use them.

## Create and rotate

The Key Vault secrets live in the common vault. Create them there through the
portal or a secure channel, then copy each value into the environment secret
once:

```sh
az keyvault secret show --vault-name <common-vault> --name ui-figma-token \
  --query value -o tsv | gh secret set FIGMA_TOKEN --env app-dev-ci
```

The same shape applies to `ui-drift-pr-token` → `DRIFT_PR_TOKEN` and
`ui-chromatic-project-token` → `CHROMATIC_PROJECT_TOKEN`.

The `app-dev-ci` environment is created by `infra/repository`.
`infra/bootstrapper/dev/secrets.tf` no longer manages the secrets: its `removed`
blocks use `destroy = false`, so a later bootstrapper apply forgets the
resources without deleting the Key Vault or GitHub secrets.

### `FIGMA_TOKEN`

1. In Figma, create a personal access token with `file_content:read` and
   `library_content:read`. Do not grant a write scope: the repository is
   read-only against the design file.
2. Set it as the `ui-figma-token` Key Vault secret.
3. Copy it into the `FIGMA_TOKEN` environment secret of `app-dev-ci`.
4. To rotate it, create a new token, update the Key Vault secret and copy it
   again.

The drift job preflights it and fails with an explicit message when it is
missing; a skipped check cannot certify alignment.

### `DRIFT_PR_TOKEN`

1. Create a fine-grained personal access token scoped to this repository with
   **Contents: read and write** and **Pull requests: read and write**.
2. Set it as the `ui-drift-pr-token` Key Vault secret and copy it into
   `DRIFT_PR_TOKEN` of `app-dev-ci`.
3. Rotate it the same way; revoke the old token after the new one is in place.

The default `GITHUB_TOKEN` cannot start workflow runs on its own pull request,
so the drift PR would merge without checks. The workflow falls back to it, and
the missing checks are the visible signal.

### `CHROMATIC_PROJECT_TOKEN`

1. Create the project in Chromatic and link it to this repository.
2. Copy the project token from **Manage → Configure → Project token**.
3. Set it as the `ui-chromatic-project-token` Key Vault secret and copy it into
   `CHROMATIC_PROJECT_TOKEN` of `app-dev-ci`.
4. Create the `chromatic` label on the repository: adding that label to a pull
   request is the opt-in trigger.
5. To rotate it, generate a new token in Chromatic, update the Key Vault secret
   and copy it again.

The label is `chromatic`. A normal pull request runs nothing; a labelled one
runs the baseline. The job is not a required check, and a missing token is a
skip with a notice, never a red build.

## Rules

- No agent inserts, prints or commits a secret.
- No agent reads, sources or loads `.env`; the token comes from the process
  environment exported by the person.
- The Figma token is read-only. No workflow uses it for a write request.
- The workflows declare `environment: app-dev-ci`: environment secrets are
  visible only to a job that names the environment.
