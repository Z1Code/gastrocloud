# Admin Settings + Tables - Diseño

**Fecha:** 2026-02-23
**Estado:** Aprobado

## Contexto

El setup checklist del dashboard apunta a `/settings` para logo, horarios y mesas, pero `/settings` solo tiene theme picker y dominio. La página `/tables` no existe. Necesitamos completar estas piezas faltantes.

## Decisiones

- **QR Library**: `qrcode.react` (2.3M downloads, SVG nativo, TS built-in)
- **QR URL**: `/r/[slug]/menu?table=[number]` — corta para QR menos denso
- **QR Error Correction**: Level H (30%)
- **QR Output**: SVG para pantalla, descarga SVG via XMLSerializer para impresión
- **Logo Upload**: Cloudinary signed upload, sin crop v1
- **Horarios**: JSONB en branches.operatingHours, dropdowns 15 min, max 2 rangos/día
- **UI Pattern**: Secciones en settings, grid de cards en tables

## Página /tables

### API Routes

| Ruta | Método | Acción |
|------|--------|--------|
| `/api/tables` | GET | Listar mesas del org |
| `/api/tables` | POST | Crear mesa (auto-genera qrCode) |
| `/api/tables/[id]` | PUT | Editar mesa |
| `/api/tables/[id]` | DELETE | Eliminar mesa |

### UI
- Grid de cards: número, zona, capacidad, status badge con color
- Colores: gris (libre), amber (ocupada), rojo (reservada), blue (limpieza)
- Drawer lateral para crear/editar
- Botón QR por mesa → preview + descarga SVG
- Botón "Agregar múltiples" — crear N mesas de golpe

## Settings Expandido

### Logo del Restaurante
- Drop zone drag & drop + click
- Accept: JPEG, PNG, WebP (max 5MB)
- Preview del logo actual
- Cloudinary upload, guarda en restaurants.logoUrl

### Horarios de Operación
- Grid 7 días: toggle + hora apertura + hora cierre
- Select dropdowns 15 min
- 2 rangos por día (almuerzo + cena)
- Botón "Copiar a todos los días"
- Formato: `{ monday: { isOpen: true, timeRanges: [{ opens: "09:00", closes: "14:00" }] } }`

## Fix Checklist
- "Agrega tus mesas" → href `/tables` (era `/settings`)

## Archivos

### Nuevos
- `src/app/api/tables/route.ts`
- `src/app/api/tables/[id]/route.ts`
- `src/app/api/branch/operating-hours/route.ts`
- `src/app/api/restaurant/logo/route.ts`
- `src/app/(restaurant-admin)/tables/page.tsx`
- `src/components/table-drawer.tsx`
- `src/components/table-qr-modal.tsx`

### Modificar
- `src/app/(restaurant-admin)/settings/page.tsx`
- `src/components/setup-checklist.tsx`

### Instalar
- `qrcode.react`
