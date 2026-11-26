# The pipeline tokens are created and rotated out of band: they live in the
# common Key Vault and in the app-dev-ci GitHub environment. Terraform used to
# manage them here; these blocks forget every instance without destroying the
# secrets that already exist.
#
# Key Vault: ui-figma-token, and ui-drift-pr-token until the person deletes it —
# the drift pull request now uses the job's GITHUB_TOKEN instead of that personal
# access token. The visual baselines need no token of their own: the visual job
# reads pagopa/ui-visual-baselines with its own GITHUB_TOKEN.
# GitHub environment: FIGMA_TOKEN, and DRIFT_PR_TOKEN until it is deleted.

removed {
  from = azurerm_key_vault_secret.github_actions
  lifecycle {
    destroy = false
  }
}

removed {
  from = github_actions_environment_secret.this
  lifecycle {
    destroy = false
  }
}
