# fya-prueba-tecnica — Ingeniero DevOps Cloud

> Prueba técnica de 48h: microservicio contenerizado desplegado en AWS detrás de WAF, API Gateway, VPC Link, un ALB interno y ECS Fargate.

```
===================================================================
DATOS PARA PRUEBA RÁPIDA DE EVALUACIÓN
===================================================================
1. Endpoints Públicos (API Gateway + WAF):
   https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/health
   https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/v1/info

2. Acceso a Consola AWS (IAM ReadOnly para Evaluadores):
   - URL de Login AWS: https://508575763101.signin.aws.amazon.com/console?region=us-east-1
   - Usuario: eval-devops-reviewer
   - Contraseña: A3B3mSkMUHelFB
   (El usuario tiene permisos de solo lectura, acotados a API Gateway, WAF, ALB, ECS, ECR y CloudWatch.)

3. Ejemplo de prueba con cURL:

   Windows:
   curl.exe -i https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/health
   curl.exe -i https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/v1/info

   Linux / macOS:
   curl -i https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/health
   curl -i https://mslm9dwz3j.execute-api.us-east-1.amazonaws.com/api/v1/info
===================================================================
```

> **Nota:** la infraestructura de AWS descrita arriba (API Gateway, WAF, ALB/NLB, ECS Fargate, RDS, VPC, usuario de evaluación IAM, etc.) fue destruida con `terraform destroy` tras la evaluación para evitar costos innecesarios. Los endpoints y las credenciales de acceso a la consola que se muestran arriba ya no son válidos.

## Cómo correr el proyecto localmente

Requiere Docker y Docker Compose.

1. Copia `.env.example` y renómbralo a `.env` (el proyecto necesita este archivo para arrancar; sin él, `docker compose up` falla):
   ```bash
   cp .env.example .env
   ```
2. Levanta el stack (app + Postgres):
   ```bash
   docker compose up --build
   ```
   La app espera a que Postgres pase su propio health check antes de arrancar (`depends_on: condition: service_healthy`), no solo a que el contenedor inicie.
3. Pruébalo:

   Windows (PowerShell/cmd):
   ```powershell
   curl.exe -i http://localhost:8080/api/health
   curl.exe -i http://localhost:8080/api/v1/info
   ```

   Linux / macOS:
   ```bash
   curl -i http://localhost:8080/api/health
   curl -i http://localhost:8080/api/v1/info
   ```

   `/api/v1/info` debería reportar `"db_status": "connected"` con un timestamp real de Postgres, confirmando que toda la cadena `app → Postgres` funciona de punta a punta.

## Troubleshooting

Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) para las respuestas al Anexo 1 de la prueba técnica.

## Más información

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — arquitectura de AWS, estructura del repositorio, CI/CD y estado del proyecto.
- [app/README.md](./app/README.md) — detalle de implementación de la API (arquitectura hexagonal, variables de entorno, tests).
