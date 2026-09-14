"""Service layer (Fase A): business logic outside the routers.

Routers validate/transport; services operate. No FastAPI dependencies:
they receive a Session + DTOs and return models or plain types.
"""
