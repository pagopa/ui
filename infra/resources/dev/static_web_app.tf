# Azure Static Web App hosting the deployable Storybook.
#
# No pagopa-dx module exists for Azure Static Web Apps, so the raw azurerm
# resource is used, following the DX documentation and the reference
# implementation in pagopa/dx (infra/resources/_modules/dx_website).
# Static Web Apps are not available in italynorth, so the resource is pinned to
# westeurope while the name keeps the italynorth segment.
resource "azurerm_static_web_app" "storybook" {
  name                = provider::azuredx::resource_name(merge(local.environment, { resource_type = "static_web_app" }))
  resource_group_name = data.azurerm_resource_group.workload.name
  location            = "westeurope"

  # Standard supports preview environments and custom domains. The Free tier
  # caps staging environments and has no SLA.
  sku_size = "Standard"
  sku_tier = "Standard"

  tags = local.tags

  lifecycle {
    # Deployments use the API key from the pipeline; the repository fields are
    # not managed by Terraform and must not cause drift.
    ignore_changes = [
      repository_branch,
      repository_url,
    ]
  }
}
