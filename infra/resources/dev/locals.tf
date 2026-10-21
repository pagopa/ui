locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "ui"
    app_name        = "storybook"
    instance_number = "01"
  }

  tags = {
    BusinessUnit   = "DevEx"
    CostCenter     = "TS000 - TECNOLOGIA & SERVIZI"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    ManagementTeam = "DevEx"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/ui/blob/main/infra/resources/dev"
  }
}
