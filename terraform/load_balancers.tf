# Sits behind the VPC Link — REST API Gateway can only target an NLB, never an ALB directly
resource "aws_lb" "nlb" {
  name               = "${var.project_name}-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = [aws_subnet.compute.id]

  tags = {
    Name = "${var.project_name}-nlb"
  }
}

resource "aws_lb" "alb" {
  name               = "${var.project_name}-alb"
  internal           = true
  load_balancer_type = "application"
  subnets            = [aws_subnet.compute.id, aws_subnet.compute_b.id]
  security_groups    = [aws_security_group.alb.id]

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# Special case: registers the whole ALB by ARN, not an IP — required by VPC Link.
resource "aws_lb_target_group" "nlb_to_alb" {
  name        = "${var.project_name}-nlb-to-alb"
  port        = 80
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "alb"
}

resource "aws_lb_target_group_attachment" "nlb_to_alb" {
  target_group_arn = aws_lb_target_group.nlb_to_alb.arn
  target_id        = aws_lb.alb.arn
  port             = 80

  # AWS rejects an "alb" target registration until the ALB already has a
  # listener on this port — Terraform can't infer that from the args above.
  depends_on = [aws_lb_listener.alb]
}

# One target per running ECS task; health check drives who gets traffic
resource "aws_lb_target_group" "alb_to_ecs" {
  name        = "${var.project_name}-alb-to-ecs"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

resource "aws_lb_listener" "nlb" {
  load_balancer_arn = aws_lb.nlb.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.nlb_to_alb.arn
  }
}

resource "aws_lb_listener" "alb" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.alb_to_ecs.arn
  }
}
