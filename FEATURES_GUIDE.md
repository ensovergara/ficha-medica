# 🎯 Guía de Sistema de Features por Plan

Sistema completo de feature flags para controlar acceso a funcionalidades según el plan de suscripción del tenant (clínica).

## 📊 Arquitectura

### Features Disponibles

| Key | Nombre | Descripción |
|-----|--------|-------------|
| `billing` | Facturación | Crear y gestionar facturas de servicios |
| `analytics` | Reportes y Análisis | Acceso a reportes, dashboards y análisis |
| `telemedicine` | Telemedicina | Consultas remotas y videollamadas |
| `inventory` | Gestión de Inventario | Control de stock y movimientos |

### Planes por Defecto

| Plan | Precio | Features |
|------|--------|----------|
| **Basic** | $99/mes | • Facturación |
| **Profesional** | $299/mes | • Facturación<br>• Reportes y Análisis |
| **Enterprise** | $799/mes | • Facturación<br>• Reportes y Análisis<br>• Telemedicina<br>• Gestión de Inventario |

---

## 🚀 Inicialización

### 1. Base de Datos
Las tablas se crean automáticamente al levantar la app (migraciones de Alembic).

### 2. Seed Inicial - Features
```bash
docker-compose exec backend python seed_features.py
```
Crea los features y los asigna a los planes existentes.

### 3. Seed Demo - Con Features
```bash
docker-compose exec backend python seed_demo.py
```
Crea una clínica de prueba con plan "Profesional" que incluye:
- ✅ Facturación
- ✅ Reportes y Análisis

---

## 👨‍💻 Uso en el Backend

### Verificar Acceso a Feature
```python
from app.core.features import has_feature

# En un endpoint
async def my_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    if not await has_feature(db, tenant_id, "billing"):
        raise HTTPException(
            status_code=403,
            detail="Feature no disponible en tu plan"
        )
    # Resto de lógica...
```

### Endpoints Protegidos

| Ruta | Feature Requerido |
|------|------------------|
| POST `/invoices/` | `billing` |
| POST `/invoices/payments/` | `billing` |
| GET `/reports/summary` | `analytics` |
| GET `/reports/patients-by-species` | `analytics` |
| POST `/inventory/products/` | `inventory` |
| PATCH `/inventory/products/{id}` | `inventory` |
| POST `/inventory/stock-movements/` | `inventory` |

---

## 🎨 Uso en el Frontend

### Hook para Verificar Acceso
```typescript
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

function MyComponent() {
  const { hasAccess, loading, error } = useFeatureAccess("billing");

  if (loading) return <div>Verificando acceso...</div>;
  if (!hasAccess) return <div>Feature no disponible</div>;

  return <BillingModule />;
}
```

### FeatureGate Component
Envuelve contenido que requiere un feature específico. Si no tiene acceso, muestra:
- Sección deshabilitada
- Mensaje de actualización
- Botón "Mejorar Plan"

```tsx
import FeatureGate from "@/components/FeatureGate";

export default function InvoicesPage() {
  return (
    <FeatureGate 
      featureKey="billing"
      upgradeMessage="Actualiza tu plan para facturación"
    >
      <InvoicesList />
    </FeatureGate>
  );
}
```

### Secciones Protegidas

| Página | Feature | Ruta |
|--------|---------|------|
| **Facturación** | `billing` | `/dashboard/invoices` |
| **Reportes** | `analytics` | `/dashboard/reports` |
| **Inventario** | `inventory` | `/dashboard/inventory` |

---

## 🔐 Panel de Superadmin

### Gestionar Features de un Plan

1. Ve a `/superadmin/plans`
2. En cada card de plan, haz click en ⚙️
3. Se abre un modal con todos los features disponibles
4. Marca/desmarca checkboxes para asignar/remover

### Ver Historial de Cambios
```bash
GET /api/v1/subscriptions/plans/{plan_id}/features/audit-log
```
Devuelve audit log con:
- Feature asignado/removido
- Usuario que lo cambió
- Timestamp

### API Endpoints Admin

#### Listar Todos los Features
```bash
GET /subscriptions/features/
```
Devuelve:
```json
[
  {
    "id": "uuid",
    "key": "billing",
    "name": "Facturación",
    "description": "..."
  }
]
```

#### Ver Features de un Plan
```bash
GET /subscriptions/plans/{plan_id}/features
```
Devuelve:
```json
{
  "plan_id": "uuid",
  "features": [...]
}
```

#### Asignar Feature a Plan
```bash
POST /subscriptions/plans/{plan_id}/features/{feature_key}
```
Crea registro en `FeaturePlan` y audit log.

#### Remover Feature de Plan
```bash
DELETE /subscriptions/plans/{plan_id}/features/{feature_key}
```
Elimina relación y registra en audit log.

---

## 📋 Verificar Acceso en Frontend

### Endpoint para Usuarios
```bash
GET /subscriptions/my-subscription/has-feature/{feature_key}
```
Devuelve:
```json
{
  "feature_key": "billing",
  "has_access": true
}
```

---

## 🛠️ Troubleshooting

### Feature No Aparece para un Tenant

**Problema:** Tenant tiene un plan pero no ve una feature.

**Solución:**
1. Verifica que el plan esté asignado al tenant (tabla `subscriptions`)
2. Verifica que el feature esté en la tabla `feature_plans` para ese plan
3. Ejecuta `python seed_features.py` para sincronizar

### Feature Bloqueado Pero No Debería

**Problema:** Tenant con plan Enterprise no puede crear facturas.

**Solución:**
```bash
# En la BD, verifica:
SELECT * FROM feature_plans 
WHERE plan_id = (SELECT plan_id FROM subscriptions WHERE tenant_id = 'xxx')
AND feature_id = (SELECT id FROM features WHERE key = 'billing');

# Si no existe, asigna manualmente:
INSERT INTO feature_plans (plan_id, feature_id) 
VALUES ('plan_id', 'feature_id');
```

---

## 📝 Flujo Típico de Integración

### 1. Superadmin Crea Plan
- ✅ `/superadmin/plans` → "Nuevo Plan"
- ✅ Rellena nombre, precio, límites

### 2. Superadmin Asigna Features
- ✅ Click en ⚙️ en la card del plan
- ✅ Selecciona features con checkboxes
- ✅ Sistema registra cambios en audit log

### 3. Tenant Accede a Feature
- ✅ Usuario de clínica navega a `/dashboard/invoices` (billing)
- ✅ Frontend llama `useFeatureAccess("billing")`
- ✅ Si tiene acceso → ve la sección
- ✅ Si NO tiene acceso → ve CTA "Mejorar Plan"

### 4. Cambiar Feature de Plan
- ✅ Superadmin va a `/superadmin/plans/{plan_id}`
- ✅ Click ⚙️ → remarca checkbox
- ✅ Cambio aplica inmediatamente a todos los tenants en ese plan
- ✅ Historial guardado en `feature_assignments`

---

## 🎯 Best Practices

✅ **DO:**
- Usar `FeatureGate` en componentes que requieren features
- Proteger endpoints en el backend
- Mantener descripción de features actualizada
- Revisar audit log periódicamente

❌ **DON'T:**
- Hardcodear feature keys (usa enums de `FeatureKey`)
- Eliminar un feature de la BD (solo removerlo de planes)
- Cambiar el `key` de un feature (es el identificador)

---

## 📚 Referencias

- **Modelos ORM:** `backend/app/models/feature.py`
- **Schemas Pydantic:** `backend/app/schemas/feature.py`
- **API Endpoints:** `backend/app/api/v1/subscriptions.py` (líneas con `/features`)
- **Componentes Frontend:** `frontend/src/components/FeatureGate.tsx`
- **Hook Frontend:** `frontend/src/hooks/useFeatureAccess.ts`
- **Core Logic:** `backend/app/core/features.py`

---

## 🔄 Próximas Mejoras

- [ ] UI visual para Ver/Editar features (matriz plan vs features)
- [ ] Exportar audit log de features
- [ ] Webhooks cuando se asignan/removen features
- [ ] Preview de features antes de actualizar plan
- [ ] Analytics sobre uso de features por plan
