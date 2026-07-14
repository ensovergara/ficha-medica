# Despliegue MVP gratuito — Vercel + Render + Neon

Stack gratuito sin pérdida de datos:

| Componente | Plataforma | Notas |
|---|---|---|
| Frontend (Next.js) | **Vercel** | Gratis, sin cold start |
| Backend (FastAPI) | **Render** (free) | Spin-down a los 15 min |
| PostgreSQL | **Neon** (free) | ~0.5 GB, **no expira** |

> El despliegue local con Docker (`docker-compose.yml`) y el de EC2/nginx
> (`docker-compose.prod.yml`) siguen disponibles y no se ven afectados.

---

## 1. Base de datos — Neon
1. Crear cuenta en https://neon.tech → **New Project** (región cercana).
2. Copiar el connection string (viene como
   `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`).
3. Adaptarlo para la app: agregar `+asyncpg` y quitar el `?sslmode=...`:
   ```
   postgresql+asyncpg://user:pass@ep-xxx.neon.tech/dbname
   ```
4. No hay que crear tablas: el backend las crea al arrancar (`app/seed.py`).
   El SSL de Neon lo maneja `app/database.py` automáticamente.

## 2. Backend — Render
Opción A (recomendada): importar el repo; Render detecta `render.yaml`.
Opción B (manual): **New → Web Service** con:
- Root Directory: `backend`
- Runtime: Python
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Variables de entorno (las `sync:false` del blueprint se piden al importar):
- `DATABASE_URL` → URL de Neon del paso 1.3
- `SECRET_KEY` → se autogenera (o `python -c "import secrets; print(secrets.token_hex(32))"`)
- `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` (cambiar tras el primer login)
- `BACKEND_CORS_ORIGINS`, `FRONTEND_URL` → URL de Vercel (paso 3, se completan luego)
- `RESEND_API_KEY`, `EMAIL_FROM` → opcional

Deploy → anotar la URL, ej. `https://fichamedica-api.onrender.com`.
Verificar `https://fichamedica-api.onrender.com/health` → `{"status":"ok"}`.

## 3. Frontend — Vercel
1. https://vercel.com → **Add New → Project** → importar el repo.
2. Root Directory: `frontend` (detecta Next.js solo).
3. Variables de entorno (build-time, antes de compilar):
   - `NEXT_PUBLIC_API_URL` → `https://fichamedica-api.onrender.com/api/v1`
   - `NEXT_PUBLIC_FRONTEND_URL` → tu URL de Vercel
4. Deploy → anotar URL, ej. `https://fichamedica.vercel.app`.

## 4. Cerrar el círculo (CORS + URLs)
En Render, completar y redesplegar:
- `BACKEND_CORS_ORIGINS` = `https://fichamedica.vercel.app`
- `FRONTEND_URL` = `https://fichamedica.vercel.app`

## 5. Verificación
- Login con el superadmin.
- Crear cliente/paciente y generar un PDF (valida reportlab en free tier).
- Reiniciar el backend y confirmar que los datos persisten (Neon).

---

## Limitaciones del plan gratuito
- **Cold start del backend** (~1 min tras 15 min inactivo). Opcional: cron gratis
  (cron-job.org) que llame a `/health` cada ~12 min para mantenerlo despierto
  (consume de las 750 h/mes del workspace).
- **Neon** autosuspende el cómputo pero despierta en ~1 s.
- **Sin backups automáticos** en Neon free → exportar manualmente si acumulas
  datos importantes. Para producción real: Postgres pago (Render/Neon) con backups.
