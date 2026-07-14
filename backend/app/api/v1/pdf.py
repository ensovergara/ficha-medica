import io
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_tenant_id
from app.models.consultation import Consultation
from app.models.medical_record import MedicalRecord
from app.models.patient import Patient
from app.models.tenant import Tenant
from app.models.user import User
from app.models.vaccination import Vaccination

router = APIRouter(prefix="/pdf", tags=["PDF"])


@router.get("/patient/{patient_id}/medical-record")
async def generate_medical_record_pdf(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
):
    # Fetch data
    patient_r = await db.execute(select(Patient).where(Patient.id == patient_id, Patient.tenant_id == tenant_id))
    patient = patient_r.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    tenant_r = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_r.scalar_one_or_none()

    records_r = await db.execute(select(MedicalRecord).where(MedicalRecord.patient_id == patient_id, MedicalRecord.tenant_id == tenant_id))
    records = records_r.scalars().all()

    record_ids = [r.id for r in records]
    consultations = []
    if record_ids:
        cons_r = await db.execute(select(Consultation).where(Consultation.medical_record_id.in_(record_ids)).order_by(Consultation.created_at.desc()))
        consultations = cons_r.scalars().all()

    vac_r = await db.execute(select(Vaccination).where(Vaccination.patient_id == patient_id, Vaccination.tenant_id == tenant_id).order_by(Vaccination.created_at.desc()))
    vaccinations = vac_r.scalars().all()

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=20, textColor=colors.HexColor("#2563eb"))
    h2_style = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#1e40af"))
    normal = styles["Normal"]

    # Header
    clinic_name = tenant.name if tenant else "Veterinaria"
    story.append(Paragraph(f"🐾 {clinic_name}", title_style))
    story.append(Paragraph("Ficha Médica del Paciente", styles["Heading2"]))
    story.append(Spacer(1, 0.4*cm))

    # Patient info
    story.append(Paragraph("Datos del Paciente", h2_style))
    patient_data = [
        ["Nombre:", patient.name, "Especie:", patient.species or "-"],
        ["Raza:", patient.breed or "-", "Sexo:", patient.sex or "-"],
        ["Nacimiento:", str(patient.birth_date or "-"), "Peso:", f"{patient.weight} kg" if patient.weight else "-"],
        ["Microchip:", patient.microchip or "-", "Estado:", "Activo" if patient.is_active else "Inactivo"],
    ]
    t = Table(patient_data, colWidths=[3*cm, 6*cm, 3*cm, 5*cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    # Consultations
    story.append(Paragraph("Historial de Consultas", h2_style))
    if consultations:
        for c in consultations:
            story.append(Spacer(1, 0.2*cm))
            date_str = c.created_at.strftime("%d/%m/%Y %H:%M") if c.created_at else "-"
            story.append(Paragraph(f"<b>Fecha:</b> {date_str}", normal))
            if c.reason: story.append(Paragraph(f"<b>Motivo:</b> {c.reason}", normal))
            if c.diagnosis: story.append(Paragraph(f"<b>Diagnóstico:</b> {c.diagnosis}", normal))
            if c.treatment: story.append(Paragraph(f"<b>Tratamiento:</b> {c.treatment}", normal))
            if c.weight_at_visit or c.temperature:
                story.append(Paragraph(f"<b>Peso:</b> {c.weight_at_visit or '-'} kg  |  <b>Temperatura:</b> {c.temperature or '-'} °C", normal))
            story.append(Paragraph("─" * 80, ParagraphStyle("sep", fontSize=6, textColor=colors.HexColor("#e2e8f0"))))
    else:
        story.append(Paragraph("Sin consultas registradas.", normal))

    story.append(Spacer(1, 0.5*cm))

    # Vaccinations
    story.append(Paragraph("Vacunas", h2_style))
    if vaccinations:
        vac_table_data = [["Vacuna", "Lote", "Próxima dosis", "Fecha"]]
        for v in vaccinations:
            vac_table_data.append([
                v.vaccine_name,
                v.batch_number or "-",
                str(v.next_dose_date or "-"),
                v.created_at.strftime("%d/%m/%Y") if v.created_at else "-",
            ])
        vt = Table(vac_table_data, colWidths=[6*cm, 3*cm, 4*cm, 4*cm])
        vt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(vt)
    else:
        story.append(Paragraph("Sin vacunas registradas.", normal))

    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"Generado el {date.today().strftime('%d/%m/%Y')} por FichaMédica SaaS", ParagraphStyle("footer", fontSize=8, textColor=colors.gray)))

    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ficha-{patient.name.lower().replace(' ', '-')}.pdf"},
    )
