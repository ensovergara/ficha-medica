"""
Rutas públicas del portal de reservas.
No requieren autenticación de staff. Algunas requieren JWT de cliente (magic link).
Prefijo: /public/{slug}
"""
import secrets
import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.availability import compute_available_slots
from app.core.security import create_access_token, decode_token
from app.database import get_db
from app.models.appointment import Appointment, AppointmentSource, AppointmentStatus
from app.models.client import Client
from app.models.patient import Patient
from app.models.portal_magic_link import PortalMagicLink
from app.models.schedule import VeterinarianSchedule
from app.models.service import Service, VeterinarianService
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.appointment import AppointmentResponse
from app.schemas.schedule import AvailableSlot

router = APIRouter(prefix="/public", tags=["Public Booking"])

optional_bearer = HTTPBearer(auto_error=False)


# ─── Schemas internos del portal ─────────────────────────────────────────────

class PublicTenantInfo(BaseModel):
    id: uuid.UUID
    name: str
    logo_url: str | None
    phone: str | None
    email: str | None
    address: str | None


class PublicServiceInfo(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    duration_minutes: int
    price: float | None

    model_config = {"from_attributes": True}


class PublicVetInfo(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str


class PublicBookingRequest(BaseModel):
    veterinarian_id: uuid.UUID
    service_id: uuid.UUID
    date: date
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    # Datos de contacto del cliente
    guest_name: str = Field(..., min_length=2, max_length=200)
    guest_email: EmailStr
    guest_phone: str | None = Field(None, max_length=20)
    # Datos de la mascota
    pet_name: str = Field(..., min_length=1, max_length=100)
    pet_species: str = Field(..., min_length=1, max_length=50)
    pet_age_years: int | None = Field(None, ge=0, le=50)
    # Motivo
    reason: str | None = Field(None, max_length=500)


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkVerify(BaseModel):
    token: str


class PortalTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    client_id: uuid.UUID | None


class PublicAppointmentInfo(BaseModel):
    id: uuid.UUID
    date: date
    start_time: str
    end_time: str | None
    status: str
    service_name: str | None
    vet_name: str
    pet_name: str

    model_config = {"from_attributes": True}


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _get_tenant_by_slug(db: AsyncSession, slug: str) -> Tenant:
    result = await db.execute(
        select(Tenant).where(Tenant.slug == slug, Tenant.is_active == True)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    return tenant


async def _get_portal_client(
    db: AsyncSession,
    credentials: HTTPAuthorizationCredentials | None,
    tenant_id: uuid.UUID,
) -> Client | None:
    """Devuelve el Client si el JWT de portal es válido, None si no hay token."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "portal":
        return None
    client_id = payload.get("sub")
    if not client_id:
        return None
    result = await db.execute(
        select(Client).where(
            Client.id == uuid.UUID(client_id),
            Client.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


# ─── Endpoints públicos ───────────────────────────────────────────────────────

@router.get("/{slug}", response_model=PublicTenantInfo)
async def get_tenant_info(slug: str, db: AsyncSession = Depends(get_db)):
    """Info pública de la clínica (nombre, logo, contacto)."""
    tenant = await _get_tenant_by_slug(db, slug)
    return PublicTenantInfo(
        id=tenant.id,
        name=tenant.name,
        logo_url=tenant.logo_url,
        phone=tenant.phone,
        email=tenant.email,
        address=tenant.address,
    )


@router.get("/{slug}/services", response_model=list[PublicServiceInfo])
async def list_public_services(slug: str, db: AsyncSession = Depends(get_db)):
    """Servicios activos disponibles para reservar."""
    tenant = await _get_tenant_by_slug(db, slug)
    result = await db.execute(
        select(Service)
        .where(Service.tenant_id == tenant.id, Service.is_active == True)
        .order_by(Service.name)
    )
    return result.scalars().all()


@router.get("/{slug}/vets", response_model=list[PublicVetInfo])
async def list_public_vets(
    slug: str,
    service_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Veterinarios disponibles, opcionalmente filtrados por servicio."""
    tenant = await _get_tenant_by_slug(db, slug)

    query = select(User).where(
        User.tenant_id == tenant.id,
        User.is_active == True,
        User.role == UserRole.VETERINARIO,
    )

    if service_id:
        # Solo vets que tienen asignado ese servicio
        assigned = await db.execute(
            select(VeterinarianService.veterinarian_id).where(
                VeterinarianService.service_id == service_id
            )
        )
        vet_ids = [row[0] for row in assigned.all()]
        if not vet_ids:
            return []
        query = query.where(User.id.in_(vet_ids))

    result = await db.execute(query.order_by(User.first_name))
    vets = result.scalars().all()
    return [PublicVetInfo(id=v.id, first_name=v.first_name, last_name=v.last_name) for v in vets]


@router.get("/{slug}/availability", response_model=list[AvailableSlot])
async def get_public_availability(
    slug: str,
    veterinarian_id: uuid.UUID = Query(...),
    target_date: date = Query(..., alias="date"),
    service_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Slots disponibles para un vet, fecha y servicio. Sin autenticación."""
    tenant = await _get_tenant_by_slug(db, slug)
    return await compute_available_slots(db, veterinarian_id, target_date, service_id, tenant.id)


@router.post("/{slug}/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def public_book_appointment(
    slug: str,
    data: PublicBookingRequest,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
):
    """
    Reservar una cita desde el portal público.
    - Si el email ya existe como cliente → vincula la cita al cliente existente.
    - Si no existe → crea un nuevo Client + Patient automáticamente.
    - Si hay JWT de portal válido → usa ese cliente.
    """
    tenant = await _get_tenant_by_slug(db, slug)

    # Validar que el servicio pertenece al tenant
    svc_result = await db.execute(
        select(Service).where(
            Service.id == data.service_id,
            Service.tenant_id == tenant.id,
            Service.is_active == True,
        )
    )
    service = svc_result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    # Validar que el vet pertenece al tenant y tiene ese servicio
    vet_result = await db.execute(
        select(User).where(
            User.id == data.veterinarian_id,
            User.tenant_id == tenant.id,
            User.is_active == True,
        )
    )
    vet = vet_result.scalar_one_or_none()
    if not vet:
        raise HTTPException(status_code=404, detail="Veterinario no encontrado")

    # Verificar disponibilidad del slot
    from datetime import time as dt_time
    h, m = map(int, data.start_time.split(":"))
    start_time = dt_time(h, m)

    available_slots = await compute_available_slots(
        db, data.veterinarian_id, data.date, data.service_id, tenant.id
    )
    slot_times = [s.start_time for s in available_slots]
    if start_time not in slot_times:
        raise HTTPException(status_code=409, detail="El horario seleccionado ya no está disponible")

    end_minutes = h * 60 + m + service.duration_minutes
    end_time = dt_time(end_minutes // 60, end_minutes % 60)

    # Buscar o crear cliente
    portal_client = await _get_portal_client(db, credentials, tenant.id)
    if portal_client:
        client = portal_client
    else:
        # Buscar por email en el tenant
        client_result = await db.execute(
            select(Client).where(
                Client.email == data.guest_email,
                Client.tenant_id == tenant.id,
            )
        )
        client = client_result.scalar_one_or_none()
        if not client:
            # Crear nuevo cliente
            name_parts = data.guest_name.strip().split(" ", 1)
            client = Client(
                tenant_id=tenant.id,
                first_name=name_parts[0],
                last_name=name_parts[1] if len(name_parts) > 1 else "",
                email=data.guest_email,
                phone=data.guest_phone,
            )
            db.add(client)
            await db.flush()

    # Buscar o crear paciente (mascota) por nombre + cliente
    patient_result = await db.execute(
        select(Patient).where(
            Patient.client_id == client.id,
            Patient.name == data.pet_name,
            Patient.tenant_id == tenant.id,
        )
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        from datetime import date as dt_date
        birth_date = None
        if data.pet_age_years is not None:
            birth_date = dt_date(dt_date.today().year - data.pet_age_years, 1, 1)
        patient = Patient(
            tenant_id=tenant.id,
            client_id=client.id,
            name=data.pet_name,
            species=data.pet_species,
            birth_date=birth_date,
        )
        db.add(patient)
        await db.flush()

    # Crear la cita
    appointment = Appointment(
        tenant_id=tenant.id,
        patient_id=patient.id,
        client_id=client.id,
        veterinarian_id=data.veterinarian_id,
        service_id=data.service_id,
        date=data.date,
        start_time=start_time,
        end_time=end_time,
        status=AppointmentStatus.SCHEDULED,
        source=AppointmentSource.PORTAL,
        reason=data.reason,
        guest_name=data.guest_name if not portal_client else None,
        guest_phone=data.guest_phone if not portal_client else None,
    )
    db.add(appointment)
    await db.flush()
    await db.refresh(appointment)

    # Enviar email de confirmación (best-effort, no falla la reserva si falla el email)
    try:
        from app.core.email import send_appointment_confirmation
        await send_appointment_confirmation(
            to=data.guest_email,
            tenant_name=tenant.name,
            guest_name=data.guest_name,
            date=data.date.strftime("%d/%m/%Y"),
            time=data.start_time,
            vet_name=f"{vet.first_name} {vet.last_name}",
            service_name=service.name,
            pet_name=data.pet_name,
        )
    except Exception:
        pass

    return appointment


# ─── Magic Link ───────────────────────────────────────────────────────────────

@router.post("/{slug}/auth/magic-link", status_code=status.HTTP_202_ACCEPTED)
async def request_magic_link(
    slug: str,
    data: MagicLinkRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Solicita un magic link al email. Siempre devuelve 202 para no exponer
    si el email existe. El email se envía en background.
    """
    tenant = await _get_tenant_by_slug(db, slug)

    # Invalidar links anteriores no usados para este email+tenant
    old_links_result = await db.execute(
        select(PortalMagicLink).where(
            PortalMagicLink.email == data.email,
            PortalMagicLink.tenant_id == tenant.id,
            PortalMagicLink.used == False,
        )
    )
    for old in old_links_result.scalars().all():
        old.used = True

    # Buscar si el email ya existe como cliente
    client_result = await db.execute(
        select(Client).where(
            Client.email == data.email,
            Client.tenant_id == tenant.id,
        )
    )
    client = client_result.scalar_one_or_none()

    token = secrets.token_urlsafe(32)
    magic_link = PortalMagicLink(
        tenant_id=tenant.id,
        email=data.email,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        client_id=client.id if client else None,
    )
    db.add(magic_link)
    await db.flush()

    # Enviar email (importación diferida para no fallar si Resend no está configurado)
    try:
        from app.core.email import send_magic_link_email
        from app.config import settings as app_settings
        portal_url = f"{app_settings.FRONTEND_URL}/book/{slug}/portal?token={token}"
        await send_magic_link_email(
            to=data.email,
            tenant_name=tenant.name,
            magic_link_url=portal_url,
        )
    except Exception:
        # En demo sin email configurado, el token puede obtenerse por otro medio
        pass

    return {"message": "Si el email existe, recibirás un enlace de acceso en breve"}


@router.post("/{slug}/auth/verify", response_model=PortalTokenResponse)
async def verify_magic_link(
    slug: str,
    data: MagicLinkVerify,
    db: AsyncSession = Depends(get_db),
):
    """Valida el token del magic link y devuelve un JWT de portal."""
    tenant = await _get_tenant_by_slug(db, slug)

    result = await db.execute(
        select(PortalMagicLink).where(
            PortalMagicLink.token == data.token,
            PortalMagicLink.tenant_id == tenant.id,
            PortalMagicLink.used == False,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=400, detail="Token inválido o ya utilizado")
    if link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")

    link.used = True
    await db.flush()

    # JWT de portal con type="portal" para distinguirlo del JWT de staff
    subject = str(link.client_id) if link.client_id else link.email
    token = create_access_token(
        data={"sub": subject, "type": "portal", "tenant_id": str(tenant.id)},
        expires_delta=timedelta(days=7),
    )

    return PortalTokenResponse(access_token=token, client_id=link.client_id)


# ─── Portal autenticado (historial de citas) ─────────────────────────────────

@router.get("/{slug}/portal/appointments", response_model=list[PublicAppointmentInfo])
async def get_my_appointments(
    slug: str,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(optional_bearer),
):
    """Historial de citas del cliente autenticado via magic link JWT."""
    tenant = await _get_tenant_by_slug(db, slug)

    if not credentials:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")

    client = await _get_portal_client(db, credentials, tenant.id)
    if not client:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    result = await db.execute(
        select(Appointment)
        .where(
            Appointment.client_id == client.id,
            Appointment.tenant_id == tenant.id,
        )
        .order_by(Appointment.date.desc(), Appointment.start_time.desc())
    )
    appointments = result.scalars().all()

    output = []
    for appt in appointments:
        # Nombre del servicio
        service_name = None
        if appt.service_id:
            svc_r = await db.execute(select(Service).where(Service.id == appt.service_id))
            svc = svc_r.scalar_one_or_none()
            service_name = svc.name if svc else None

        # Nombre del vet
        vet_r = await db.execute(select(User).where(User.id == appt.veterinarian_id))
        vet = vet_r.scalar_one_or_none()
        vet_name = f"{vet.first_name} {vet.last_name}" if vet else "—"

        # Nombre de la mascota
        patient_r = await db.execute(select(Patient).where(Patient.id == appt.patient_id))
        patient = patient_r.scalar_one_or_none()
        pet_name = patient.name if patient else "—"

        output.append(
            PublicAppointmentInfo(
                id=appt.id,
                date=appt.date,
                start_time=appt.start_time.strftime("%H:%M"),
                end_time=appt.end_time.strftime("%H:%M") if appt.end_time else None,
                status=appt.status.value,
                service_name=service_name,
                vet_name=vet_name,
                pet_name=pet_name,
            )
        )

    return output


@router.patch("/{slug}/portal/appointments/{appointment_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_my_appointment(
    slug: str,
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(optional_bearer),
):
    """Cancelar una cita propia. Solo si faltan más de 2 horas."""
    tenant = await _get_tenant_by_slug(db, slug)

    if not credentials:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")

    client = await _get_portal_client(db, credentials, tenant.id)
    if not client:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.client_id == client.id,
            Appointment.tenant_id == tenant.id,
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if appt.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="La cita ya está cancelada")

    # No cancelar si la cita es en menos de 2 horas
    appt_datetime = datetime.combine(appt.date, appt.start_time).replace(tzinfo=timezone.utc)
    if appt_datetime - datetime.now(timezone.utc) < timedelta(hours=2):
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar con menos de 2 horas de anticipación",
        )

    appt.status = AppointmentStatus.CANCELLED
    await db.flush()
    return {"message": "Cita cancelada correctamente"}
