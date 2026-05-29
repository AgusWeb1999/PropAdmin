# PropAdmin — Arquitectura del Sistema

## Visión General

PropAdmin es una plataforma SaaS multi-tenant para administradoras de edificios
en Uruguay y Latam. Cada empresa administradora opera en un tenant aislado,
gestionando sus propios edificios, residentes y finanzas.

---

## Stack Tecnológico

| Capa         | Tecnología                          |
|--------------|-------------------------------------|
| Frontend     | Next.js 14 + React + TailwindCSS + shadcn/ui |
| Backend      | Node.js + Express.js + TypeScript   |
| ORM          | Prisma                              |
| Base de datos| PostgreSQL 16                       |
| Auth         | JWT (access + refresh tokens)       |
| PDF          | pdfkit                              |
| Email        | Nodemailer                          |
| Deploy       | Render / Vercel / Docker            |

---

## Estructura de Carpetas

```
propadmin/
├── apps/
│   ├── api/                    # Backend Express
│   │   ├── src/
│   │   │   ├── config/         # Configuración (env, constants)
│   │   │   ├── middleware/     # Auth, RBAC, error, tenant
│   │   │   ├── modules/        # Módulos por dominio
│   │   │   │   ├── auth/
│   │   │   │   ├── buildings/
│   │   │   │   ├── apartments/
│   │   │   │   ├── residents/
│   │   │   │   ├── expenses/
│   │   │   │   ├── payments/
│   │   │   │   ├── reservations/
│   │   │   │   ├── maintenance/
│   │   │   │   ├── dashboard/
│   │   │   │   └── documents/
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma
│   │   │   │   ├── client.ts
│   │   │   │   └── seed.ts
│   │   │   ├── utils/          # PDF, intereses, emails
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # Frontend Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/     # Login, registro
│       │   │   └── (dashboard)/# Área autenticada
│       │   │       ├── layout.tsx
│       │   │       ├── page.tsx          # Dashboard
│       │   │       ├── edificios/
│       │   │       ├── apartamentos/
│       │   │       ├── gastos/
│       │   │       ├── pagos/
│       │   │       ├── morosos/
│       │   │       ├── reservas/
│       │   │       ├── mantenimiento/
│       │   │       └── documentos/
│       │   ├── components/
│       │   │   ├── layout/     # Sidebar, Header
│       │   │   ├── dashboard/  # Stats, charts
│       │   │   ├── buildings/  # Cards, forms
│       │   │   └── ui/         # Componentes base
│       │   ├── hooks/          # useAuth, useBuildings, etc.
│       │   └── lib/            # api.ts, auth.ts, utils
│       ├── Dockerfile
│       ├── package.json
│       └── tailwind.config.ts
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── ARCHITECTURE.md
└── ROADMAP.md
```

---

## Estrategia Multi-Tenant

### Aislamiento por company_id

Cada fila en todas las tablas principales lleva `company_id`. El JWT incluye:
```json
{ "userId": "...", "companyId": "...", "role": "COMPANY_ADMIN" }
```

El middleware `tenant` extrae `companyId` del token y lo inyecta en `req.companyId`.
Cada servicio filtra **siempre** por `companyId` — nunca datos cruzados entre empresas.

### Roles del Sistema

| Rol              | Descripción                                   |
|------------------|-----------------------------------------------|
| `SUPER_ADMIN`    | Anthropic/Producto — acceso total             |
| `COMPANY_ADMIN`  | Dueño de la administradora — todo su tenant   |
| `EMPLOYEE`       | Empleado — operaciones sin configuración      |
| `RESIDENT`       | Residente — portal propio (deuda, reservas)   |

---

## Módulos del Sistema

### financial/
- `expenses` — Gastos del edificio (UTE, OSE, limpieza, etc.)
- `charges` — Deudas por apartamento generadas desde gastos
- `payments` — Pagos registrados contra deudas

### buildings/
- `buildings` — Edificios de la empresa
- `apartments` — Unidades/apartamentos
- `common_areas` — Áreas comunes para reservas

### residents/
- `residents` — Propietarios e inquilinos
- Vinculados a apartamento + user (portal)

### reservations/
- `reservations` — Reservas de áreas comunes con calendario

### maintenance/
- `maintenance_tasks` — Tareas preventivas y correctivas

### communications/
- `announcements` — Anuncios por edificio
- `notifications` — Notificaciones push/email

### documents/
- `documents` — Repositorio de archivos (reglamentos, actas)

### security/
- Futuro: acceso, visitas, paquetería

---

## Flujo de Gastos Comunes

```
1. Admin ingresa gastos del mes (UTE $1200, OSE $400, Limpieza $800)
2. Sistema suma total: $2400
3. Por cada apartamento: cargo = $2400 × (coef_apt / sum_coef_total)
4. Se generan Charges con dueDate = día 10 del mes siguiente
5. Resident ve su deuda en el portal
6. Admin registra pago → Charge.status = PAID
7. Si pasa dueDate → Charge.status = OVERDUE → se calculan intereses
```

---

## Cálculo de Intereses

```
diasVencidos = hoy - dueDate
interes = monto × tasaMensual × (diasVencidos / 30)
totalDeuda = monto + interes
```

Tasa configurable por edificio (default: 3% mensual).

---

## API Design

Base URL: `https://api.propadmin.com/api/v1`

### Convenciones
- Autenticación: `Authorization: Bearer <token>`
- Respuesta exitosa: `{ success: true, data: {...} }`
- Error: `{ success: false, error: "mensaje", code: "ERROR_CODE" }`
- Paginación: `?page=1&limit=20`
- Soft delete: nunca DELETE real, solo `deletedAt = now()`
- Todos los endpoints filtran por `companyId` del token

---

## Seguridad

- Passwords: bcrypt (salt rounds: 12)
- JWT: access token 15min + refresh token 7 días
- Rate limiting: 100 req/min por IP
- Helmet.js para headers de seguridad
- CORS configurado por dominio
- Validación con Zod en todos los endpoints
- Logs de auditoría en operaciones financieras

---

## Deploy Recomendado

### Render.com (recomendado para MVP)
- Backend: Web Service (Node.js)
- Frontend: Static Site (Next.js export) o Web Service
- Base de datos: PostgreSQL managed
- Variables de entorno en dashboard de Render

### Vercel + Render
- Frontend en Vercel (gratis, CDN global)
- Backend en Render Web Service
- PostgreSQL en Render o Supabase

### Docker (self-hosted)
```bash
docker-compose up -d
```

---

## Estrategia SaaS / Pricing

### Planes sugeridos para Uruguay/Latam

| Plan          | Precio/mes | Edificios | Usuarios | Funcionalidades     |
|---------------|------------|-----------|----------|---------------------|
| Starter       | USD 29     | 1         | 3        | MVP completo        |
| Basic         | USD 79     | 5         | 10       | + Documentos        |
| Professional  | USD 149    | 20        | 30       | + Portal residente  |
| Enterprise    | Consultar  | Ilimitado | Ilimitado| + API + Soporte     |

### Monetización adicional
- Setup fee inicial por empresa
- Módulo SMS/WhatsApp (addon)
- Almacenamiento extra (addon)
- White-label para grandes administradoras
