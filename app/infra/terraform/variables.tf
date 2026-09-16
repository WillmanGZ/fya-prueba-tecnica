variable "project_name" {
  type        = string
  default     = "fya-prueba-tecnica"
  description = "Prefix used to name and tag every resource"
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region where all resources are provisioned"
}

variable "api_stage_name" {
  type        = string
  default     = "v1"
  description = "API Gateway stage name — independent from the environment tag"
}

variable "environment" {
  type        = string
  default     = "evaluation"
  description = "Value for the Environment tag on billable resources"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC"
}

variable "azs" {
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
  description = "Availability Zones used by the subnets"
}

variable "private_compute_subnet_cidr" {
  type        = string
  default     = "10.0.1.0/24"
  description = "Private subnet for NLB, ALB and ECS (AZ index 0)"
}

variable "private_data_subnet_a_cidr" {
  type        = string
  default     = "10.0.2.0/24"
  description = "Private data subnet for RDS (AZ index 0)"
}

variable "private_data_subnet_b_cidr" {
  type        = string
  default     = "10.0.3.0/24"
  description = "Private data subnet for RDS — required 2nd AZ, no active compute (AZ index 1)"
}

variable "private_compute_subnet_b_cidr" {
  type        = string
  default     = "10.0.4.0/24"
  description = "Private compute subnet in the second AZ, required by the ALB's 2-AZ rule — no active task runs here"
}

variable "db_name" {
  type        = string
  default     = "fya_prueba_tecnica"
  description = "Name of the initial PostgreSQL database"
}

variable "db_username" {
  type        = string
  default     = "app_user"
  description = "Master username for RDS"
}
