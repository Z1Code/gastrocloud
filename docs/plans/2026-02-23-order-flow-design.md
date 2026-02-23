# Order Flow - Diseño

**Fecha:** 2026-02-23
**Estado:** Aprobado

## Contexto

GastroCloud tiene el checkout del storefront funcional (crea órdenes en DB con pagos MercadoPago/Transbank), pero las páginas de admin orders y KDS usan datos mock. Necesitamos conectar todo para que un pedido fluya de punta a punta: cliente ordena → admin recibe → cocina prepara → cliente trackea → se completa.

## Decisiones

- **Flujo completo**: Admin orders + KDS + tracking del cliente
- **Real-time**: Server-Sent Events (SSE) para actualizaciones push
- **Sonido**: Notificaciones sonoras diferenciadas por fuente de orden
- **KDS avanzado**: Timer con colores por urgencia + bump individual por estación
- **Tiempo estimado dinámico**: Basado en cola actual del restaurante
- **Impresión**: Ticket HTML con `window.print()` + CSS `@media print`

## Flujo de Estados

```
pending → accepted → preparing → ready → served → completed
                                    ↘ (takeaway/delivery: ready → completed, skip served)
   ↘ cancelled (desde cualquier estado pre-ready)
```

## API Routes

| Ruta | Método | Acción |
|------|--------|--------|
| `/api/orders` | GET | Listar órdenes (filtros: status, source, fecha) |
| `/api/orders/[id]` | GET | Detalle de orden con ítems y pagos |
| `/api/orders/[id]/status` | PATCH | Cambiar status con validación de transiciones |
| `/api/orders/[id]/cancel` | POST | Cancelar orden con motivo |
| `/api/orders/[id]/items/[itemId]/bump` | PATCH | Marcar ítem como listo (bump por estación) |
| `/api/orders/stream` | GET | SSE stream de eventos (auth required) |
| `/api/orders/track/[id]` | GET | Status público de orden (sin auth, para cliente) |
| `/api/orders/stats` | GET | Resumen: activas, tiempo promedio, completadas hoy |
| `/api/orders/estimate` | GET | Tiempo estimado basado en cola actual |

## SSE Events

```typescript
type OrderEvent = {
  type: 'order_created' | 'status_changed' | 'item_bumped' | 'order_cancelled';
  orderId: string;
  data: Order; // orden completa con ítems
  timestamp: string;
}
```

## UI Components

### Admin Orders Page (reescribir)
- Fetch real de órdenes con filtros funcionales (status, source, fecha)
- Cards de orden con status badge, source icon, timer
- Drawer de detalle con ítems, info cliente, pagos, acciones
- Mini dashboard: órdenes activas, tiempo promedio, completadas hoy
- SSE para actualizaciones en tiempo real
- Sonido diferenciado por source al recibir orden nueva
- Botón imprimir comanda

### KDS Page (reescribir)
- Conectar a DB vía SSE (reemplazar Zustand mock)
- Timer con colores por urgencia (verde <10min, amarillo 10-20min, rojo >20min)
- Órdenes rojas suben al tope (prioridad automática)
- Bump individual: marcar ítems como listos por estación
- Auto-transición a "ready" cuando todos los ítems están listos
- Sonido al recibir orden nueva en la estación
- Filtro por estación funcional

### Order Tracking Page (nueva)
- Vista pública sin auth para el cliente
- Progress steps visual: Recibido → Preparando → Listo → Entregado
- Tiempo estimado dinámico
- Actualización en tiempo real vía SSE público
- Info del pedido (ítems, total)

### Componentes compartidos
- `useOrderStream` - Hook SSE reutilizable
- `order-detail-drawer.tsx` - Drawer con detalle completo
- `order-print.tsx` - Componente de impresión con CSS @media print
- Sonidos en `/public/sounds/` (3 archivos: urgente, normal, suave)

## Tiempo Estimado Dinámico

```
estimado = (órdenes_pendientes + órdenes_preparando) × tiempo_promedio_últimas_20_órdenes
mínimo = 10 minutos
máximo = 60 minutos
```

Se recalcula cada vez que cambia el estado de una orden.

## Archivos

### Nuevos
- `src/app/api/orders/route.ts` - GET listar
- `src/app/api/orders/[id]/route.ts` - GET detalle
- `src/app/api/orders/[id]/status/route.ts` - PATCH cambiar status
- `src/app/api/orders/[id]/cancel/route.ts` - POST cancelar
- `src/app/api/orders/[id]/items/[itemId]/bump/route.ts` - PATCH bump ítem
- `src/app/api/orders/stream/route.ts` - SSE endpoint (auth)
- `src/app/api/orders/track/[id]/route.ts` - GET status público
- `src/app/api/orders/stats/route.ts` - GET resumen
- `src/app/api/orders/estimate/route.ts` - GET tiempo estimado
- `src/app/(storefront)/r/[slug]/track/[orderId]/page.tsx` - Tracking page
- `src/hooks/useOrderStream.ts` - SSE hook
- `src/components/order-detail-drawer.tsx` - Drawer detalle
- `src/components/order-print.tsx` - Componente impresión
- `public/sounds/order-urgent.mp3` - Sonido delivery
- `public/sounds/order-normal.mp3` - Sonido dine-in
- `public/sounds/order-soft.mp3` - Sonido QR table

### Modificar
- `src/app/(restaurant-admin)/orders/page.tsx` - Reescribir completo
- `src/app/(kds)/kitchen/[branchId]/page.tsx` - Reescribir con SSE + DB
- `src/stores/kdsStore.ts` - Eliminar mock data, adaptar para SSE
