"""
Script para crear features iniciales y asignarlos a planes.
Uso: docker-compose exec backend python seed_features.py
"""
import asyncio

from sqlalchemy import select

from app.database import async_session
from app.models.feature import Feature, FeaturePlan
from app.models.subscription import Plan


FEATURES = [
    ("billing", "Facturación", "Crear y gestionar facturas de servicios veterinarios"),
    ("analytics", "Reportes y Análisis", "Acceso a reportes, dashboards y análisis de datos"),
    ("telemedicine", "Telemedicina", "Consultas remotas y videollamadas con clientes"),
    ("inventory", "Gestión de Inventario", "Control de stock, movimientos y gestión de productos"),
]

# Mapping de planes a features
PLAN_FEATURES = {
    "Basic": ["billing"],
    "Profesional": ["billing", "analytics"],
    "Enterprise": ["billing", "analytics", "telemedicine", "inventory"],
}


async def main():
    async with async_session() as db:
        print("\n" + "=" * 60)
        print("🚀 Inicializando Features por Plan")
        print("=" * 60 + "\n")

        # Crear o verificar features
        print("⚙️  Registrando features...")
        features_map = {}
        for key, name, description in FEATURES:
            existing = await db.execute(select(Feature).where(Feature.key == key))
            existing_feature = existing.scalar_one_or_none()

            if existing_feature:
                features_map[key] = existing_feature
                print(f"  ✓ Feature '{name}' ya existe")
            else:
                feature = Feature(key=key, name=name, description=description)
                db.add(feature)
                features_map[key] = feature
                print(f"  ✅ Feature '{name}' creado")

        await db.flush()

        # Asignar features a planes
        print("\n🔗 Asignando features a planes...")

        for plan_name, feature_keys in PLAN_FEATURES.items():
            result = await db.execute(select(Plan).where(Plan.name.ilike(f"%{plan_name}%")))
            plan = result.scalar_one_or_none()

            if not plan:
                print(f"  ⚠️  Plan '{plan_name}' no encontrado (omitido)")
                continue

            print(f"\n  📦 Plan: {plan.name} (${plan.price_monthly}/mes)")

            for feature_key in feature_keys:
                feature = features_map.get(feature_key)

                if not feature:
                    print(f"    ⚠️  Feature '{feature_key}' no encontrado")
                    continue

                existing = await db.execute(
                    select(FeaturePlan).where(
                        FeaturePlan.plan_id == plan.id, FeaturePlan.feature_id == feature.id
                    )
                )
                if existing.scalar_one_or_none():
                    print(f"    ✓ {feature.name}")
                else:
                    fp = FeaturePlan(plan_id=plan.id, feature_id=feature.id)
                    db.add(fp)
                    print(f"    ✅ {feature.name}")

        await db.commit()

        # Resumen
        print("\n" + "=" * 60)
        print("✅ Features inicializados exitosamente")
        print("=" * 60)

        # Mostrar resumen
        result = await db.execute(
            select(Feature)
        )
        all_features = result.scalars().all()
        print(f"\n📊 Total de features: {len(all_features)}")
        for f in all_features:
            fp_count = (await db.execute(
                select(FeaturePlan).where(FeaturePlan.feature_id == f.id)
            )).scalars().all()
            print(f"   • {f.name}: asignado a {len(fp_count)} plan(es)")
        print()


if __name__ == "__main__":
    asyncio.run(main())
