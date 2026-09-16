# Main virtual private cloud, we will use it for the subnets
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Subnet to host our compute resources (ECS, NLB, ALB)
resource "aws_subnet" "compute" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_compute_subnet_cidr
  availability_zone = var.azs[0]

  tags = {
    Name = "${var.project_name}-compute-subnet"
  }
}

# Subnet to host our RDS
resource "aws_subnet" "data_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_data_subnet_a_cidr
  availability_zone = var.azs[0]

  tags = {
    Name = "${var.project_name}-data-subnet-a"
  }
}

# Second AZ required by RDS's DB Subnet Group — no active workload runs here
resource "aws_subnet" "data_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_data_subnet_b_cidr
  availability_zone = var.azs[1]

  tags = {
    Name = "${var.project_name}-data-subnet-b"
  }
}

# No NAT Gateway or Internet Gateway: only intra-VPC (local) traffic for now.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

resource "aws_route_table_association" "compute" {
  subnet_id      = aws_subnet.compute.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "data_a" {
  subnet_id      = aws_subnet.data_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "data_b" {
  subnet_id      = aws_subnet.data_b.id
  route_table_id = aws_route_table.private.id
}

# ECR stores image layers in S3 under the hood — without this endpoint, ECS Fargate's docker pull fails even with the ecr.api/ecr.dkr endpoints in place.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name = "${var.project_name}-s3-endpoint"
  }
}

resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "${var.project_name}-vpce-"
  vpc_id      = aws_vpc.main.id

  # Only allow traffic from inside our VPC, not the whole internet
  ingress {
    description = "HTTPS from within the VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Open on purpose: replies to ingress are auto-allowed (SGs are stateful).
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-vpce-sg"
  }
}

# Lets ECS resolve ECR's real hostname to this private IP (private_dns_enabled) instead of failing to reach the public endpoint from a private subnet.
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.compute.id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "${var.project_name}-ecr-api-endpoint"
  }
}

# Same private-DNS pattern as ecr_api, needed for the docker pull itself.
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.compute.id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "${var.project_name}-ecr-dkr-endpoint"
  }
}

# Lets the Fargate task ship container logs to CloudWatch without a NAT Gateway.
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.compute.id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "${var.project_name}-logs-endpoint"
  }
}

# Second AZ required by the ALB — no active ECS task runs here.
resource "aws_subnet" "compute_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_compute_subnet_b_cidr
  availability_zone = var.azs[1]

  tags = {
    Name = "${var.project_name}-compute-subnet-b"
  }
}

resource "aws_route_table_association" "compute_b" {
  subnet_id      = aws_subnet.compute_b.id
  route_table_id = aws_route_table.private.id
}

# Lets ECS reach Secrets Manager privately to fetch the database credentials.
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.compute.id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "${var.project_name}-secretsmanager-endpoint"
  }
}
