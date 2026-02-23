# Gestión de Menú - Diseño

**Fecha:** 2026-02-23
**Estado:** Aprobado

## Contexto

La página /menu existe con UI completa pero datos mock (21 ítems falsos). Necesitamos CRUD real conectado a la DB, con modificadores por ítem e imágenes vía Cloudinary.

## Decisiones

- **CRUD completo**: Categorías, ítems y modificadores
- **Imágenes**: Cloudinary (server-side signed upload)
- **UI Pattern**: Drawer lateral para crear/editar (sin cambiar de página)
- **Schema**: Sin cambios, ya existe todo en DB

## API Routes

| Ruta | Método | Acción |
|------|--------|--------|
| `/api/menu/categories` | GET | Listar categorías con conteo de ítems |
| `/api/menu/categories` | POST | Crear categoría |
| `/api/menu/categories/[id]` | PUT | Editar categoría |
| `/api/menu/categories/[id]` | DELETE | Eliminar categoría (solo si vacía) |
| `/api/menu/items` | GET | Listar ítems (filtro por categoría) |
| `/api/menu/items` | POST | Crear ítem |
| `/api/menu/items/[id]` | PUT | Editar ítem |
| `/api/menu/items/[id]` | DELETE | Eliminar ítem |
| `/api/menu/items/[id]/availability` | PATCH | Toggle disponibilidad |
| `/api/menu/upload` | POST | Subir imagen a Cloudinary |

## UI Components

- **Drawer "Nuevo/Editar Plato"**: nombre, categoría, precio, descripción, imagen (drag & drop), tiempo prep, station, ingredientes, alérgenos, sección de modificadores
- **Drawer "Nueva/Editar Categoría"**: nombre, descripción
- **Image Upload**: Componente drag & drop con preview
- **Lista principal**: Reemplazar mock data con fetch real

## Cloudinary

- Server-side signed upload via API route
- Transform: auto-format, auto-quality, w_800
- Env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

## Archivos

### Nuevo
- `src/app/api/menu/categories/route.ts`
- `src/app/api/menu/categories/[id]/route.ts`
- `src/app/api/menu/items/route.ts`
- `src/app/api/menu/items/[id]/route.ts`
- `src/app/api/menu/items/[id]/availability/route.ts`
- `src/app/api/menu/upload/route.ts`
- `src/components/menu-item-drawer.tsx`
- `src/components/category-drawer.tsx`
- `src/components/image-upload.tsx`

### Modificar
- `src/app/(restaurant-admin)/menu/page.tsx`
