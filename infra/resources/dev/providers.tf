terraform {
  required_version = ">= 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    # DX provider: resource naming and the dx_* resources. The local name is
    # `azuredx` to mirror the DX reference implementation in pagopa/dx.
    azuredx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
  subscription_id     = "35e6e3b2-4388-470e-a1b9-ad3bc34326d1"
}

provider "azuredx" {}
