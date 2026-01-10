provider "aws" { region = "us-east-1" }
resource "aws_groundstation_config" "swarm_sat" {
  name = "cosmic-swarm"
  # Orbital swarm deploy
}