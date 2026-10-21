# Figma drift and Chromatic secrets

Every value below is a repository secret inserted by the person. An agent
writes the workflow and this table; it never inserts a secret, never prints one
and never reads `.env` — the tools read the process environment only.

## Secrets

| Secret                   | Used by                        | Scopes / permissions                                    | Failure mode                                                                 |
| ------------------------ | ------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `CHROMATIC_PROJECT_TOKEN`| `.github/workflows/chromatic.yml` | the Chromatic project token for this repository     | The opt-in job skips with a notice; no pull request is blocked.              |

## Create and rotate

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
