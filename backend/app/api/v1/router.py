from fastapi import APIRouter

from app.api.v1 import (
    appointments,
    auth,
    booking,
    clients,
    fhir,
    inventory,
    invoices,
    medical_records,
    patients,
    pdf,
    portal,
    reports,
    schedules,
    search,
    services,
    stats,
    subscriptions,
    tenants,
    users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(fhir.router)
api_router.include_router(tenants.router)
api_router.include_router(users.router)
api_router.include_router(clients.router)
api_router.include_router(patients.router)
api_router.include_router(medical_records.router)
api_router.include_router(appointments.router)
api_router.include_router(services.router)
api_router.include_router(schedules.router)
api_router.include_router(inventory.router)
api_router.include_router(invoices.router)
api_router.include_router(subscriptions.router)
api_router.include_router(stats.router)
api_router.include_router(search.router)
api_router.include_router(reports.router)
api_router.include_router(pdf.router)
api_router.include_router(portal.router)
api_router.include_router(booking.router)
