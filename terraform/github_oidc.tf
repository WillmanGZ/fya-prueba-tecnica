# Registers GitHub Actions as a trusted OIDC identity provider for this AWS account
resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Defines the IAM role that GitHub Actions assumes via OIDC to deploy this project
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github_actions.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        # GitHub emits two sub formats depending on repo creation date (changed
        # mid-2026): the legacy "org/repo" form, and a newer immutable-ID form
        # ("org@id/repo@id") — both must be accepted or new repos get rejected.
        StringLike = {
          "token.actions.githubusercontent.com:sub" = [
            "repo:WillmanGZ/fya-prueba-tecnica:*",
            "repo:WillmanGZ@143544629/fya-prueba-tecnica@*:*"
          ]
        }
      }
    }]
  })
}

# Grants the GitHub Actions role permission to push images to ECR and redeploy the ECS service
resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "${var.project_name}-github-actions-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:BatchGetImage"
        ]
        Resource = aws_ecr_repository.app.arn
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:DescribeServices"]
        Resource = aws_ecs_service.app.id
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = [aws_iam_role.ecs_execution.arn, aws_iam_role.ecs_task.arn]
      }
    ]
  })
}
