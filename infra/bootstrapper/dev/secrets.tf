# Tokens consumed by the workflows that run in the `app-dev-ci` environment.
#
# Terraform manages the existence of the secrets, never their value:
#
# - the Key Vault secret is created with `value_wo` (write-only, Terraform
#   1.11): the value is not stored in the Terraform state. Set it through the
#   portal or a secure channel after the first apply.
# - the GitHub environment secret starts as `placeholder`; the real value is
#   copied from Key Vault afterwards and the `value` attribute is ignored, so a
#   later apply does not overwrite it.
#
# Key Vault names in the common vault:
#   ui-figma-token, ui-drift-pr-token, ui-chromatic-project-token
locals {
  github_environment = "app-dev-ci"
  github_secrets = {
    FIGMA_TOKEN             = "ui-figma-token"
    DRIFT_PR_TOKEN          = "ui-drift-pr-token"
    CHROMATIC_PROJECT_TOKEN = "ui-chromatic-project-token"
  }
}

resource "azurerm_key_vault_secret" "github_actions" {
  for_each         = local.github_secrets
  provider         = azurerm.DEV-DEVEX
  name             = each.value
  key_vault_id     = module.azure-DEV-DEVEX_core_values.common_key_vault.id
  value_wo         = ""
  value_wo_version = 1
  content_type     = "text/plain"
  tags             = local.bootstrapper_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "github_actions_environment_secret" "this" {
  for_each    = local.github_secrets
  repository  = module.azure-DEV-DEVEX_bootstrap.repository.name
  environment = local.github_environment
  secret_name = each.key
  value       = "placeholder"

  lifecycle {
    ignore_changes = [value]
  }
}
