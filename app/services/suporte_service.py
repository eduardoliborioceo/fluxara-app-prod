from app.repositories import suporte_repository as repo

TIPOS_VALIDOS = ('reclamacao', 'sugestao', 'elogio', 'denuncia', 'solicitacao')
STATUS_VALIDOS = ('pendente', 'lido', 'resolvido')

_TIPO_LABELS = {
    'reclamacao': 'Reclamação', 'sugestao': 'Sugestão', 'elogio': 'Elogio',
    'denuncia': 'Denúncia', 'solicitacao': 'Solicitação',
}


def send_ticket(user_id: int, tipo: str, mensagem: str) -> dict:
    if tipo not in TIPOS_VALIDOS:
        raise ValueError('Tipo inválido')
    mensagem = mensagem.strip()
    if not mensagem:
        raise ValueError('Mensagem obrigatória')
    if len(mensagem) > 3000:
        raise ValueError('Mensagem muito longa')
    row = repo.create_ticket(user_id, tipo, mensagem)
    _notify_admins_new_ticket(tipo)
    return row


def _notify_admins_new_ticket(tipo: str) -> None:
    try:
        from app.services.push_service import send_to_user
        tipo_label = _TIPO_LABELS.get(tipo, tipo)
        for admin_id in repo.get_admin_user_ids():
            send_to_user(
                admin_id,
                title=f'Novo chamado: {tipo_label}',
                body='Um usuário abriu um chamado. Acesse o painel de suporte.',
                url='/admin/suporte',
            )
    except Exception:
        pass


def get_tickets(user_id: int) -> list:
    return repo.get_tickets_by_user(user_id)


def get_chat(user_id: int, after_id: int = 0) -> list:
    return repo.get_chat_messages(user_id, after_id)


def send_chat_message(user_id: int, mensagem: str) -> dict:
    mensagem = mensagem.strip()
    if not mensagem:
        raise ValueError('Mensagem obrigatória')
    if len(mensagem) > 2000:
        raise ValueError('Mensagem muito longa')
    return repo.create_chat_message(user_id, 'user', mensagem)


def send_especialista_reply(user_id: int, mensagem: str) -> dict:
    mensagem = mensagem.strip()
    if not mensagem:
        raise ValueError('Mensagem obrigatória')
    return repo.create_chat_message(user_id, 'especialista', mensagem)


def get_all_conversations() -> list:
    return repo.get_all_conversations()


def get_chat_admin(user_id: int) -> list:
    return repo.get_chat_by_user_id(user_id)


def get_all_tickets() -> list:
    return repo.get_all_tickets()


def update_ticket_status(ticket_id: int, status: str) -> None:
    if status not in STATUS_VALIDOS:
        raise ValueError('Status inválido')
    repo.update_ticket_status(ticket_id, status)


def respond_to_ticket(ticket_id: int, resposta: str) -> None:
    resposta = resposta.strip()
    if not resposta:
        raise ValueError('Resposta obrigatória')
    if len(resposta) > 3000:
        raise ValueError('Resposta muito longa')
    ticket = repo.get_ticket_by_id(ticket_id)
    if not ticket:
        raise ValueError('Ticket não encontrado')
    repo.respond_ticket(ticket_id, resposta)
    _notify_user_ticket_responded(ticket['user_id'])


def _notify_user_ticket_responded(user_id: int) -> None:
    try:
        from app.services.push_service import send_to_user
        from app.auth.repository import get_user_by_id
        user = get_user_by_id(user_id)
        username = user['username'] if user else 'usuário'
        send_to_user(
            user_id,
            title='Chamado resolvido',
            body=f'Prezado(a), {username}, informamos que seu chamado foi atendido. Fluxara agradece sua contribuição.',
            url='/suporte',
        )
    except Exception:
        pass
