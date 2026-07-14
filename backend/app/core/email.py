"""
Abstracción de envío de emails. Proveedor actual: Resend.
Para cambiar a SendGrid/Mailgun basta implementar EmailProvider y
actualizar EMAIL_PROVIDER en settings.
"""
import logging
from abc import ABC, abstractmethod

from app.config import settings

logger = logging.getLogger(__name__)


class EmailProvider(ABC):
    @abstractmethod
    async def send(self, *, to: str, subject: str, html: str) -> None: ...


class ResendProvider(EmailProvider):
    def __init__(self, api_key: str, from_address: str):
        self.api_key = api_key
        self.from_address = from_address

    async def send(self, *, to: str, subject: str, html: str) -> None:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "from": self.from_address,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
                timeout=10,
            )
        if response.status_code not in (200, 201):
            logger.error("Resend error %s: %s", response.status_code, response.text)
            raise RuntimeError(f"Email send failed: {response.status_code}")


class ConsoleProvider(EmailProvider):
    """Fallback para desarrollo: imprime el email en consola."""
    async def send(self, *, to: str, subject: str, html: str) -> None:
        logger.info("📧 [DEV EMAIL] To: %s | Subject: %s\n%s", to, subject, html)


def get_email_provider() -> EmailProvider:
    api_key = getattr(settings, "RESEND_API_KEY", None)
    from_address = getattr(settings, "EMAIL_FROM", "noreply@fichamed.ica.local")
    if api_key:
        return ResendProvider(api_key=api_key, from_address=from_address)
    return ConsoleProvider()


# ─── Templates ────────────────────────────────────────────────────────────────

def _magic_link_html(tenant_name: str, magic_link_url: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 480px; margin: 40px auto; color: #333;">
        <h2 style="color: #2563eb;">Acceder a tu portal - {tenant_name}</h2>
        <p>Haz clic en el botón para acceder a tu historial de citas:</p>
        <a href="{magic_link_url}"
           style="display:inline-block; padding: 12px 24px; background:#2563eb;
                  color:#fff; border-radius:6px; text-decoration:none; font-weight:bold;">
            Ingresar al portal
        </a>
        <p style="margin-top:24px; font-size:13px; color:#666;">
            Este enlace es válido por 30 minutos y solo puede usarse una vez.<br>
            Si no solicitaste esto, puedes ignorar este mensaje.
        </p>
    </body>
    </html>
    """


def _appointment_confirmation_html(
    tenant_name: str,
    guest_name: str,
    date: str,
    time: str,
    vet_name: str,
    service_name: str,
    pet_name: str,
) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; max-width: 480px; margin: 40px auto; color: #333;">
        <h2 style="color: #16a34a;">✅ Cita confirmada - {tenant_name}</h2>
        <p>Hola <strong>{guest_name}</strong>, tu cita ha sido agendada.</p>
        <table style="border-collapse:collapse; width:100%; margin-top:16px;">
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Mascota</strong></td>
                <td style="padding:8px; border:1px solid #e5e7eb;">{pet_name}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Servicio</strong></td>
                <td style="padding:8px; border:1px solid #e5e7eb;">{service_name}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Fecha</strong></td>
                <td style="padding:8px; border:1px solid #e5e7eb;">{date}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Hora</strong></td>
                <td style="padding:8px; border:1px solid #e5e7eb;">{time}</td></tr>
            <tr><td style="padding:8px; border:1px solid #e5e7eb;"><strong>Veterinario</strong></td>
                <td style="padding:8px; border:1px solid #e5e7eb;">{vet_name}</td></tr>
        </table>
        <p style="margin-top:24px; font-size:13px; color:#666;">
            Puedes cancelar con al menos 2 horas de anticipación desde el portal.
        </p>
    </body>
    </html>
    """


# ─── Funciones de alto nivel ─────────────────────────────────────────────────

async def send_magic_link_email(*, to: str, tenant_name: str, magic_link_url: str) -> None:
    provider = get_email_provider()
    await provider.send(
        to=to,
        subject=f"Tu enlace de acceso - {tenant_name}",
        html=_magic_link_html(tenant_name, magic_link_url),
    )


async def send_appointment_confirmation(
    *,
    to: str,
    tenant_name: str,
    guest_name: str,
    date: str,
    time: str,
    vet_name: str,
    service_name: str,
    pet_name: str,
) -> None:
    provider = get_email_provider()
    await provider.send(
        to=to,
        subject=f"Cita confirmada - {tenant_name}",
        html=_appointment_confirmation_html(
            tenant_name, guest_name, date, time, vet_name, service_name, pet_name
        ),
    )
