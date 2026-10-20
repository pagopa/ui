data "azuread_group" "admins" {
  display_name = "dx-d-ui-adgroup-admin"
}

data "azuread_group" "developers" {
  display_name = "dx-d-ui-adgroup-developers"
}

data "azuread_group" "externals" {
  display_name = "dx-d-ui-adgroup-externals"
}

