# Conectores Funcionales - Diseño

**Fecha:** 2026-02-23
**Estado:** Aprobado

## Contexto

GastroCloud tiene TODAS las piezas de integración construidas (MercadoPago, Transbank, Rappi, UberEats, WhatsApp) pero no están conectadas al order flow. Las libs existen, los webhooks existen, los transformers existen — falta el cemento.

## Decisiones

- **Idempotencia**: Check `externalOrderId` antes de crear órdenes duplicadas
- **Status sync**: Fire-and-forget con logging (no bloquear respuesta)
- **Webhook security**: Validar signatures siempre
- **WhatsApp notifications**: Enviar status updates al cliente por WhatsApp
- **No queue system**: Procesamiento inline (volumen no justifica infraestructura extra)

## Cambios

### Nuevo
- `src/app/api/webhooks/mercadopago/route.ts` — Payment webhook handler

### Modificar
- `src/app/api/orders/[id]/status/route.ts` — Agregar delivery sync + WhatsApp notification
- `src/app/api/orders/[id]/cancel/route.ts` — Agregar delivery cancel sync
- `src/app/api/orders/[id]/items/[itemId]/bump/route.ts` — Agregar sync en auto-ready
- `src/app/api/webhooks/rappi/route.ts` — Agregar deduplicación por externalOrderId
- `src/app/api/webhooks/ubereats/route.ts` — Agregar deduplicación por externalOrderId
- `src/app/api/webhooks/whatsapp/route.ts` — Agregar deduplicación
