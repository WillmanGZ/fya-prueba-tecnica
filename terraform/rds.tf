# Generates a random master password for the database.
resource "random_password" "db_master" {
  length           = 20
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Creates the DB Subnet Group, telling RDS which subnets it can use.
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.data_a.id, aws_subnet.data_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# Provisions the PostgreSQL database instance.
resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_master.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  multi_az                   = false
  publicly_accessible        = false
  auto_minor_version_upgrade = true
  skip_final_snapshot        = true

  tags = {
    Name = "${var.project_name}-db"
  }
}

# Creates the secret container that will hold the database credentials.
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}-db-credentials"

  tags = {
    Name = "${var.project_name}-db-credentials"
  }
}

# Stores the actual connection values (host, port, db name, user, password) inside the secret.
resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
    username = var.db_username
    password = random_password.db_master.result
  })
}
