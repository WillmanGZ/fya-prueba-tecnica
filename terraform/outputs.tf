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

# Exposes the public API Gateway URL — the endpoint to test with curl/Postman
output "api_gateway_url" {
  value       = aws_api_gateway_stage.main.invoke_url
  description = "Public API Gateway URL, e.g. <url>/api/health"
}

# Exposes the console login URL for the read-only evaluator user
output "eval_reviewer_console_login_url" {
  value       = "https://${data.aws_caller_identity.current.account_id}.signin.aws.amazon.com/console?region=${var.aws_region}"
  description = "AWS Console login URL for the read-only evaluator user"
}

# Exposes the evaluator's username
output "eval_reviewer_username" {
  value = aws_iam_user.eval_reviewer.name
}

# Exposes the evaluator's temporary password
output "eval_reviewer_temporary_password" {
  value       = aws_iam_user_login_profile.eval_reviewer.password
  sensitive   = true
  description = "Temporary password — retrieve with: terraform output -raw eval_reviewer_temporary_password"
}
