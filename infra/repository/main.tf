module "github_repository" {
  source  = "pagopa-dx/github-environment-bootstrap/github"
  version = "~> 1.0"

  repository = {
    name            = "pagopa-ui"
    description     = "PagoPA Web Design System"
    topics          = []
    reviewers_teams = []
  }
}
