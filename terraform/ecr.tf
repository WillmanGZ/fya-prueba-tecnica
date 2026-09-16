# MUTABLE so the pipeline can overwrite the "latest" tag on every deploy.
# Scan-on-push is a hard requirement from the test brief, not optional.
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-ecr"
  }
}
