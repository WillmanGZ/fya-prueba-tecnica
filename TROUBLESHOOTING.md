# Troubleshooting

Respuestas a los casos de soporte del Anexo 1 de la prueba técnica.

## Caso 1: Falla de inicialización en ECS Fargate

**Síntoma:** la tarea de ECS entra en bucle de reinicio y se detiene con el error `ResourceInitializationError: unable to pull secrets or registry auth`.

### a) 3 causas de red o permisos IAM que producen este error

1. **Falta de permisos IAM para leer el secreto en Secrets Manager.** El `execution_role` de la Task Definition necesita el permiso `secretsmanager:GetSecretValue`. Sin este permiso, ECS no puede inyectar las variables de entorno definidas en el secret manager.

2. **Falta de permisos IAM para autenticarse en el ECR.** El mismo `execution_role` necesita la policy `AmazonECSTaskExecutionRolePolicy` para poder hacer login en el ECR y descargar la imagen del contenedor.

3. **Falta de conectividad de red hacia ECR/Secrets Manager.** Como la task corre en una subnet privada sin NAT Gateway, necesita VPC Endpoints (`ecr.api`, `ecr.dkr`, `secretsmanager`, y el Gateway Endpoint de `s3` que ECR usa internamente para las capas de imagen) para siquiera _alcanzar_ esos servicios. Si los endpoints no existen, o su Security Group no permite el tráfico entrante desde el Security Group de ECS, se produce el mismo error.

### b) Comandos de AWS CLI para inspeccionar la tarea y sus logs de detención

```bash
# 1. Estado del servicio y sus eventos recientes
aws ecs describe-services --cluster <cluster> --services <service>
# Posible respuesta: events: mensaje de fallo repetido

# 2. IDs de las tasks que se detuvieron
aws ecs list-tasks --cluster <cluster> --service-name <service> --desired-status STOPPED
# Posible respuesta: lista de taskArns detenidos

# 3. Detalle de por qué se detuvo una task específica
aws ecs describe-tasks --cluster <cluster> --tasks <task-id>
# Posible respuesta: stoppedReason: el mensaje exacto del error

# 4. Logs del contenedor en CloudWatch
aws logs tail /ecs/<project-name> --since 30m
# Posible respuesta: sin logs de la app: el contenedor nunca llegó a arrancar
```

## Caso 2: Error HTTP 502/504 entre API Gateway y ECS

**Síntoma:** API Gateway responde `502 Bad Gateway` o `504 Gateway Timeout` al acceder a `/health`.

### a) Cómo aislar si el fallo viene del VPC Link, el Security Group del ALB, el Target Group, o el contenedor

Revisaría el estado de cada componente de forma independiente, empezando por el API Gateway.

```bash
# 1. Estado de la conexión entre el API Gateway y el VPC Link
aws apigateway get-vpc-link --vpc-link-id <vpc-link-id>
# Posible respuesta: status: AVAILABLE (sano) / PENDING o FAILED (aquí está el problema)

# 2. ¿El NLB ve el ALB como saludable?
aws elbv2 describe-target-health --target-group-arn <arn-target-group-nlb-to-alb>
# Posible respuesta: Reason: Target.Timeout (SG bloqueando) / healthy (sano)

# 3. ¿El ALB ve el contenedor de ECS como saludable?
aws elbv2 describe-target-health --target-group-arn <arn-target-group-alb-to-ecs>
# Posible respuesta: Reason: Target.Timeout (SG-ecs bloqueando) / Target.FailedHealthChecks (contenedor responde mal) / healthy (sano)

# 4. ¿El contenedor está vivo y procesando /health?
aws logs tail /ecs/<project-name> --since 15m
# Posible respuesta: sin líneas nuevas: nunca llegó tráfico / línea con error: el contenedor falla al procesar
```

### b) Cómo confirmar en CloudWatch si el WAF está bloqueando por geolocalización o rate-limit

1. Revisaría la métrica `BlockedRequests` del WAF en CloudWatch, filtrando por el nombre de la regla en cuestión para ver si el bloqueo coincide con los errores 502/504.

```bash
# 1. Detalle de las peticiones bloqueadas por rate limit
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=<web-acl-name> Name=Rule,Value=<rate-limit-rule-name> Name=Region,Value=<region> \
  --start-time 2026-09-16T00:00:00Z \
  --end-time 2026-09-16T23:59:59Z \
  --period 300 \
  --statistics Sum
# Posible respuesta: Datapoints con Sum > 0 coincidiendo en el tiempo con los 502/504 (confirma bloqueo) / vacío (descarta)

# 2. Detalle de las peticiones bloqueadas por geolocalización
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=<web-acl-name> Name=Rule,Value=<geo-block-rule-name> Name=Region,Value=<region> \
  --start-time 2026-09-16T06:00:00Z \
  --end-time 2026-09-16T07:00:00Z \
  --period 300 \
  --statistics Sum
# Posible respuesta: mismo criterio, Sum > 0 coincidiendo en el tiempo confirma bloqueo geográfico
```
