# PropAdmin — Roadmap de Desarrollo

## Fase 1 — MVP (semanas 1-8)

### Sprint 1-2: Fundación (sem 1-2)
- [x] Arquitectura del sistema
- [x] Prisma schema completo
- [x] Express server + middleware
- [x] Autenticación JWT (login, register, refresh)
- [x] Estructura Next.js + Tailwind

### Sprint 3-4: Core edificios (sem 3-4)
- [ ] CRUD edificios
- [ ] CRUD apartamentos con coeficientes
- [ ] CRUD residentes (propietarios e inquilinos)
- [ ] Formularios con validación en el frontend

### Sprint 5-6: Finanzas (sem 5-6)
- [ ] Ingreso de gastos mensuales
- [ ] Generación automática de expensas por coeficiente
- [ ] Registro de pagos
- [ ] Detección y cálculo de intereses por mora
- [ ] Generación de PDFs (recibos, estados de cuenta)

### Sprint 7-8: Dashboard + Pulido (sem 7-8)
- [ ] Dashboard con gráficos de recaudación
- [ ] Listado de morosos con deuda detallada
- [ ] Sistema de reservas (salones, barbacoa)
- [ ] QA, testing, correcciones
- [ ] Deploy en Render/Vercel

**Entregable Fase 1:** Producto funcional vendible. USD 29-79/mes.

---

## Fase 2 — Funcionalidades Avanzadas (semanas 9-16)

### Sprint 9-10: Portal del residente
- [ ] App web responsive para residentes
- [ ] Ver estado de cuenta personal
- [ ] Descargar recibos en PDF
- [ ] Ver comunicados del edificio
- [ ] Hacer reservas de áreas comunes

### Sprint 11-12: Comunicaciones
- [ ] Sistema de anuncios por edificio
- [ ] Notificaciones por email (vencimientos, confirmaciones)
- [ ] Panel de comunicados con rich text

### Sprint 13-14: Documentos + Proveedores
- [ ] Repositorio de documentos por empresa/edificio
- [ ] Upload de PDFs, imágenes
- [ ] CRUD de proveedores
- [ ] Historial de servicios por proveedor

### Sprint 15-16: Mantenimiento
- [ ] Tareas preventivas y correctivas
- [ ] Alertas de mantenimiento próximo
- [ ] Historial por equipo/instalación
- [ ] Costos por tarea

**Entregable Fase 2:** Portal residente activo. Plan Professional USD 149/mes.

---

## Fase 3 — Premium (semanas 17-24)

### Módulo de Control de Acceso
- [ ] Registro de visitas
- [ ] QR para residentes
- [ ] Control de entradas/salidas
- [ ] Paquetería y correspondencia

### Módulo de Votaciones
- [ ] Asambleas virtuales
- [ ] Votaciones con quórum
- [ ] Registro de actas digitales
- [ ] Firma electrónica básica

### Módulo RRHH
- [ ] Gestión de personal (porteros, limpieza)
- [ ] Control de asistencia
- [ ] Liquidación de sueldos básica
- [ ] Integración BPS (futuro)

### Integraciones
- [ ] Pago online (Mercado Pago, RedPagos)
- [ ] WhatsApp Business API para notificaciones
- [ ] Sistarbanc / BROU para transferencias
- [ ] API pública para integraciones externas

**Entregable Fase 3:** Suite completa. Plan Enterprise desde USD 299/mes.

---

## KPIs de Producto

| Métrica                    | Objetivo 6 meses |
|---------------------------|------------------|
| Empresas registradas      | 50               |
| Edificios gestionados     | 200              |
| Apartamentos activos      | 4,000            |
| MRR                       | USD 5,000        |
| Churn mensual             | < 5%             |

---

## Stack de Herramientas Recomendadas

### Testing
- Backend: Vitest + Supertest
- Frontend: Playwright (e2e) + React Testing Library

### Monitoring
- Logs: Winston + Logtail
- Errores: Sentry (free tier)
- Uptime: Render health checks

### CI/CD
- GitHub Actions: lint + test + deploy automático
- Environments: dev, staging, production

### Analytics
- PostHog (open source, auto-hosted)
- Para medir uso de features y retención

---

## Decisiones de Arquitectura Pendientes

1. **Pagos online**: Mercado Pago vs Stripe (Stripe tiene mejor API pero MP es más usado en Latam)
2. **Emails**: Resend vs SendGrid (Resend más moderno, mejor DX)
3. **Storage**: Cloudinary vs AWS S3 vs Supabase Storage (para documentos/imágenes)
4. **Monorepo**: Considerar Turborepo si el proyecto escala
5. **Mobile**: React Native con Expo para app móvil en Fase 3
