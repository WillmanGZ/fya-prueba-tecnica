# fya-prueba-tecnica — Ingeniero DevOps Cloud

> Prueba técnica de 48h: microservicio contenerizado desplegado en AWS Free Tier detrás de WAF, API Gateway, VPC Link, un ALB interno y ECS Fargate.

```
===================================================================
DATOS PARA PRUEBA RÁPIDA DE EVALUACIÓN
===================================================================
1. Endpoint Público (API Gateway + WAF):
   https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/health

2. Acceso a Consola AWS (IAM ReadOnly para Evaluadores):
   - URL de Login AWS: https://508575763101.signin.aws.amazon.com/console
   - Usuario: eval-devops-reviewer
   - Contraseña temporal: htkcps!v2*ly_znY'4Yd
   (La contraseña es temporal — AWS exigirá cambiarla en el primer inicio de sesión. El usuario tiene permisos de solo lectura, acotados a API Gateway, WAF, ALB, ECS, ECR y CloudWatch.)

3. Ejemplo de prueba con cURL:
   curl -i https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/health
   curl -i https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/v1/info
===================================================================
```

## Cómo correr el proyecto localmente

Requiere Docker y Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Esto levanta Postgres y la API juntos — la app espera a que Postgres pase su propio health check antes de arrancar (`depends_on: condition: service_healthy`), no solo a que el contenedor inicie.

Probarlo:

```bash
curl -i http://localhost:8080/health
curl -i http://localhost:8080/api/v1/info
```

`/api/v1/info` debería reportar `"db_status": "connected"` con un timestamp real de Postgres, confirmando que toda la cadena `app → Postgres` funciona de punta a punta.

## Troubleshooting

Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) para las respuestas al Anexo 1 de la prueba técnica.

## Estado del proyecto

- [x] Análisis de requisitos y arquitectura objetivo
- [x] Diagrama de arquitectura (flujo completo + Security Groups)
- [x] Diseño de red en Terraform (VPC, subnets, endpoints)
- [x] API mínima + Dockerfile (hexagonal, TS, tests, multi-stage build — verificado de punta a punta con `docker compose up`)
- [x] ECS Fargate + ECR + ALB + NLB + Target Groups (desplegado y en funcionamiento)
- [x] API Gateway + VPC Link + WAF (desplegado y en funcionamiento)
- [x] RDS PostgreSQL (desplegado, conectado por TLS, verificado de punta a punta vía `/api/v1/info`)
- [x] Pipeline de GitHub Actions (OIDC) (desplegado exitosamente — build, push y redeploy de ECS funcionando)
- [x] Usuario IAM de solo lectura para evaluación (desplegado — credenciales en el README)
- [x] TROUBLESHOOTING.md (Anexo 1)
- [x] Datos finales de despliegue y acceso en el README

## Más información

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — arquitectura de AWS, estructura del repositorio, CI/CD y estado del proyecto.
- [app/README.md](./app/README.md) — detalle de implementación de la API (arquitectura hexagonal, variables de entorno, tests).
