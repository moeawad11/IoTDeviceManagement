# IoT Device Management Platform

A full-stack IoT device management platform built with NestJS, React, PostgreSQL, and AWS IoT Core. Devices connect securely via MQTT over TLS and publish status, heartbeat, and event messages that are processed in real-time by the backend and reflected in the frontend dashboard.

---

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Backend   | NestJS 11 + TypeORM                          |
| Frontend  | React 19 + Vite + Tailwind CSS + React Query |
| Database  | PostgreSQL 16                                |
| Messaging | AWS IoT Core (MQTT over TLS, port 8883)      |
| Container | Docker + Docker Compose                      |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- An AWS account with IoT Core enabled
- AWS IoT Core Thing created and certificate files downloaded (see setup below)

---

## AWS IoT Core Setup

Before running the project, you need to create an IoT Thing and attach a policy.

### 1. Create a Thing

1. Go to **AWS Console → IoT Core → Manage → Things → Create thing**
2. Name it `iotdevmgmt-backend`
3. Select **Auto-generate a new certificate**
4. Download all three files:
   - `private.pem.key`
   - `certificate.pem.crt`
   - `AmazonRootCA1.pem` (download from [Amazon Trust Services](https://www.amazontrust.com/repository/AmazonRootCA1.pem))
5. Place them in the `certs/` directory:

```
certs/
  ├── private.pem.key
  ├── certificate.pem.crt
  └── AmazonRootCA1.pem
```

### 2. Create and Attach an IoT Policy

Go to **IoT Core → Security → Policies → Create policy** and use this JSON (replace `REGION` and `ACCOUNT_ID`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:client/iotdevmgmt-backend"
    },
    {
      "Effect": "Allow",
      "Action": ["iot:Publish", "iot:Receive"],
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topic/devices/*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topicfilter/devices/*"
    }
  ]
}
```

Attach this policy to the certificate under **Certificates → Select cert → Attach policies**.

### 3. Find Your Endpoint

Go to **IoT Core → Settings** and copy your endpoint (e.g. `xxxxx-ats.iot.us-east-1.amazonaws.com`).

---

## Installation & Running

### 1. Clone the repository

```bash
git clone <repo-url>
cd IoTDeviceManagement
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your AWS IoT Core endpoint:

```env
AWS_IOT_ENDPOINT=xxxxx-ats.iot.us-east-1.amazonaws.com
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=iotdb
VITE_TENANT_ID=tenant-3
```

### 3. Start the stack

```bash
docker compose up -d --build
```

This starts two services:

- **postgres** — PostgreSQL 16 database
- **backend** — NestJS API server (connects to AWS IoT Core on startup)
- **frontend** — React app served by Nginx

### 4. Verify everything is running

```bash
docker compose ps
```

```bash
docker compose logs backend -f
```

You should see:

```
[NestApplication] Nest application successfully started
Application running on port 3000
Connected to AWS IoT Core at xxxxx-ats.iot.us-east-1.amazonaws.com
Subscribed to: devices/+/status, devices/+/events, devices/+/heartbeat
```

| Service      | URL                            |
| ------------ | ------------------------------ |
| Frontend     | http://localhost:5000          |
| Backend API  | http://localhost:3000          |
| Swagger Docs | http://localhost:3000/api/docs |
| Health Check | http://localhost:3000/health   |

### 5. (Optional) Load seed data

```bash
docker compose exec postgres psql -U postgres -d iotdb < backend/seeds/seed-devices.sql
```

This loads 35 sample devices (25 for `tenant-3`, 10 for `tenant-1`).

---

## API Overview

All device endpoints require the `x-tenant-id` header for tenant isolation.

| Method | Path                  | Description                                    |
| ------ | --------------------- | ---------------------------------------------- |
| GET    | `/health`             | Health check                                   |
| POST   | `/devices`            | Create a device                                |
| GET    | `/devices`            | List devices (paginated, filterable by status) |
| GET    | `/devices/:id`        | Get device by ID                               |
| PATCH  | `/devices/:id/status` | Update device status                           |
| DELETE | `/devices/:id`        | Delete a device                                |

**Example:**

```bash
curl -X POST http://localhost:3000/devices \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-3" \
  -d '{"name":"Door Sensor A1","serialNumber":"SENSOR-001","type":"SENSOR","tenantId":"tenant-3"}'
```

---

## Running Tests

```bash
cd backend
npm install
npm run test
```

---

## Architecture: How Devices Publish Events and Receive Commands

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        IoT Device                               │
│   (Smart lock, sensor, gateway, etc.)                           │
│                                                                 │
│   Connects via MQTT over TLS (port 8883)                        │
│   Authenticated with X.509 device certificate                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  PUBLISH: devices/{serialNumber}/status
                           │  PUBLISH: devices/{serialNumber}/events
                           │  PUBLISH: devices/{serialNumber}/heartbeat
                           │  SUBSCRIBE: devices/{serialNumber}/commands
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AWS IoT Core                                │
│                                                                 │
│   - Validates client certificate (mutual TLS)                   │
│   - Enforces IoT policy (Connect / Publish / Subscribe)         │
│   - Routes messages to all subscribers                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │  Broker forwards messages
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NestJS Backend (MqttService)                   │
│                                                                 │
│   SUBSCRIBED TOPICS:                                            │
│   devices/+/status    → handleStatusUpdate()                    │
│                          updates device.status in PostgreSQL    │
│                                                                 │
│   devices/+/heartbeat → handleHeartbeat()                       │
│                          marks device ONLINE, updates lastSeenAt│
│                                                                 │
│   devices/+/events    → handleDeviceEvent()                     │
│                          logs event (future: persist + alert)   │
│                                                                 │
│   PUBLISHES:                                                    │
│   devices/{sn}/commands → sends remote commands to devices      │
└──────────────────────────┬──────────────────────────────────────┘
                           │  TypeORM writes
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                              │
│                   devices table                                 │
│   id, name, serialNumber, type, status, tenantId, lastSeenAt   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  REST API (React Query polling)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  React Frontend                                 │
│   Displays device list with status, type, last seen            │
│   Filters by status, paginates results                         │
└─────────────────────────────────────────────────────────────────┘
```

### MQTT Topic Structure

| Topic                              | Direction        | Purpose                                      |
| ---------------------------------- | ---------------- | -------------------------------------------- |
| `devices/{serialNumber}/status`    | Device → Backend | Device reports its status (ONLINE / OFFLINE) |
| `devices/{serialNumber}/heartbeat` | Device → Backend | Keepalive ping — marks device ONLINE         |
| `devices/{serialNumber}/events`    | Device → Backend | Access events (door open, card scan, etc.)   |
| `devices/{serialNumber}/commands`  | Backend → Device | Remote commands (lock, unlock, reboot)       |

### Example Payloads

**Status update** (`devices/SENSOR-001/status`):

```json
{ "status": "ONLINE", "tenantId": "tenant-3" }
```

**Heartbeat** (`devices/SENSOR-001/heartbeat`):

```json
{ "tenantId": "tenant-3" }
```

**Access event** (`devices/LOCK-001/events`):

```json
{
  "eventType": "ACCESS_GRANTED",
  "timestamp": "2026-05-10T14:00:00Z",
  "tenantId": "tenant-3",
  "payload": { "doorId": "door-1", "userId": "user-42", "method": "CARD" }
}
```

**Backend command** (`devices/LOCK-001/commands`):

```json
{ "action": "LOCK_DOOR", "payload": { "doorId": "door-1" } }
```

---

### Last Will & Testament (LWT) — Automatic Offline Detection

When a device connects to AWS IoT Core, it sets a **Last Will** message. If the device disconnects unexpectedly (power loss, network drop, crash), the broker automatically publishes the will — no device code needed for the OFFLINE transition.

**Flow:**

1. Device connects with LWT set to publish `{"status":"OFFLINE","tenantId":"tenant-3"}` to `devices/{serialNumber}/status`
2. Device is alive → sends periodic heartbeats → backend marks it `ONLINE`
3. Device loses connection → AWS IoT Core detects keepalive timeout
4. IoT Core publishes the LWT message automatically
5. `MqttService.handleStatusUpdate()` receives it → database updated to `OFFLINE`

**Device connection example (Node.js):**

```javascript
const mqtt = require("mqtt");
const fs = require("fs");

const client = mqtt.connect(
  "mqtts://xxxxx-ats.iot.us-east-1.amazonaws.com:8883",
  {
    key: fs.readFileSync("./certs/private.pem.key"),
    cert: fs.readFileSync("./certs/certificate.pem.crt"),
    ca: fs.readFileSync("./certs/AmazonRootCA1.pem"),
    clientId: "SENSOR-001",
    will: {
      topic: "devices/SENSOR-001/status",
      payload: JSON.stringify({ status: "OFFLINE", tenantId: "tenant-3" }),
      qos: 1,
      retain: true,
    },
  },
);

client.on("connect", () => {
  // Mark device online
  client.publish(
    "devices/SENSOR-001/status",
    JSON.stringify({ status: "ONLINE", tenantId: "tenant-3" }),
    { qos: 1 },
  );

  // Send heartbeat every 30 seconds
  setInterval(() => {
    client.publish(
      "devices/SENSOR-001/heartbeat",
      JSON.stringify({ tenantId: "tenant-3" }),
      { qos: 0 },
    );
  }, 30000);

  // Listen for commands
  client.subscribe("devices/SENSOR-001/commands", { qos: 1 });
});

client.on("message", (topic, payload) => {
  const command = JSON.parse(payload.toString());
  console.log("Received command:", command);
  // Execute command on device hardware
});
```

---

## Design Decisions

- **Mutual TLS** — Each device uses a unique X.509 certificate. A compromised device can be revoked without affecting others.
- **Tenant isolation** — The `x-tenant-id` header is enforced by middleware on all `/devices` routes. In production this would be extracted from a JWT claim.
- **`synchronize: true`** — Used in development for convenience. In production, use TypeORM migrations.
- **React Query** — Handles caching and background refetching. The API layer (`src/api/devices.ts`) is kept separate from UI components.
- **`lastSeenAt`** — Updated only on heartbeat or ONLINE status transitions.

## What I Would Add With More Time

- JWT authentication with role-based access control (RBAC)
- Device event persistence table (audit log for all MQTT events)
- WebSocket gateway to push real-time status updates to the React frontend
- Redis caching for frequently queried device lists
- TypeORM migrations instead of `synchronize: true`
- GitHub Actions CI/CD pipeline (lint → test → build → push Docker image)
- Prometheus + Grafana for metrics and alerting
- AWS IoT Core Device Shadow for offline state caching

| Layer     | Technology                                |
| --------- | ----------------------------------------- |
| Backend   | NestJS + TypeORM                          |
| Frontend  | React + Vite + Tailwind CSS + React Query |
| Database  | PostgreSQL 16                             |
| Messaging | MQTT (Mosquitto broker)                   |
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
| Frontend     | http://localhost:5000          |
| Backend API  | http://localhost:3000          |
| Swagger Docs | http://localhost:3000/api/docs |
| MQTT Broker  | mqtt://localhost:1883          |

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

## Architecture: IoT + MQTT Design

### How It Works

```
[IoT Device (ESP32 / Gateway / Sensor)]
        |
        | publishes MQTT message
        v
[Mosquitto Broker]  ←→  (AWS IoT Core in production)
        |
        | NestJS subscribes
        v
[NestJS MqttService]
  - devices/+/status    → updateStatus() in DevicesService
  - devices/+/events    → log event, trigger alerts (future)
  - devices/+/heartbeat → mark device ONLINE, update lastSeenAt
        |
        v
[PostgreSQL — Device table updated]
        |
        v
[React Frontend — React Query polls/refetches updated data]
```

### MQTT Topic Structure

| Topic                              | Direction        | Purpose                                    |
| ---------------------------------- | ---------------- | ------------------------------------------ |
| `devices/{serialNumber}/status`    | Device → Backend | Device reports status change               |
| `devices/{serialNumber}/events`    | Device → Backend | Access events (door open, card scan, etc.) |
| `devices/{serialNumber}/heartbeat` | Device → Backend | Keepalive ping (marks device ONLINE)       |
| `devices/{serialNumber}/commands`  | Backend → Device | Remote commands (lock, unlock, reboot)     |

### Example Payloads

**Device status update** (`devices/ESP32-001/status`):

```json
{
  "status": "ONLINE",
  "tenantId": "tenant-abc"
}
```

**Device event** (`devices/ESP32-001/events`):

```json
{
  "eventType": "ACCESS_GRANTED",
  "timestamp": "2026-05-07T10:30:00Z",
  "tenantId": "tenant-abc",
  "payload": {
    "doorId": "door-123",
    "userId": "user-789",
    "method": "CARD"
  }
}
```

**Backend command** (`devices/ESP32-001/commands`):

```json
{
  "action": "LOCK_DOOR",
  "payload": { "doorId": "door-123" }
}
```

### Simulating a Device (Testing)

Install `mosquitto-clients` or use any MQTT client, then publish:

```bash
# Simulate device going ONLINE
mosquitto_pub -h localhost -p 1883 \
  -t "devices/ESP32-001/status" \
  -m '{"status":"ONLINE","tenantId":"tenant-3"}'

# Simulate a heartbeat
mosquitto_pub -h localhost -p 1883 \
  -t "devices/ESP32-001/heartbeat" \
  -m '{"tenantId":"tenant-3"}'

# Simulate an access event
mosquitto_pub -h localhost -p 1883 \
  -t "devices/ESP32-001/events" \
  -m '{"eventType":"ACCESS_GRANTED","timestamp":"2026-05-09T10:00:00Z","tenantId":"tenant-3","payload":{"doorId":"door-1","userId":"user-42","method":"CARD"}}'
```

### Device Implementation: Last Will & Testament (LWT)

When a device connects to the MQTT broker, it should configure a **Last Will** message. If the device loses connection unexpectedly (network drop, crash, power loss), the broker automatically publishes the will message, marking the device as OFFLINE without waiting for the device to send a final message.

**How LWT works in your system:**

1. Device connects with LWT set to publish `{"status":"OFFLINE","tenantId":"tenant-3"}` to `devices/{serialNumber}/status`
2. Device alive → sends heartbeats → backend sees ONLINE
3. Device loses connection → broker detects disconnection
4. Broker publishes LWT message automatically
5. NestJS `MqttService.handleStatusUpdate()` receives OFFLINE status
6. Database updates device to OFFLINE without device sending anything

**MQTT Client Example (Node.js):**

```javascript
const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883", {
  clientId: "SENSOR-001",
  will: {
    topic: "devices/SENSOR-001/status",
    payload: JSON.stringify({
      status: "OFFLINE",
      tenantId: "tenant-3",
    }),
    qos: 1,
    retain: true,
  },
});

client.on("connect", () => {
  console.log("Connected to MQTT broker");

  // Send heartbeat every 10 seconds
  setInterval(() => {
    client.publish(
      "devices/SENSOR-001/heartbeat",
      JSON.stringify({ tenantId: "tenant-3" }),
      { qos: 1 },
    );
  }, 10000);
});
```

**Backend automatically handles LWT:**

Your existing `handleStatusUpdate()` method processes LWT like any other message:

```typescript
// When broker publishes the LWT message:
// Topic: devices/SENSOR-001/status
// Payload: {"status":"OFFLINE","tenantId":"tenant-3"}

// MqttService receives it and updates the database
await this.devicesService.updateStatus(device.id, tenantId, {
  status: "OFFLINE",
});
```

**Best practices:**

- ✅ Always set LWT when connecting
- ✅ Use `qos: 1` for LWT (ensures delivery)
- ✅ Set `retain: true` so new subscribers get the last status
- ✅ Keep LWT payload same format as regular status messages
- ✅ Set reasonable `keepalive` timeout to detect disconnections faster

---

### Production: AWS IoT Core

For production, **AWS IoT Core** replaces local Mosquitto with these advantages:

| Feature             | Mosquitto (Dev)      | AWS IoT Core (Prod)                |
| ------------------- | -------------------- | ---------------------------------- |
| Security            | Anonymous / password | Mutual TLS (device certificates)   |
| Device provisioning | Manual               | Just-in-Time Registration (JITR)   |
| Scalability         | Single broker        | Managed, auto-scaled               |
| Integration         | Manual               | Lambda, DynamoDB, S3, Kinesis, SNS |
| Device shadows      | ❌                   | ✅ Cached device state             |
| Cost                | Free                 | Free tier → pay per message        |

**AWS IoT Core connection flow:**

1. Device is provisioned with a unique X.509 certificate
2. Device connects to `xxxxxx-ats.iot.region.amazonaws.com:8883` with mutual TLS
3. IoT Core routes messages via **Rules Engine** → Lambda or direct DB writes
4. NestJS backend subscribes via IoT Core SDK or receives events via SQS/Lambda
5. Offline devices: IoT Core's Device Shadow stores last known state

---

## Design Decisions & Trade-offs

- **`synchronize: true`** is used in development for convenience. In production, use TypeORM migrations.
- **Tenant isolation** is done via the `x-tenant-id` header middleware. In production this would be extracted from a JWT claim.
- **`lastSeenAt`** is only updated when status transitions to `ONLINE`.
- The frontend uses React Query for caching and background refetching, keeping the API layer (`src/api/devices.ts`) separate from UI components.

## What I Would Add With More Time

- JWT authentication with role-based access control (RBAC)
- Redis for caching frequently queried device lists
- GitHub Actions CI/CD pipeline (lint → test → build → push Docker image)
- Database migrations instead of `synchronize: true`
- Monitoring with Prometheus + Grafana
- MQTT over TLS (port 8883) with client certificates
- Device event persistence table (audit log)
- WebSocket gateway to push real-time status updates to React frontend
