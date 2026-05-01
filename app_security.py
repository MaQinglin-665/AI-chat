import ipaddress
import os
import urllib.parse


def normalize_origin(origin):
    raw = str(origin or "").strip()
    if not raw:
        return ""
    try:
        parsed = urllib.parse.urlsplit(raw)
    except Exception:
        return ""
    scheme = str(parsed.scheme or "").lower()
    host = str(parsed.hostname or "").strip().lower()
    if scheme not in {"http", "https"} or not host:
        return ""
    port = parsed.port
    default_port = 80 if scheme == "http" else 443
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    if port and port != default_port:
        return f"{scheme}://{host}:{int(port)}"
    return f"{scheme}://{host}"


def is_loopback_host(hostname):
    host = str(hostname or "").strip().lower()
    if not host:
        return False
    if host.startswith("[") and host.endswith("]"):
        host = host[1:-1]
    if host == "localhost":
        return True
    try:
        return bool(ipaddress.ip_address(host).is_loopback)
    except Exception:
        return False


def get_server_security_settings(config, api_token_env_default="TAFFY_API_TOKEN"):
    server_cfg = config.get("server", {}) if isinstance(config, dict) else {}
    allow_loopback = bool(server_cfg.get("cors_allow_loopback", True))
    raw_allow = server_cfg.get("cors_allowed_origins", [])
    if isinstance(raw_allow, str):
        raw_allow = [raw_allow]
    allowed_origins = set()
    if isinstance(raw_allow, list):
        for item in raw_allow[:64]:
            norm = normalize_origin(item)
            if norm:
                allowed_origins.add(norm)
    token_env = str(server_cfg.get("api_token_env", api_token_env_default) or api_token_env_default).strip()
    token_env = token_env or api_token_env_default
    expected_token = str(server_cfg.get("api_token", "") or "").strip()
    if not expected_token:
        expected_token = str(os.environ.get(token_env, "") or "").strip()
    require_token = bool(server_cfg.get("require_api_token", False))
    return {
        "allow_loopback": allow_loopback,
        "allowed_origins": allowed_origins,
        "api_token_env": token_env,
        "expected_api_token": expected_token,
        "require_api_token": require_token,
    }
