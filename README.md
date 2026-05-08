# IoT Device Management Platform

A full-stack IoT device management platform built with NestJS, React, PostgreSQL, and Docker.

## Tech Stack

| Layer     | Technology                                |
| --------- | ----------------------------------------- |
| Backend   | NestJS + TypeORM                          |
| Frontend  | React + Vite + Tailwind CSS + React Query |
| Database  | PostgreSQL 16                             |
| Container | Docker + Docker Compose                   |

---

## Running the Application

### With Docker (recommended)

```bash
# From project root
docker compose up --build
```

| Service      | URL                            |
| ------------ | ------------------------------ |
| Frontend     | http://localhost               |
| Backend API  | http://localhost:3000          |
| Swagger Docs | http://localhost:3000/api/docs |

### Running locally (development)

**Backend:**

```bash
cd backend
cp .env.local .env
npm install
npm run start:dev
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

> Requires a running PostgreSQL instance. Update `.env` with your DB credentials.

---

## API Overview

All device endpoints require the `x-tenant-id` header (tenant isolation middleware).

| Method | Path                  | Description                                    |
| ------ | --------------------- | ---------------------------------------------- |
| POST   | `/devices`            | Create a device                                |
| GET    | `/devices`            | List devices (paginated, filterable by status) |
| GET    | `/devices/:id`        | Get device by ID                               |
| PATCH  | `/devices/:id/status` | Update device status                           |
| DELETE | `/devices/:id`        | Delete a device                                |

**Example request:**

```bash
curl -X POST http://localhost:3000/devices \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-abc" \
  -d '{"name":"Door Sensor A1","serialNumber":"ESP32-001","type":"ESP32","tenantId":"tenant-abc"}'
```

---

## Running Tests

```bash
cd backend
npm run test
```

---

## Architecture: IoT Device Event Flow

```
[IoT Device] --MQTT--> [MQTT Broker (e.g. Mosquitto / AWS IoT Core)]
                              |
                              v
                      [NestJS Backend]
                      - Subscribes to device topics
                      - Validates + persists events
                      - Updates device status / lastSeenAt
                              |
                              v
                      [PostgreSQL DB]
```

**MQTT Topic Structure:**

```
devices/{tenantId}/{serialNumber}/events     # device → cloud (telemetry/events)
devices/{tenantId}/{serialNumber}/commands   # cloud → device (commands)
devices/{tenantId}/{serialNumber}/status     # heartbeat / online-offline
```

**Example device event:**

```json
{
  "deviceSerialNumber": "ESP32-001",
  "eventType": "ACCESS_GRANTED",
  "timestamp": "2026-05-07T10:30:00Z",
  "payload": {
    "doorId": "door-123",
    "userId": "user-789",
    "method": "CARD"
  }
}
```

---

## Design Decisions & Trade-offs

- **`synchronize: true`** is used in development for convenience. In production, use TypeORM migrations.
- **Tenant isolation** is done via the `x-tenant-id` header middleware. In production this would be extracted from a JWT claim.
- **`lastSeenAt`** is only updated when status transitions to `ONLINE`.
- The frontend uses React Query for caching and background refetching, keeping the API layer (`src/api/devices.ts`) separate from UI components.

## What I Would Add With More Time

- JWT authentication with role-based access control (RBAC)
- MQTT broker integration (Mosquitto or AWS IoT Core) with NestJS subscriber
- Redis for caching frequently queried device lists
- GitHub Actions CI/CD pipeline (lint → test → build → push Docker image)
- Database migrations instead of `synchronize: true`
- End-to-end tests with Playwright
- Monitoring with Prometheus + Grafana
