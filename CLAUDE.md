# CLAUDE.md

Contexto y convenciones de este repositorio para cualquier sesión de Claude Code que trabaje aquí.

## Qué es este proyecto

Prueba técnica de 48 horas para Ingeniero DevOps Cloud. El objetivo es desplegar en AWS (dentro del Free Tier) un microservicio contenerizado detrás de: `WAF → API Gateway (REST) → VPC Link → ALB interno → ECS Fargate → RDS PostgreSQL`, con CI/CD automatizado en GitHub Actions e IaC en Terraform.

El documento original de la prueba está en la raíz de `Fya/` (fuera de este repo) como `.docx`. El README.md de este repo es el resumen vivo de la arquitectura y decisiones — mantenerlo actualizado es parte del entregable.

**Contexto de quien lo construye:** el usuario está aprendiendo AWS a fondo mientras hace esta prueba. Prioridad: que entienda y pueda explicar cada pieza, no solo que "funcione". Al proponer cambios de infraestructura, explicar el porqué, no solo el qué.

## Decisiones de arquitectura ya tomadas (no revertir sin discutirlo)

1. **1 sola tarea Fargate**, no réplicas multi-AZ. Fargate no tiene Free Tier; duplicar tareas duplica costo sin necesidad para esta prueba.
2. **RDS sin Multi-AZ activado** (la feature específica de réplica síncrona). Sí requiere un DB Subnet Group con subnets en 2 AZs (exigencia de la plataforma), pero sin failover automático activado.
3. **VPC Endpoints en vez de NAT Gateway** para que ECS resuelva ECR, CloudWatch Logs y Secrets Manager desde subnets privadas. El NAT Gateway no está cubierto por Free Tier y genera costo recurrente por hora + por GB.
4. **VPC Link (REST API) apunta a un NLB, no directo a un ALB.** Es una restricción de AWS, no una elección: las REST APIs de API Gateway solo soportan VPC Link "clásico" contra Network Load Balancers. El NLB usa un Target Group tipo `alb` que registra el ARN del ALB interno.
5. **Autenticación de GitHub Actions vía OIDC** (IAM Role federado), nunca Access Keys estáticas en secretos del repo.
6. **Tagging de imágenes Docker:** siempre con el commit SHA (`${{ github.sha }}`) y adicionalmente `latest`.
7. **Egress abierto (`0.0.0.0/0`) en todos los Security Groups**, solo el ingress está restringido por capa. Egress "perfecto" (sg-alb solo hacia sg-ecs, sg-ecs solo hacia sg-db + SG de endpoints) es más seguro pero implica enumerar y mantener cada destino legítimo; el ingress es el punto de control real (decide quién puede iniciar contacto), así que se prioriza tiempo de entrega sobre este endurecimiento extra. Revisar si se retoma más adelante.

## Esquema de direccionamiento (CIDR)

```
10.0.0.0/16   VPC
10.0.1.0/24   subnet privada de cómputo (NLB, ALB, ECS)          us-east-1a
10.0.2.0/24   subnet privada de datos (RDS)                       us-east-1a
10.0.3.0/24   subnet privada de datos (RDS, requerida por AWS)    us-east-1b
10.0.4.0/24   subnet privada de cómputo (solo ALB, requerida por AWS) us-east-1b
```

Tanto RDS como el ALB exigen recursos en 2 AZs distintas (regla de la plataforma, no elección de diseño), por eso hay subnets "vacías" sin carga activa en `us-east-1b`.

No usar rangos superpuestos si se agregan más subnets — seguir la convención `/24` por subnet dentro del `/16`.

## Convenciones de nombres

- Security Groups: `sg-<capa>` (ej. `sg-nlb`, `sg-alb`, `sg-ecs`, `sg-db`).
- Recursos de Terraform: usar el nombre del proyecto como prefijo/tag consistente (definir un `local.name_prefix` o similar al iniciar el módulo raíz) para poder identificar todo en consola durante la auditoría del evaluador.
- Todos los recursos facturables deben quedar etiquetados (`Project`, `ManagedBy = terraform`, `Environment = evaluation`) para que el usuario IAM de solo lectura pueda filtrar por Cost Explorer si hace falta.

## Cosas que NO hacer

- No activar RDS Multi-AZ (feature específica) — ver decisión #2.
- No crear un NAT Gateway salvo que el usuario decida explícitamente cambiar de estrategia.
- No guardar credenciales AWS de larga duración en GitHub Secrets si OIDC es viable.
- No exponer el ALB ni el NLB con `scheme: internet-facing` — ambos deben ser `internal`.
- No dejar ningún Security Group con ingreso `0.0.0.0/0` salvo, implícitamente, el punto de entrada público (API Gateway, que no es un Security Group de VPC).

## Estado y siguiente paso

Ver la sección "Estado del proyecto" en README.md — se mantiene como checklist vivo. Actualizar ambos archivos (README.md y este CLAUDE.md) cuando se tome una decisión de arquitectura nueva o se revierta una existente, para que el historial de "por qué" no se pierda.
