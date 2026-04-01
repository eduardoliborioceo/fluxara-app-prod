import re
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app
from app.utils.text import normalize_username


_SPECIAL_CHARS = r'[@$#!%&*\-_+=?]'


def validate_password_policy(password: str, username: str = '') -> list:
    errors = []
    if len(password) < 10:
        errors.append('Mínimo de 10 caracteres')
    if not re.search(r'[A-Z]', password):
        errors.append('Pelo menos uma letra maiúscula')
    if not re.search(r'[a-z]', password):
        errors.append('Pelo menos uma letra minúscula')
    if not re.search(r'\d', password):
        errors.append('Pelo menos um número')
    if not re.search(_SPECIAL_CHARS, password):
        errors.append('Pelo menos um caractere especial (@$#!%&*-_+=?)')
    if username and len(username) >= 3 and username.lower() in password.lower():
        errors.append('Não pode conter seu nome de usuário')
    if 'fluxara' in password.lower():
        errors.append('Não pode conter o nome do sistema')
    return errors

from app.auth.repository import (
    get_user_by_provider,
    create_user,
    create_local_user,
    get_user_by_username,
    count_users,
    get_user_by_id,
    update_user_password,
    get_user_by_matricula,
    update_profile_image,
    remove_profile_image as _repo_remove_profile_image,
    create_password_reset_token,
    get_password_reset_token,
    mark_token_as_used,
    update_user_role as _repo_update_user_role,
)

from app.auth.profile_repository import upsert_profile

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

# =====================================================
# OAUTH
# =====================================================
def get_or_create_user(profile, provider):
    provider_id = str(profile["id"])
    email = profile["email"]
    username = email.split("@")[0]

    user = get_user_by_provider(provider, provider_id)
    if user:
        return user

    from app.auth.repository import get_user_by_email

    existing_user = get_user_by_email(email)
    if existing_user:
        return existing_user

    return create_user({
        "username": username,
        "email": email,
        "provider": provider,
        "provider_id": provider_id
    })

# ====================================================
# REGISTER
# =====================================================
def generate_username(full_name: str) -> str:
    parts = full_name.strip().split()
    raw_username = f"{parts[0]}.{parts[-1]}"
    return normalize_username(raw_username)


def generate_special_matricula(user_type: str) -> str:
    """
    Gera matrícula interna para:
    PJ, DIRECTOR, OWNER
    """

    from app.extensions import get_db
    from psycopg.rows import dict_row

    prefix_map = {
        "PJ": "PJ-",
        "DIRECTOR": "DIR-",
        "OWNER": "OWR-"
    }

    prefix = prefix_map.get(user_type)
    if not prefix:
        return None

    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM users
                WHERE matricula LIKE %s
            """, (f"{prefix}%",))
            total = cur.fetchone()["total"] + 1

    return f"{prefix}{str(total).zfill(6)}"


def register_user(form):

    if form["password"] != form["password_confirm"]:
        raise ValueError("As senhas não conferem")

    full_name = form["full_name"]
    username = generate_username(full_name)

    policy_errors = validate_password_policy(form["password"], username)
    if policy_errors:
        raise ValueError(policy_errors[0])

    password_hash = generate_password_hash(form["password"])
    is_first_user = count_users() == 0

    user_type = form.get("user_type") or "PJ"
    matricula = generate_special_matricula(user_type)

    return create_local_user({
        "username": username,
        "email": form["email"],
        "full_name": full_name,
        "matricula": matricula,
        "setor": form.get("setor") or "",
        "password_hash": password_hash,
        "is_active": True,
        "is_admin": is_first_user,
        "is_owner": is_first_user,
        "user_type": user_type
    })

# =====================================================
# LOGIN LOCAL
# =====================================================
def authenticate_local(username, password):
    user = get_user_by_username(username)

    if not user:
        return None

    if not user["is_active"]:
        return "PENDING"

    if not check_password_hash(user["password_hash"], password):
        return None

    return user

# =====================================================
# PASSWORD
# =====================================================
def change_user_password(user_id, current_password, new_password, confirm_password):
    if not new_password:
        return "EMPTY"

    if new_password != confirm_password:
        raise ValueError("Nova senha e confirmação não conferem")

    user = get_user_by_id(user_id)

    if not check_password_hash(user["password_hash"], current_password):
        raise ValueError("Senha atual incorreta")

    if check_password_hash(user["password_hash"], new_password):
        raise ValueError("A nova senha não pode ser igual à senha atual")

    policy_errors = validate_password_policy(new_password, user.get("username", ""))
    if policy_errors:
        raise ValueError(policy_errors[0])

    update_user_password(user_id, new_password)

    return "OK"

# =====================================================
# PROFILE + EMPLOYEE LINK
# =====================================================
def attach_employee_and_profile(user_id: int, form):
    upsert_profile(user_id, form)

def confirm_employee_extra(identifier: str, password: str):
    """
    Confirma assinatura por:
    - matrícula (CLT)
    - username (PJ / Diretor / Admin)
    """

    identifier = identifier.strip()

    user = get_user_by_matricula(identifier)
    
    if not user:
        from app.auth.repository import get_user_by_username
        user = get_user_by_username(identifier)

    if not user:
        return {"success": False, "error": "Usuário não encontrado"}

    if not user["is_active"]:
        return {"success": False, "error": "Usuário inativo"}

    if not check_password_hash(user["password_hash"], password):
        return {"success": False, "error": "Senha inválida"}

    return {
        "success": True,
        "username": user["username"]
    }

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def _cloudinary_config():
    import cloudinary
    cloudinary.config(
        cloud_name=current_app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=current_app.config["CLOUDINARY_API_KEY"],
        api_secret=current_app.config["CLOUDINARY_API_SECRET"]
    )

def save_profile_image(user_id: int, file):
    import cloudinary.uploader

    if not file or file.filename == "":
        return None

    _cloudinary_config()

    result = cloudinary.uploader.upload(
        file,
        public_id=f"fluxara/avatars/user_{user_id}",
        overwrite=True,
        resource_type="image",
        transformation=[{"width": 400, "height": 400, "crop": "fill", "gravity": "face"}]
    )

    url = result["secure_url"]
    update_profile_image(user_id, url)
    return url

def remove_profile_image(user_id: int):
    import cloudinary.uploader

    _cloudinary_config()

    try:
        cloudinary.uploader.destroy(f"fluxara/avatars/user_{user_id}")
    except Exception:
        pass

    _repo_remove_profile_image(user_id)

# =====================================================
# ROLE MANAGEMENT
# =====================================================
def update_user_role(user_id: int, role: str):
    target = get_user_by_id(user_id)
    if not target:
        raise ValueError("Usuário não encontrado")

    if target.get("is_owner") and role != "admin":
        raise ValueError("O owner do sistema não pode ter seu acesso de administrador removido")

    _repo_update_user_role(user_id, role)

# =====================================================
# RESET SENHA
# =====================================================
def request_password_reset(email: str):
    from app.extensions import get_db
    from psycopg.rows import dict_row
    from app.services.email_service import send_email
    from flask import url_for

    with get_db() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM users WHERE email=%s", (email,))
            user = cur.fetchone()

    if not user:
        return None

    token = create_password_reset_token(user["id"])

    reset_url = url_for(
        "auth.reset_password_route",
        token=token,
        _external=True
    )

    subject = "Redefinição de senha - WorkCost"
    body = f"""
Olá {user.get('full_name') or user.get('username')},

Você solicitou a redefinição de senha.

Clique no link abaixo para criar uma nova senha:

{reset_url}

Este link expira em 1 hora.

Se você não solicitou isso, ignore este email.
"""

    send_email(user["email"], subject, body)

    return token

def reset_password(token: str, new_password: str):
    token_data = get_password_reset_token(token)
    if not token_data:
        raise ValueError("Token inválido ou expirado")

    policy_errors = validate_password_policy(new_password)
    if policy_errors:
        raise ValueError(policy_errors[0])

    update_user_password(token_data["user_id"], new_password)
    mark_token_as_used(token)
