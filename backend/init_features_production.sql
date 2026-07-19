-- Script para inicializar features en producción (Neon)
-- Ejecuta en: https://console.neon.tech → SQL Editor

-- ============================================================================
-- 1. CREAR FEATURES
-- ============================================================================

INSERT INTO features (id, key, name, description, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'billing',
    'Facturación',
    'Crear y gestionar facturas de servicios veterinarios',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'analytics',
    'Reportes y Análisis',
    'Acceso a reportes, dashboards y análisis de datos',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'telemedicine',
    'Telemedicina',
    'Consultas remotas y videollamadas con clientes',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'inventory',
    'Gestión de Inventario',
    'Control de stock, movimientos y gestión de productos',
    NOW(),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. ASIGNAR FEATURES A PLANES
-- ============================================================================

-- Plan: Basic → [billing]
INSERT INTO feature_plans (id, plan_id, feature_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.id,
  f.id,
  NOW(),
  NOW()
FROM plans p, features f
WHERE p.name ILIKE '%basic%'
  AND f.key = 'billing'
  AND NOT EXISTS (
    SELECT 1 FROM feature_plans fp
    WHERE fp.plan_id = p.id AND fp.feature_id = f.id
  );

-- Plan: Profesional → [billing, analytics]
INSERT INTO feature_plans (id, plan_id, feature_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.id,
  f.id,
  NOW(),
  NOW()
FROM plans p, features f
WHERE p.name ILIKE '%profesional%'
  AND f.key IN ('billing', 'analytics')
  AND NOT EXISTS (
    SELECT 1 FROM feature_plans fp
    WHERE fp.plan_id = p.id AND fp.feature_id = f.id
  );

-- Plan: Enterprise → [billing, analytics, telemedicine, inventory]
INSERT INTO feature_plans (id, plan_id, feature_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  p.id,
  f.id,
  NOW(),
  NOW()
FROM plans p, features f
WHERE p.name ILIKE '%enterprise%'
  AND f.key IN ('billing', 'analytics', 'telemedicine', 'inventory')
  AND NOT EXISTS (
    SELECT 1 FROM feature_plans fp
    WHERE fp.plan_id = p.id AND fp.feature_id = f.id
  );

-- ============================================================================
-- 3. VERIFICACIÓN (OPCIONAL - EJECUTA PARA VER RESULTADOS)
-- ============================================================================

-- Ver todos los features creados
SELECT key, name, description FROM features ORDER BY created_at DESC;

-- Ver asignación de features por plan
SELECT
  p.name as plan,
  f.key as feature_key,
  f.name as feature_name
FROM plans p
LEFT JOIN feature_plans fp ON p.id = fp.plan_id
LEFT JOIN features f ON fp.feature_id = f.id
ORDER BY p.name, f.name;

-- Ver resumen por plan
SELECT
  p.name as plan,
  COUNT(f.id) as total_features,
  STRING_AGG(f.key, ', ' ORDER BY f.key) as features
FROM plans p
LEFT JOIN feature_plans fp ON p.id = fp.plan_id
LEFT JOIN features f ON fp.feature_id = f.id
GROUP BY p.id, p.name
ORDER BY p.price_monthly DESC;
