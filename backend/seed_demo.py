"""
Script de datos de prueba para FichaMédica SaaS Veterinario.
Uso: docker-compose exec backend python seed_demo.py

Crea una clínica demo completa con clientes, pacientes, consultas,
vacunas, recetas, citas, inventario y facturas.
"""
import asyncio
import random
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import async_session, engine
from app.models import Base
from app.models.appointment import Appointment, AppointmentStatus
from app.models.client import Client
from app.models.consultation import Consultation
from app.models.feature import Feature, FeaturePlan
from app.models.inventory import MovementType, Product, StockMovement
from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus, Payment
from app.models.lab_result import LabResult
from app.models.medical_record import MedicalRecord
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.subscription import Plan, Subscription, SubscriptionStatus
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.vaccination import Vaccination

# ---------------------------------------------------------------------------
# Datos base
# ---------------------------------------------------------------------------

TENANT_NAME = "Clínica Veterinaria San Francisco"
TENANT_SLUG = "clinica-san-francisco"

USERS = [
    {"email": "admin@demo.com",        "password": "Demo1234!", "first_name": "Sofía",    "last_name": "Ramírez",   "role": UserRole.ADMIN},
    {"email": "dra.garcia@demo.com",   "password": "Demo1234!", "first_name": "Valentina","last_name": "García",    "role": UserRole.VETERINARIO},
    {"email": "dr.torres@demo.com",    "password": "Demo1234!", "first_name": "Matías",   "last_name": "Torres",    "role": UserRole.VETERINARIO},
    {"email": "recepcion@demo.com",    "password": "Demo1234!", "first_name": "Camila",   "last_name": "Morales",   "role": UserRole.RECEPCIONISTA},
    {"email": "auxiliar@demo.com",     "password": "Demo1234!", "first_name": "Diego",    "last_name": "Fuentes",   "role": UserRole.AUXILIAR},
]

CLIENTS_DATA = [
    ("María",     "González",   "12.345.678-9", "+56912345678", "maria.gonzalez@gmail.com",   "Av. Providencia 1234, Santiago"),
    ("Juan",      "Muñoz",      "15.678.901-2", "+56923456789", "juan.munoz@gmail.com",       "Los Leones 567, Providencia"),
    ("Catalina",  "Soto",       "17.890.123-4", "+56934567890", "catalina.soto@hotmail.com",  "Manuel Montt 890, Ñuñoa"),
    ("Rodrigo",   "Herrera",    "11.234.567-8", "+56945678901", "rodrigo.herrera@gmail.com",  "Irarrázaval 234, Ñuñoa"),
    ("Fernanda",  "Díaz",       "18.901.234-5", "+56956789012", "fernanda.diaz@yahoo.com",    "Av. Italia 456, Santiago"),
    ("Andrés",    "Martínez",   "13.456.789-0", "+56967890123", "andres.martinez@gmail.com",  "Los Militares 789, Las Condes"),
    ("Paola",     "López",      "16.789.012-3", "+56978901234", "paola.lopez@gmail.com",      "El Bosque Norte 321, Las Condes"),
    ("Felipe",    "Vargas",     "14.567.890-1", "+56989012345", "felipe.vargas@outlook.com",  "Apoquindo 1500, Las Condes"),
    ("Alejandra", "Castro",     "19.012.345-6", "+56990123456", "alejandra.castro@gmail.com", "Vicuña Mackenna 678, Macul"),
    ("Sebastián", "Moreno",     "10.123.456-7", "+56901234567", "sebastian.moreno@gmail.com", "Gran Avenida 890, San Miguel"),
    ("Gabriela",  "Rojas",      "20.234.567-8", "+56912340001", "gabriela.rojas@gmail.com",   "Américo Vespucio 200, Peñalolén"),
    ("Nicolás",   "Jiménez",    "21.345.678-9", "+56923450002", "nicolas.jimenez@gmail.com",  "La Florida 1100, La Florida"),
    ("Andrea",    "Flores",     "22.456.789-0", "+56934560003", "andrea.flores@outlook.com",  "Concha y Toro 300, Santiago"),
    ("Cristián",  "Pinto",      "23.567.890-1", "+56945670004", "cristian.pinto@gmail.com",   "Las Rejas 400, Pudahuel"),
    ("Daniela",   "Espinoza",   "24.678.901-2", "+56956780005", "daniela.espinoza@gmail.com", "Matta 500, Santiago"),
]

PATIENTS_DATA = [
    # (nombre, especie, raza, nacimiento, sexo, peso)
    ("Tobi",      "Perro", "Labrador Retriever",  "2019-03-15", "Macho",  32.5),
    ("Luna",      "Gato",  "Siamés",              "2020-07-22", "Hembra", 4.2),
    ("Max",       "Perro", "Golden Retriever",    "2018-11-05", "Macho",  29.0),
    ("Mia",       "Gato",  "Persa",               "2021-02-14", "Hembra", 3.8),
    ("Rocky",     "Perro", "Bulldog Francés",     "2020-05-30", "Macho",  11.5),
    ("Bella",     "Gato",  "Doméstico de pelo corto", "2019-09-18", "Hembra", 4.0),
    ("Coco",      "Perro", "Beagle",              "2017-12-01", "Macho",  13.2),
    ("Nala",      "Gato",  "Bengalí",             "2022-01-10", "Hembra", 4.5),
    ("Bruno",     "Perro", "Boxer",               "2019-06-20", "Macho",  27.0),
    ("Kitty",     "Gato",  "Angora",              "2020-11-30", "Hembra", 3.5),
    ("Thor",      "Perro", "Pastor Alemán",       "2018-04-08", "Macho",  35.0),
    ("Simba",     "Gato",  "Maine Coon",          "2021-08-25", "Macho",  6.2),
    ("Lola",      "Perro", "Poodle",              "2022-03-12", "Hembra", 5.8),
    ("Mochi",     "Gato",  "Ragdoll",             "2020-06-15", "Macho",  5.5),
    ("Charlie",   "Perro", "Shih Tzu",            "2019-10-22", "Macho",  6.0),
    ("Perla",     "Perro", "Dachshund",           "2021-01-05", "Hembra", 8.5),
    ("Kira",      "Gato",  "British Shorthair",   "2022-05-18", "Hembra", 4.8),
    ("Zeus",      "Perro", "Rottweiler",          "2017-08-14", "Macho",  42.0),
    ("Chloe",     "Gato",  "Doméstico de pelo largo", "2019-12-30", "Hembra", 4.1),
    ("Buddy",     "Perro", "Cocker Spaniel",      "2020-02-28", "Macho",  12.0),
    ("Tweety",    "Ave",   "Canario",             "2021-04-01", "Macho",  0.03),
    ("Paco",      "Ave",   "Loro Gris Africano",  "2015-06-10", "Macho",  0.4),
    ("Bugs",      "Conejo","Rex",                 "2022-07-20", "Macho",  2.1),
    ("Pony",      "Perro", "Chihuahua",           "2023-01-15", "Hembra", 2.3),
    ("Oliver",    "Gato",  "Scottish Fold",       "2021-11-08", "Macho",  4.9),
]

DIAGNOSES = [
    ("Control rutinario", "Paciente en buen estado general", "Continuar dieta balanceada y ejercicio regular"),
    ("Otitis externa", "Inflamación del canal auricular externo", "Limpieza auricular + gotas antibióticas 10 días"),
    ("Dermatitis alérgica", "Reacción alérgica cutánea", "Antihistamínico + shampoo hipoalergénico"),
    ("Gastroenteritis", "Inflamación gastrointestinal leve", "Dieta blanda 3 días + probióticos"),
    ("Conjuntivitis", "Inflamación ocular bilateral", "Colirio antibiótico 5 días"),
    ("Artritis temprana", "Cambios degenerativos en articulaciones", "AINES + fisioterapia + suplemento glucosamina"),
    ("Obesidad grado I", "IMC elevado", "Dieta restrictiva + programa de ejercicio"),
    ("Infección urinaria", "Cistitis bacteriana", "Antibiótico 7 días + aumento consumo de agua"),
    ("Parásitos intestinales", "Infestación por helmintos", "Desparasitación oral"),
    ("Herida superficial", "Laceración leve en extremidad", "Limpieza + sutura + antibiótico"),
]

VACCINES = [
    ("Parvovirus + Distemper + Hepatitis (DHPPi)", 365),
    ("Rabia", 365),
    ("Bordatella (Tos de las perreras)", 180),
    ("Leptospirosis", 365),
    ("Triple Felina (Herpesvirus + Calicivirus + Panleucopenia)", 365),
    ("Leucemia Felina (FeLV)", 365),
]

FEATURES_DATA = [
    ("billing", "Facturación", "Crear y gestionar facturas de servicios veterinarios"),
    ("analytics", "Reportes y Análisis", "Acceso a reportes, dashboards y análisis de datos"),
    ("telemedicine", "Telemedicina", "Consultas remotas y videollamadas con clientes"),
    ("inventory", "Gestión de Inventario", "Control de stock, movimientos y gestión de productos"),
]

PRODUCTS_DATA = [
    ("Vacuna Rabia",            "Vacunas",      "VAC-RAB-001", "dosis",   50, 5,  4500.0),
    ("Vacuna DHPPi",            "Vacunas",      "VAC-DHPPi",   "dosis",   40, 5,  8500.0),
    ("Vacuna Triple Felina",    "Vacunas",      "VAC-TRF-001", "dosis",   30, 5,  9000.0),
    ("Amoxicilina 250mg",       "Medicamentos", "MED-AMX-250", "comprimido", 200, 20, 350.0),
    ("Metronidazol 250mg",      "Medicamentos", "MED-MTR-250", "comprimido", 150, 20, 280.0),
    ("Ibuprofeno Veterinario",  "Medicamentos", "MED-IBU-VET", "ml",      100, 10, 1200.0),
    ("Ivermectina 1%",          "Antiparasitarios", "ANT-IVM-001", "ml",  80, 10, 2500.0),
    ("Drontal Perros",          "Antiparasitarios", "ANT-DRN-P",   "comprimido", 100, 15, 1800.0),
    ("Frontline Spray",         "Antiparasitarios", "ANT-FRL-S",   "frasco",  25, 5,  18000.0),
    ("Colirio Antibiótico",     "Medicamentos", "MED-COL-ANT", "frasco",  40, 8,  4200.0),
    ("Shampoo Hipoalergénico",  "Higiene",      "HIG-SHA-HIP", "frasco",  20, 5,  9500.0),
    ("Guantes Desechables L",   "Insumos",      "INS-GUA-L",   "caja",    15, 3,  4800.0),
    ("Jeringa 5ml",             "Insumos",      "INS-JER-5",   "unidad",  200, 50, 250.0),
    ("Alcohol 70°",             "Insumos",      "INS-ALC-70",  "litro",   10, 3,  2800.0),
    ("Vendas Elásticas",        "Insumos",      "INS-VEN-EL",  "unidad",  50, 10, 1500.0),
]


def random_date(start_days_ago: int, end_days_ago: int = 0) -> date:
    delta = random.randint(end_days_ago, start_days_ago)
    return date.today() - timedelta(days=delta)


def random_dt(start_days_ago: int, end_days_ago: int = 0) -> datetime:
    d = random_date(start_days_ago, end_days_ago)
    return datetime(d.year, d.month, d.day, random.randint(8, 18), random.choice([0, 15, 30, 45]), tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if demo data already exists
        existing = (await db.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))).scalar_one_or_none()
        if existing:
            print(f"⚠️  Ya existe un tenant con slug '{TENANT_SLUG}'. Omitiendo creación.")
            print("    Para recrear los datos, elimina el tenant desde el panel superadmin.")
            return

        print("🏥  Creando Clínica Demo...")

        # --- Features ---
        print("⚙️  Inicializando features...")
        features_map = {}
        for key, name, description in FEATURES_DATA:
            existing = (await db.execute(select(Feature).where(Feature.key == key))).scalar_one_or_none()
            if existing:
                features_map[key] = existing
            else:
                feature = Feature(key=key, name=name, description=description)
                db.add(feature)
                features_map[key] = feature
        await db.flush()

        # --- Tenant ---
        tenant = Tenant(name=TENANT_NAME, slug=TENANT_SLUG, email="contacto@sanfrancisco.cl",
                        phone="+56222345678", address="Av. Providencia 2345, Santiago")
        db.add(tenant)
        await db.flush()

        # --- Subscription (Plan Profesional) ---
        plan = (await db.execute(select(Plan).where(Plan.name.ilike("%profesional%")).limit(1))).scalar_one_or_none()
        if not plan:
            plan = (await db.execute(select(Plan).order_by(Plan.price_monthly.desc()).limit(1))).scalar_one_or_none()

        if plan:
            sub = Subscription(
                tenant_id=tenant.id, plan_id=plan.id, status=SubscriptionStatus.ACTIVE,
                current_period_start=datetime.now(timezone.utc),
                current_period_end=datetime.now(timezone.utc) + timedelta(days=365),
            )
            db.add(sub)
            await db.flush()

            # Assign features to Profesional plan (billing + analytics)
            plan_features = ["billing", "analytics"]
            for feature_key in plan_features:
                existing_fp = (await db.execute(
                    select(FeaturePlan).where(
                        FeaturePlan.plan_id == plan.id,
                        FeaturePlan.feature_id == features_map[feature_key].id
                    )
                )).scalar_one_or_none()
                if not existing_fp:
                    fp = FeaturePlan(plan_id=plan.id, feature_id=features_map[feature_key].id)
                    db.add(fp)

        # --- Users ---
        print("👥  Creando usuarios...")
        users: list[User] = []
        for u in USERS:
            user = User(tenant_id=tenant.id, email=u["email"],
                        hashed_password=hash_password(u["password"]),
                        first_name=u["first_name"], last_name=u["last_name"], role=u["role"])
            db.add(user)
            users.append(user)
        await db.flush()

        vets = [u for u in users if u.role == UserRole.VETERINARIO]

        # --- Clients ---
        print("👤  Creando clientes...")
        clients: list[Client] = []
        for fn, ln, rut, phone, email, address in CLIENTS_DATA:
            c = Client(tenant_id=tenant.id, first_name=fn, last_name=ln,
                       rut=rut, phone=phone, email=email, address=address)
            db.add(c)
            clients.append(c)
        await db.flush()

        # --- Patients (distribute among clients) ---
        print("🐾  Creando pacientes...")
        patients: list[Patient] = []
        shuffled_clients = clients * 2  # allow multiple pets per client
        random.shuffle(shuffled_clients)

        for i, (name, species, breed, birth_str, sex, weight) in enumerate(PATIENTS_DATA):
            client = shuffled_clients[i % len(clients)]
            birth = date.fromisoformat(birth_str)
            p = Patient(tenant_id=tenant.id, client_id=client.id,
                        name=name, species=species, breed=breed,
                        birth_date=birth, sex=sex, weight=weight,
                        microchip=f"985{random.randint(100000000000, 999999999999)}" if i % 3 == 0 else None)
            db.add(p)
            patients.append(p)
        await db.flush()

        # --- Medical records + Consultations + Vaccinations + Prescriptions + Lab Results ---
        print("📋  Creando fichas médicas y consultas...")
        records: list[MedicalRecord] = []
        all_consultations: list[Consultation] = []

        for idx, patient in enumerate(patients):
            # One medical record per patient
            record = MedicalRecord(tenant_id=tenant.id, patient_id=patient.id,
                                   record_number=f"FM-{2024}-{idx+1:04d}",
                                   notes="Ficha creada en ingreso inicial.")
            db.add(record)
            records.append(record)
        await db.flush()

        for record, patient in zip(records, patients):
            n_consultations = random.randint(1, 4)
            for j in range(n_consultations):
                vet = random.choice(vets)
                diag = random.choice(DIAGNOSES)
                cons = Consultation(
                    tenant_id=tenant.id,
                    medical_record_id=record.id,
                    veterinarian_id=vet.id,
                    reason=diag[0],
                    diagnosis=diag[1],
                    treatment=diag[2],
                    notes=f"Paciente responde bien al tratamiento." if j % 2 == 0 else None,
                    weight_at_visit=round(float(patient.weight) + random.uniform(-1.5, 1.5), 1) if patient.weight else None,
                    temperature=round(random.uniform(37.5, 39.5), 1),
                )
                db.add(cons)
                all_consultations.append(cons)
        await db.flush()

        # Vaccinations
        print("💉  Creando vacunaciones...")
        for patient in patients:
            if patient.species in ("Perro", "Gato"):
                n_vac = random.randint(1, 3)
                for _ in range(n_vac):
                    vac_name, interval_days = random.choice(VACCINES[:4] if patient.species == "Perro" else VACCINES[4:])
                    applied_date = random_date(400, 30)
                    next_dose = applied_date + timedelta(days=interval_days)
                    vac = Vaccination(
                        tenant_id=tenant.id, patient_id=patient.id,
                        vaccine_name=vac_name,
                        batch_number=f"LOT{random.randint(100000,999999)}",
                        administered_by=random.choice(vets).id,
                        next_dose_date=next_dose,
                    )
                    db.add(vac)
        await db.flush()

        # Prescriptions (attached to some consultations)
        print("💊  Creando recetas...")
        meds = [
            ("Amoxicilina 250mg", "1 comprimido", "Cada 8 horas", "7 días"),
            ("Metronidazol 250mg", "½ comprimido", "Cada 12 horas", "5 días"),
            ("Ibuprofeno Veterinario", "0.5 ml/kg", "Cada 24 horas", "5 días"),
            ("Ivermectina 1%", "0.1 ml/kg", "Dosis única", None),
            ("Drontal Perros", "1 comprimido", "Dosis única", None),
            ("Colirio Antibiótico", "1 gota", "Cada 6 horas", "5 días"),
        ]
        for cons in all_consultations:
            if random.random() < 0.5:
                med = random.choice(meds)
                presc = Prescription(
                    tenant_id=tenant.id, consultation_id=cons.id,
                    medication=med[0], dosage=med[1], frequency=med[2], duration=med[3],
                    notes="Administrar con comida. Consultar si hay reacción adversa.",
                )
                db.add(presc)
        await db.flush()

        # Lab results (for some patients)
        print("🧪  Creando resultados de laboratorio...")
        lab_types = [
            ("Hemograma", {"glóbulos_rojos": "5.2 M/µL", "glóbulos_blancos": "8.3 K/µL", "hemoglobina": "14.5 g/dL", "hematocrito": "43%"}),
            ("Uroanálisis", {"color": "amarillo claro", "pH": 6.5, "proteínas": "negativo", "glucosa": "negativo"}),
            ("Perfil bioquímico", {"ALT": "35 U/L", "creatinina": "1.1 mg/dL", "glucosa": "95 mg/dL", "BUN": "18 mg/dL"}),
            ("Coprocultivo", {"resultado": "Negativo para parásitos", "observaciones": "Muestra en buenas condiciones"}),
        ]
        for patient in random.sample(patients, min(12, len(patients))):
            test_name, results = random.choice(lab_types)
            lr = LabResult(
                tenant_id=tenant.id, patient_id=patient.id,
                test_type=test_name, results=results,
            )
            db.add(lr)
        await db.flush()

        # --- Appointments ---
        print("📅  Creando citas...")
        reasons = ["Control anual", "Vacunación", "Revisión post-operatoria", "Consulta dermatológica",
                   "Desparasitación", "Limpieza dental", "Revisión de herida", "Control peso"]
        statuses_past = [AppointmentStatus.COMPLETED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]
        statuses_future = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]

        today = date.today()
        for i in range(35):
            patient = random.choice(patients)
            vet = random.choice(vets)
            is_future = i < 10

            if is_future:
                apt_date = today + timedelta(days=random.randint(1, 21))
                apt_status = random.choice(statuses_future)
            else:
                apt_date = today - timedelta(days=random.randint(1, 90))
                apt_status = random.choice(statuses_past)

            hour = random.choice([9, 10, 11, 12, 14, 15, 16, 17])
            start = time(hour, 0)
            end = time(hour + 1, 0)

            apt = Appointment(
                tenant_id=tenant.id, patient_id=patient.id,
                client_id=(await db.get(Patient, patient.id)).client_id,
                veterinarian_id=vet.id,
                date=apt_date, start_time=start, end_time=end,
                status=apt_status, reason=random.choice(reasons),
            )
            db.add(apt)
        await db.flush()

        # --- Inventory ---
        print("📦  Creando inventario...")
        products: list[Product] = []
        for name, cat, sku, unit, stock, min_s, price in PRODUCTS_DATA:
            prod = Product(tenant_id=tenant.id, name=name, category=cat, sku=sku,
                           unit=unit, stock_quantity=stock, min_stock=min_s, price=price)
            db.add(prod)
            products.append(prod)
        await db.flush()

        # Stock movements
        admin_user = users[0]
        for prod in products:
            mov = StockMovement(
                tenant_id=tenant.id, product_id=prod.id,
                movement_type=MovementType.IN,
                quantity=prod.stock_quantity,
                reason="Stock inicial",
                created_by=admin_user.id,
            )
            db.add(mov)
        await db.flush()

        # --- Invoices ---
        print("💰  Creando facturas...")
        services = [
            ("Consulta general", 1, 25000.0),
            ("Vacunación rabia", 1, 15000.0),
            ("Examen hemograma", 1, 18000.0),
            ("Desparasitación", 1, 12000.0),
            ("Limpieza dental", 1, 45000.0),
            ("Cirugía menor", 1, 120000.0),
            ("Hospitalización (1 día)", 1, 35000.0),
            ("Radiografía", 1, 28000.0),
        ]

        for i in range(12):
            client = random.choice(clients)
            n_items = random.randint(1, 3)
            chosen = random.sample(services, n_items)

            subtotal = sum(qty * price for _, qty, price in chosen)
            tax = round(subtotal * 0.19)
            total = subtotal + tax
            is_paid = i < 8

            invoice = Invoice(
                tenant_id=tenant.id, client_id=client.id,
                invoice_number=f"F-2024-{i+1:04d}",
                subtotal=subtotal, tax=tax, total=total,
                status=InvoiceStatus.PAID if is_paid else InvoiceStatus.ISSUED,
                issued_at=random_dt(90, 1),
                paid_at=random_dt(60, 1) if is_paid else None,
            )
            db.add(invoice)
            await db.flush()

            for desc, qty, unit_price in chosen:
                item = InvoiceItem(invoice_id=invoice.id, description=desc,
                                   quantity=qty, unit_price=unit_price, total=qty * unit_price)
                db.add(item)

            if is_paid:
                payment = Payment(
                    tenant_id=tenant.id, invoice_id=invoice.id,
                    amount=total,
                    payment_method=random.choice(["tarjeta", "efectivo", "transferencia"]),
                )
                db.add(payment)
        await db.flush()

        await db.commit()

    print()
    print("=" * 60)
    print("✅  Datos demo creados exitosamente")
    print("=" * 60)
    print(f"  Clínica:    {TENANT_NAME}")
    print(f"  Clientes:   {len(CLIENTS_DATA)}")
    print(f"  Pacientes:  {len(PATIENTS_DATA)}")
    print()
    print("  CREDENCIALES DE ACCESO:")
    print("  ─────────────────────────────────────────")
    for u in USERS:
        role_label = u['role'].value.capitalize()
        print(f"  [{role_label:14s}] {u['email']} / {u['password']}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
