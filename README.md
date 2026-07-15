# CampusConnect 360

Plataforma distribuida para integrar la gestión académica, financiera, de bienestar y analítica de una red de colegios. La solución usa microservicios independientes, comunicación síncrona por HTTP y comunicación asíncrona mediante eventos persistentes en RabbitMQ.

El proyecto está preparado para ejecutarse completamente con Docker Compose y para demostrar recuperación ante caídas, procesamiento idempotente, reintentos, Dead Letter Queue (DLQ), trazabilidad y ausencia de duplicados.

## Funcionalidad disponible

- Registro de estudiantes y matrículas.
- Consulta de estudiantes con matrícula activa.
- Creación y confirmación de pagos.
- Actualización automática del estado financiero del estudiante.
- Registro de asistencia e incidencias de bienestar.
- Generación automática de notificaciones ante eventos relevantes.
- Dashboard directivo con contadores, salud de servicios, Outbox pendientes, estado de DLQ y trazabilidad reciente.
- Autenticación JWT y autorización por roles tanto en frontend como en backend.

## Arquitectura de la solución

| Componente | Responsabilidad | Puerto |
| --- | --- | ---: |
| Frontend React | Interfaz según el rol autenticado | `3000` |
| API Gateway NGINX | Entrada única, enrutamiento, límites y cabeceras de seguridad | `80` |
| Academic Service | Estudiantes, matrículas y estado financiero | `8001` |
| Payment Service | Creación y confirmación de pagos | `8002` |
| Notification Service | Notificaciones, DLQ y reprocesamiento | `8003` |
| Attendance Service | Asistencia e incidencias | `8004` |
| Analytics Service | Indicadores y trazabilidad de eventos | `8005` |
| RabbitMQ | Broker de eventos y consola de administración | `5672` / `15672` |
| PostgreSQL | Una base independiente por microservicio | Interno |

Cada microservicio mantiene su propia base de datos PostgreSQL. Ningún servicio consulta directamente la base de otro: Payment y Attendance validan estudiantes mediante la API de Academic, mientras que las actualizaciones desacopladas se propagan mediante RabbitMQ.

```text
Frontend -> NGINX Gateway -> APIs FastAPI -> PostgreSQL por servicio
                               |
                               +-> Outbox -> RabbitMQ -> consumidores idempotentes
```

## Tecnologías

- Python, FastAPI, SQLAlchemy y Pydantic.
- PostgreSQL 16.
- RabbitMQ 3.13 con exchange `topic`.
- React 19, Vite y Axios.
- NGINX como API Gateway.
- Docker y Docker Compose.
- JWT para autenticación y autorización.

## Requisitos previos

- Docker Desktop en ejecución.
- Docker Compose v2, disponible como `docker compose`.
- Puertos libres: `80`, `3000`, `5672`, `8001` a `8005` y `15672`.
- Al menos 4 GB de memoria disponibles para Docker.

No es necesario instalar Python, Node.js, PostgreSQL ni RabbitMQ en el equipo anfitrión.

## Ejecución completa

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Consultar el estado de los 13 contenedores:

```bash
docker compose ps
```

Cuando las APIs y el gateway indiquen `healthy`, abrir:

- Aplicación: <http://localhost:3000>
- Gateway: <http://localhost/health>
- RabbitMQ Management: <http://localhost:15672>

Credenciales de RabbitMQ para desarrollo:

```text
Usuario: admin
Clave:   admin123
```

Para detener la solución conservando los datos:

```bash
docker compose down
```

Para reconstruir después de un cambio de código:

```bash
docker compose up -d --build
```

## Usuarios de demostración

| Usuario | Contraseña | Rol | Sección principal |
| --- | --- | --- | --- |
| `secretaria` | `secretaria123` | Académico | Estudiantes y matrículas |
| `finanzas` | `finanzas123` | Finanzas | Pagos |
| `docente` | `docente123` | Docente | Asistencia e incidencias |
| `director` | `director123` | Director | Dashboard y resiliencia |
| `admin` | `admin123` | Administrador | Acceso global |

Las credenciales y el secreto JWT incluidos en `docker-compose.yml` son exclusivamente para desarrollo y demostración.

## Flujo funcional recomendado

1. Ingresar como `secretaria`.
2. Crear un estudiante en uno de los colegios permitidos.
3. Matricularlo; esto genera el evento `StudentEnrolled`.
4. Ingresar como `finanzas`.
5. Crear un pago para el estudiante matriculado y confirmarlo.
6. Verificar que Academic actualizó su estado financiero y Notification creó una notificación.
7. Ingresar como `docente` y registrar asistencia o una incidencia.
8. Ingresar como `director` para revisar métricas, salud, DLQ y trazabilidad.

Payment solo permite operar sobre estudiantes con matrícula activa y obtiene el nombre y colegio desde Academic. Attendance aplica la misma validación y no confía en nombres o colegios enviados manualmente por el cliente.

## Eventos y consistencia

El exchange principal es `campusconnect.events`. Los eventos usan claves como `campusconnect.paymentconfirmed` y un contrato común:

```json
{
  "eventId": "uuid-unico",
  "eventType": "PaymentConfirmed",
  "occurredAt": "2026-07-15T12:00:00Z",
  "correlationId": "corr-...",
  "studentId": "uuid-del-estudiante",
  "schoolId": "SCH-GOTITAS"
}
```

Eventos implementados:

- `StudentEnrolled`
- `PaymentCreated`
- `PaymentConfirmed`
- `AttendanceRecorded`
- `IncidentReported`
- `NotificationSent`
- `NotificationFailed`

Colas principales:

| Cola | Consumidor | Enrutamiento |
| --- | --- | --- |
| `q.academic.payments` | Academic | `PaymentConfirmed` |
| `q.notification` | Notification | Eventos que generan notificación |
| `q.analytics` | Analytics | Todos los eventos |

## Mecanismos de resiliencia

### Outbox transaccional

Academic, Payment, Attendance y Notification guardan el cambio de negocio y su evento Outbox en la misma transacción. Un publicador de fondo entrega los eventos pendientes a RabbitMQ y reintenta con espera incremental si el broker no está disponible.

Esto evita confirmar una operación de negocio y perder su evento por una caída entre la base de datos y RabbitMQ.

### Consumidores idempotentes

Los consumidores registran cada `eventId` en `processed_events`. Si RabbitMQ vuelve a entregar el mismo evento, el servicio lo reconoce y no repite el efecto de negocio. Las claves únicas del Outbox también impiden encolar dos veces el mismo evento lógico.

### Reintentos y DLQ

Los consumidores validan el contrato del evento y realizan hasta 3 intentos. Si el error continúa, publican un mensaje persistente en su DLQ con el contador y la causa del fallo.

- `q.academic.payments.dlq`
- `q.notification.dlq`
- `q.analytics.dlq`

Notification expone el estado y el reprocesamiento seguro de su DLQ:

- `GET /dlq/status`
- `POST /dlq/replay?limit=100`

Estas operaciones requieren rol `director` o `admin` y también están disponibles visualmente en el Dashboard Directivo.

### Trazabilidad

El `correlationId` se conserva en toda la cadena. Analytics registra los eventos procesados y permite consultar los más recientes o filtrar por correlación mediante `GET /events`.

### Health checks reales

Cada API comprueba PostgreSQL y RabbitMQ. Los servicios productores también informan el número de eventos Outbox pendientes. Si una dependencia no está disponible, `/health` responde `503` y estado `degraded`.

## Demostración 1: caída y recuperación sin pérdida

Esta prueba demuestra que una caída de Notification no bloquea el pago ni pierde eventos.

1. Tener un estudiante con matrícula activa.
2. Detener Notification:

   ```bash
   docker compose stop notification-service
   ```

3. Ingresar como `finanzas`, crear un pago y confirmarlo.
4. Comprobar que los eventos quedaron retenidos y no hay consumidor:

   ```bash
   docker exec cc360-rabbitmq rabbitmqctl list_queues name messages consumers
   ```

   `q.notification` debe mostrar mensajes pendientes y `0` consumidores. Academic y Analytics pueden continuar procesando el pago.

5. Reiniciar Notification:

   ```bash
   docker compose start notification-service
   ```

6. Volver a consultar las colas. `q.notification` debe quedar en `0` y recuperar `1` consumidor.
7. Verificar en la aplicación que existe una sola notificación `PaymentConfirmed` y que el pago continúa confirmado.

## Demostración 2: reintentos, DLQ y reprocesamiento

Esta prueba mantiene vivo el consumidor, pero hace fallar temporalmente su persistencia.

1. Detener únicamente la base de Notification:

   ```bash
   docker compose stop db-notification
   ```

2. Ingresar como `docente` y reportar una nueva incidencia.
3. Consultar los logs y las colas:

   ```bash
   docker compose logs --tail=100 notification-service
   docker exec cc360-rabbitmq rabbitmqctl list_queues name messages consumers
   ```

   Los logs muestran los reintentos y `q.notification.dlq` conserva el evento después del tercer intento.

4. Restaurar la base:

   ```bash
   docker compose start db-notification
   ```

5. Esperar que `http://localhost:8003/health` vuelva a indicar `ok`.
6. Ingresar como `director`, abrir el Dashboard y seleccionar **Reprocesar eventos de la DLQ**.
7. Comprobar que la DLQ queda en cero, aparece una sola notificación de la incidencia y la trazabilidad conserva el mismo `correlationId`.

## APIs y documentación interactiva

| Servicio | Swagger UI | Ruta a través del gateway |
| --- | --- | --- |
| Academic | <http://localhost:8001/docs> | `/api/academic/` |
| Payment | <http://localhost:8002/docs> | `/api/payments/` |
| Notification | <http://localhost:8003/docs> | `/api/notifications/` |
| Attendance | <http://localhost:8004/docs> | `/api/attendance/` |
| Analytics | <http://localhost:8005/docs> | `/api/analytics/` |

Los endpoints de negocio requieren `Authorization: Bearer <token>`. Cada servicio dispone de `/auth/login` y comparte el mismo secreto JWT en el entorno Docker de demostración.

## Verificación técnica

Validar la configuración de Compose:

```bash
docker compose config --quiet
```

Validar Python dentro de los servicios:

```bash
docker compose exec academic-service python -m compileall app
docker compose exec payment-service python -m compileall app
docker compose exec notification-service python -m compileall app
docker compose exec attendance-service python -m compileall app
docker compose exec analytics-service python -m compileall app
```

Validar el frontend:

```bash
docker compose exec frontend npm run lint
```

Consultar logs generales o de un componente:

```bash
docker compose logs --tail=100
docker compose logs -f payment-service
```

## Estructura del repositorio

```text
academic-service/      Estudiantes, matrículas y consumidor de pagos
payment-service/       Pagos y validación contra Academic
notification-service/ Notificaciones, reintentos, DLQ y replay
attendance-service/   Asistencia e incidencias
analytics-service/    Métricas y trazabilidad
frontend/             Aplicación React por roles
gateway/              Configuración de NGINX
docker-compose.yml     Orquestación completa
```

Cada backend mantiene una organización directa: `api`, `services`, `repositories`, `models`, `schemas` y `events`. La lógica de resiliencia está aislada en `events` y `health.py` para no complicar los casos de uso existentes.

## Datos persistentes y reinicio limpio

Los datos se conservan en volúmenes Docker aunque se ejecute `docker compose down`.

Para eliminar **todos** los datos locales, las colas y recrear el entorno desde cero:

```bash
docker compose down -v
docker compose up -d --build
```

`down -v` es destructivo y solo debe utilizarse cuando se quiera reiniciar completamente la demostración.

## Consideraciones de despliegue

La configuración incluida prioriza una ejecución local clara y demostrable. Antes de un despliegue real se deben mover secretos y credenciales a un gestor seguro, habilitar HTTPS, restringir los puertos directos de los microservicios y sustituir los usuarios de demostración por un proveedor de identidad. El envío de notificaciones actual es una simulación persistida; la integración con correo, SMS o mensajería externa queda fuera del alcance implementado.
