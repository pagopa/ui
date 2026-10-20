locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    domain          = "ui"
    instance_number = "01"
  }

  azure_accounts = {
    DEV-DEVEX = {
      location = "italynorth"
    }
  }

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    CostCenter     = "TS000 - TECNOLOGIA & SERVIZI"
    ManagementTeam = "DevEx"
    Owner          = "DevEx"
  }
}
