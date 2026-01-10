terraform {
  required_providers { aws = {}, gcp = {}, azurerm = {} }
}
resource "aws_ecs_service" "swarm" { name = "global-swarm" replicas = 100 } # Empire scale