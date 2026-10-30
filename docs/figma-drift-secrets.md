# Figma drift and Chromatic secrets

The two tokens are **GitHub environment secrets of `app-dev-ci`**, the
environment the drift and Chromatic jobs declare. They are created and rotated
out of band: the value lives in the common Key Vault, the GitHub environment
secret is a copy of it, and Terraform manages neither.

The drift pull request needs no third token: it pushes and opens with the job's
`GITHUB_TOKEN` (see [The drift pull request](#the-drift-pull-request)).

No agent inserts, prints or reads a secret, and no Terraform `data` source reads
a Key Vault secret value. The tools read the process environment only.

## Secrets

| GitHub environment secret | Key Vault secret             | Used by                             | Scopes / permissions                                                                  | Failure mode                                                                                                                       |
| ------------------------- | ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `FIGMA_TOKEN`             | `ui-figma-token`             | `figma-drift.yml`, live local steps | `file_content:read`, `library_content:read` (read-only)                               | The drift preflight fails explicitly; live local steps stop and use the evidence slice.                                            |
| `CHROMATIC_PROJECT_TOKEN` | `ui-chromatic-project-token` | `chromatic.yml`                     | the Chromatic project token for this repository                                       | The opt-in job skips with a notice; no pull request is blocked.                                                                    |
| `GITHUB_TOKEN`            | —                            | every workflow, `figma-drift.yml`   | provided by Actions; the drift job declares `contents: write`, `pull-requests: write` | `pnpm install` cannot resolve the DX packages from GitHub Packages; the drift job cannot push its branch or open the pull request. |

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

The same shape applies to `ui-chromatic-project-token` →
`CHROMATIC_PROJECT_TOKEN`.

The `app-dev-ci` environment is created by `infra/repository`. A bootstrapper
apply leaves both the Key Vault and the GitHub secrets untouched: the
`removed` blocks in `infra/bootstrapper/dev/secrets.tf` use `destroy = false`.

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

## The drift pull request

`figma-drift.yml` pushes `figma-drift/<date>` and opens the pull request with
the job's `GITHUB_TOKEN`. The job declares `contents: write` and
`pull-requests: write`, and an explicit `permissions` block replaces the
repository default. `checkout` does not persist the token: the step that pushes
attaches it to the three git commands that need it, so the dependency install
and the Figma sync run with no credential on disk. It expires with the run, and
there is nothing to rotate or approve.

The one difference from a bot identity with its own token: the runs GitHub
starts on a pull request created or updated by `GITHUB_TOKEN` wait in an
**approval-required** state. The review pull request shows the banner, and
whoever reviews the drift approves the runs — one click inside the review they
were going to do anyway. Until then the checks are listed as waiting, not empty,
so a merge on a green check nobody ran cannot happen by accident.

Two repository settings carry this, both set on `pagopa/ui`: **Workflow
permissions** at `Read and write`, and **Allow GitHub Actions to create and
approve pull requests** enabled. Turning either one off moves the failure into
the job rather than into the review.

## Rules

- No agent inserts, prints or commits a secret.
- No agent reads, sources or loads `.env`; the token comes from the process
  environment exported by the person.
- The Figma token is read-only. No workflow uses it for a write request.
- The workflows declare `environment: app-dev-ci`: environment secrets are
  visible only to a job that names the environment.
