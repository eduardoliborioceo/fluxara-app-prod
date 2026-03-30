from flask import current_app
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import smtplib
from email.message import EmailMessage


def send_email(to_email: str, subject: str, body: str):
    """
    Serviço centralizado de envio de email.

    Estratégia:
    1️⃣ Se SENDGRID_API_KEY estiver configurado → usa SendGrid
    2️⃣ Caso contrário → tenta SMTP
    3️⃣ Nunca quebra a aplicação silenciosamente
    """

    config = current_app.config

    if config.get("SENDGRID_API_KEY") and config.get("SENDGRID_FROM"):
        try:
            message = Mail(
                from_email=config["SENDGRID_FROM"],
                to_emails=to_email,
                subject=subject,
                plain_text_content=body,
            )

            sg = SendGridAPIClient(config["SENDGRID_API_KEY"])
            sg.send(message)

            return True

        except Exception as e:
            current_app.logger.error(f"SendGrid error: {e}")
            return False

    if config.get("SMTP_HOST"):
        try:
            msg = EmailMessage()
            msg["From"] = config.get("SMTP_FROM")
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.set_content(body)

            with smtplib.SMTP(
                config["SMTP_HOST"],
                config.get("SMTP_PORT", 587)
            ) as server:

                if config.get("SMTP_USE_TLS", True):
                    server.starttls()

                if config.get("SMTP_USERNAME"):
                    server.login(
                        config["SMTP_USERNAME"],
                        config["SMTP_PASSWORD"]
                    )

                server.send_message(msg)

            return True

        except Exception as e:
            current_app.logger.error(f"SMTP error: {e}")
            return False

    current_app.logger.warning(
        "Email not sent: no SENDGRID or SMTP configured."
    )
    return False
