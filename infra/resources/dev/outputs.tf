output "static_web_app" {
  description = "Details of the Static Web App hosting the Storybook, including its name, host name and resource group."
  value = {
    name                = azurerm_static_web_app.storybook.name
    id                  = azurerm_static_web_app.storybook.id
    default_host_name   = azurerm_static_web_app.storybook.default_host_name
    resource_group_name = azurerm_static_web_app.storybook.resource_group_name
  }
}
