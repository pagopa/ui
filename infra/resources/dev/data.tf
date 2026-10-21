# Workload resource group owned by the bootstrapper (infra/bootstrapper/dev).
# The naming function rejects a resource whose `name` equals `domain`, and
# `local.environment` carries both keys for the workload resources, so the
# domain is passed as `name` here with the other keys filtered out.
data "azurerm_resource_group" "workload" {
  name = provider::azuredx::resource_name(merge(
    { for key, value in local.environment : key => value if !contains(["app_name", "domain"], key) },
    {
      name          = local.environment.domain
      resource_type = "resource_group"
    }
  ))
}
