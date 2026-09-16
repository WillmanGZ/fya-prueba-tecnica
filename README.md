# fya-prueba-tecnica — Cloud DevOps Engineer

> 48h technical test: containerized microservice deployed on AWS Free Tier behind WAF, API Gateway, VPC Link, an internal ALB, and ECS Fargate.

```
===================================================================
QUICK EVALUATION TEST DATA
===================================================================
1. Public Endpoint (API Gateway + WAF):
   [PENDING — filled in once deployed. Format:
   https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/health]

2. AWS Console Access (IAM ReadOnly for Reviewers):
   - AWS Login URL: [PENDING]
   - Username: eval-devops-reviewer
   - Temporary password: [PENDING]

3. cURL test example:
   curl -i [PENDING]/health
===================================================================
```

This block gets filled in at the end, once the infrastructure is deployed. In the meantime, this README documents the architecture and the decisions made, so that anyone (including the reviewer) can understand the "why" behind each component without having to guess.

## Objective

Design, provision, and deploy on AWS a complete architecture for a containerized web microservice, within AWS Free Tier limits, implementing the following traffic and perimeter security flow:

```
Internet → AWS WAF → API Gateway (REST) → VPC Link → Internal ALB → ECS Fargate → RDS PostgreSQL
```

## Architecture

### Traffic flow overview

| # | Hop | What it does | Why it exists |
|---|---|---|---|
| 1 | Client → API Gateway | Public HTTPS request (curl, Postman, browser) | The only point in the architecture with a public endpoint |
| 2 | AWS WAF | Inspects the request before it reaches the API logic (regional Web ACL associated with API Gateway) | First perimeter security layer: blocks by rate-limit / geo / IP reputation before spending compute |
| 3 | API Gateway → VPC Link (AWS PrivateLink) → NLB | Managed private tunnel into the VPC, without exposing anything to the Internet | REST APIs on API Gateway can only connect to a VPC Link via a **Network Load Balancer**, never directly to an ALB |
| 4 | NLB → Target Group (type `alb`) → Internal ALB | The NLB forwards to the ALB registered as a target by its ARN | This is the pattern AWS requires to expose an internal ALB behind a "classic" (REST) VPC Link |
| 5 | Internal ALB → Target Group → ECS Fargate | The `:80` listener routes to healthy tasks based on the `/health` health check | The ALB understands HTTP/HTTPS and does the real layer-7 load balancing to the containers |
| 6 | ECS Fargate → RDS PostgreSQL | The microservice task queries the database | Persistence backend, isolated in a data subnet, only reachable from ECS |

In parallel, outside the real-time traffic path, the deployment pipeline runs:

```
GitHub Actions (build/test) → Amazon ECR (push, tag = commit SHA + latest) → Amazon ECS (force-new-deployment)
```

### Why each component lives where it lives

- **WAF and API Gateway** don't live inside the VPC — they're managed/multi-tenant AWS services (the "edge zone"). They have no Security Groups of their own; access control there is handled by the WAF's Web ACL.
- **VPC Link (AWS PrivateLink)** is the bridge between that edge zone and the private network. It technically reuses the same underlying technology (PrivateLink) used later for the ECR/CloudWatch VPC Endpoints — same mechanism, two different products.
- **Internal NLB** exists solely because the "classic" VPC Link used by REST APIs cannot point directly at an ALB. The NLB's Target Group is of type `alb` and registers the ALB's ARN (not loose IPs).
- **Internal ALB** (`scheme: internal`) never has a public IP. It only receives traffic from the VPC Link's ENIs.
- **ECS Fargate** runs in private subnets, with no public IP. We decided on **a single task** (no multi-AZ replicas) — see [Architecture decisions](#architecture-decisions-and-why).
- **RDS PostgreSQL** lives in its own data subnet, with a Security Group that only accepts traffic from the ECS Security Group.

### Layered isolation (Security Groups)

```
Internet
   │
[Edge Zone: WAF + API Gateway — no VPC, no Security Groups]
   │  (PrivateLink / VPC Link)
   ▼
SG-nlb  (NLB, transport layer, no application rules)
   ▼
SG-alb  (ingress :80 ONLY from the VPC Link's ENIs)
   ▼
SG-ecs  (ingress :8080 ONLY from SG-alb)
   ▼
SG-db   (ingress :5432 ONLY from SG-ecs)
```

Each Security Group only allows traffic from the immediately preceding hop. Nothing is open to `0.0.0.0/0` except API Gateway itself (the intentional entry point).

### VPC addressing (CIDR)

```
10.0.0.0/16        → full VPC (65,536 IPs)
10.0.1.0/24        → private compute subnet (NLB + ALB + ECS)         AZ: us-east-1a
10.0.2.0/24        → private data subnet (RDS)                         AZ: us-east-1a
10.0.3.0/24        → private data subnet (RDS, required 2nd AZ)        AZ: us-east-1b
10.0.4.0/24        → private compute subnet (ALB only, required 2nd AZ) AZ: us-east-1b
```

`10.0.0.0/16` was chosen because it's the largest available private range (RFC 1918) and the convention most commonly used in Terraform examples/modules — there is no technical requirement to use that exact range. Both RDS and the ALB require spanning **2 different AZs** — a platform requirement, not a design choice — even without RDS Multi-AZ enabled and with a single ECS task. That's why `10.0.3.0/24` and `10.0.4.0/24` exist with no active workload running in them.

## Architecture decisions (and why)

These are deliberate decisions to keep the project within Free Tier limits and at the right level of complexity for a 48-hour test — not accidents or oversights.

- **A single Fargate task, no multi-AZ replicas.** Fargate **has no Free Tier** (it bills from the first second, per vCPU/GB-hour). Doubling tasks doubles cost without adding value to what's being evaluated. The design supports scaling to N tasks with no structural changes.
- **RDS without the "Multi-AZ" feature enabled.** That specific RDS checkbox creates a synchronous standby replica in another AZ with automatic failover, and it **doubles the instance cost**. It's left off (default). This is different from "spanning multiple AZs," which is mandatory for the RDS Subnet Group.
- **VPC Endpoints instead of a NAT Gateway.** ECS in private subnets needs to reach ECR, CloudWatch Logs, and Secrets Manager. A NAT Gateway bills per hour plus per GB processed and **is not covered by Free Tier**. VPC Endpoints (Gateway for S3, Interface for ECR API/DKR, CloudWatch Logs, Secrets Manager) achieve the same result without that cost.
- **CI/CD authentication via OIDC**, not static Access Keys stored as secrets. GitHub Actions assumes a temporary IAM Role — this reduces the attack surface (no long-lived credentials to leak).
- **Read-only IAM user for the reviewer**, separate from any operational credential, with a `ReadOnlyAccess` policy (or one scoped to API Gateway, WAF, ALB, ECS, ECR, CloudWatch).

## Repository structure (planned)

```
.
├── app/                     # Minimal API (health + info) and its Dockerfile
├── terraform/               # IaC: VPC, WAF, API Gateway, VPC Link, NLB, ALB, ECS, ECR, RDS, IAM
├── .github/workflows/
│   └── deploy.yml           # build → test → push to ECR → deploy to ECS
├── docker-compose.yml       # local stack (app + Postgres)
├── .env.example
├── TROUBLESHOOTING.md       # answers to Appendix 1 (support cases)
└── README.md
```

## Running locally

_Pending — documented alongside `docker-compose.yml`._

## CI/CD

_Pending — documented alongside `.github/workflows/deploy.yml`._

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) _(pending)_ for the answers to Appendix 1 of the technical test.

## Project status

- [x] Requirements analysis and target architecture
- [x] Architecture diagram (full flow + Security Groups)
- [x] Network design in Terraform (VPC, subnets, endpoints)
- [ ] Minimal API + Dockerfile
- [x] ECS Fargate + ECR + ALB + NLB + Target Groups (Terraform written; not yet applied — no image pushed to ECR)
- [ ] API Gateway + VPC Link + WAF
- [ ] RDS PostgreSQL
- [ ] GitHub Actions pipeline (OIDC)
- [ ] Read-only IAM user for evaluation
- [ ] TROUBLESHOOTING.md (Appendix 1)
- [ ] Final deployment and access data in this README
