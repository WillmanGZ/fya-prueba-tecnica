# Creates the IAM user the evaluator will use to audit the AWS console
resource "aws_iam_user" "eval_reviewer" {
  name = "eval-devops-reviewer"

  tags = {
    Name = "eval-devops-reviewer"
  }
}

# Grants that user read-only access to exactly the services listed in the test brief
resource "aws_iam_user_policy" "eval_reviewer_readonly" {
  name = "eval-devops-reviewer-readonly"
  user = aws_iam_user.eval_reviewer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "apigateway:GET",
          "wafv2:Get*",
          "wafv2:List*",
          "elasticloadbalancing:Describe*",
          "ecs:Describe*",
          "ecs:List*",
          "ecr:Describe*",
          "ecr:List*",
          "ecr:Get*",
          "cloudwatch:Describe*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "logs:Describe*",
          "logs:Get*",
          "logs:List*",
          "logs:FilterLogEvents"
        ]
        Resource = "*"
      },
      {
        # Required for the forced password reset on first login
        Effect   = "Allow"
        Action   = "iam:ChangePassword"
        Resource = "arn:aws:iam::*:user/$${aws:username}"
      }
    ]
  })
}

# Enables AWS Console access for the evaluator, with a temporary auto-generated password.
resource "aws_iam_user_login_profile" "eval_reviewer" {
  user                    = aws_iam_user.eval_reviewer.name
  password_reset_required = true
}
