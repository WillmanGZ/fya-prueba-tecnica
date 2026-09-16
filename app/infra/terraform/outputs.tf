# Exposes the GitHub Actions role ARN, needed to configure the deploy workflow
output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "IAM Role ARN for GitHub Actions OIDC — used in the deploy workflow"
}

# Exposes the ECR repository URL, needed to push the Docker image
output "ecr_repository_url" {
  value       = aws_ecr_repository.app.repository_url
  description = "ECR repository URL to push the Docker image to"
}

# Exposes the ECS cluster name, needed to target the right cluster in the workflow
output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

# Exposes the ECS service name, needed to trigger the redeployment
output "ecs_service_name" {
  value = aws_ecs_service.app.name
}
