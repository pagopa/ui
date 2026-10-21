# The pipeline tokens are created and rotated out of band: they live in the
# common Key Vault and in the app-dev-ci GitHub environment. Terraform used to
# manage them here; these blocks forget every instance without destroying the
# secrets that already exist.
#
# Key Vault: ui-figma-token, ui-drift-pr-token, ui-chromatic-project-token
# GitHub environment: FIGMA_TOKEN, DRIFT_PR_TOKEN, CHROMATIC_PROJECT_TOKEN

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
