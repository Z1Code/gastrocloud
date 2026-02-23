# Onboarding Progresivo - Diseño

**Fecha:** 2026-02-23
**Estado:** Aprobado

## Contexto

GastroCloud necesita un flujo de onboarding para que nuevos dueños de restaurantes puedan crear su negocio y configurarlo progresivamente. Actualmente el setup es automático y crea datos genéricos ("GastroCloud Demo", "Mi Restaurante").

## Decisiones

- **Onboarding progresivo**: Wizard corto (3 pasos) + checklist en dashboard
- **Multi-restaurante**: Una organización puede tener múltiples restaurantes (marcas distintas)
- **Desbloqueo progresivo**: Features avanzadas requieren completar pasos previos
- **Schema existente**: No requiere cambios al schema de DB

## Wizard Inicial (3 pasos)

### Paso 1 - Tu Negocio
- Nombre de la organización
- Slug auto-generado (editable)

### Paso 2 - Tu Restaurante
- Nombre del restaurante
- Tipo de cocina (select predefinido)
- Dirección
- Se crea automáticamente la primera sucursal

### Paso 3 - Confirmación
- Resumen de lo creado
- Redirect a Dashboard

## Dashboard - Checklist de Configuración

El dashboard muestra un checklist prominente para nuevos restaurantes:

1. Sube tu logo y configura colores → /settings
2. Agrega horarios de operación → /settings
3. Crea tu primer menú (categorías + ítems) → /menu
4. Configura al menos 1 método de pago → /integrations
5. (Opcional) Conecta apps de delivery → /integrations
6. Agrega tus mesas → /settings
7. ¡Activa tu storefront!

Cada paso se verifica automáticamente consultando la DB.

## Requisitos de Desbloqueo

| Feature | Requiere |
|---------|----------|
| Storefront público | Menú (>=1 ítem) + Pago configurado |
| Recibir órdenes delivery | Menú + Pago + >=1 plataforma delivery |
| KDS (cocina) | Menú con estaciones asignadas |

## Cambios Técnicos

### Nuevo
- `POST /api/onboarding` - Crea org + restaurante + branch + staff en transacción
- `src/app/(auth)/onboarding/page.tsx` - Wizard de 3 pasos
- `src/components/setup-wizard.tsx` - Componente stepper
- `src/components/setup-checklist.tsx` - Checklist del dashboard
- `src/lib/setup-progress.ts` - Helper que consulta DB para estado del checklist

### Modificar
- `src/app/(auth)/redirect/page.tsx` - Si no tiene org → /onboarding
- `src/app/(restaurant-admin)/dashboard/page.tsx` - Reemplazar mock data con checklist + datos reales
- Eliminar `POST /api/setup` actual (reemplazado por /api/onboarding)
