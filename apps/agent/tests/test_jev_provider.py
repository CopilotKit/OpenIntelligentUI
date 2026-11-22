import pytest

from src.credentials import Credentials, current_credentials, server_credentials_available
from src.visualization_router import jev_url, request_options


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in ("JEV_PROVIDER", "JEV_MODEL", "TYPESAFE_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY", "LLM_MODEL"):
        monkeypatch.delenv(name, raising=False)


def test_typesafe_is_the_default(monkeypatch):
    monkeypatch.setenv("TYPESAFE_API_KEY", "ts-secret")
    options = request_options([])
    assert jev_url() == "https://api.typesafe.ai/v1/systemone"
    assert options["json"]["model"] == "jev-latest"
    assert options["headers"]["Authorization"] == "Bearer ts-secret"


def test_openrouter_uses_its_endpoint_key_and_model(monkeypatch):
    monkeypatch.setenv("JEV_PROVIDER", "openrouter")
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-secret")
    monkeypatch.setenv("TYPESAFE_API_KEY", "ts-secret")
    options = request_options([])
    assert jev_url() == "https://openrouter.ai/api/alpha/decisions"
    assert options["json"]["model"] == "typesafe/jev-1.14"
    assert options["headers"]["Authorization"] == "Bearer or-secret"
    monkeypatch.setenv("JEV_MODEL", "typesafe/jev-1.13")
    assert request_options([])["json"]["model"] == "typesafe/jev-1.13"


def test_openrouter_without_its_key_names_the_missing_variable(monkeypatch):
    monkeypatch.setenv("JEV_PROVIDER", "openrouter")
    monkeypatch.setenv("TYPESAFE_API_KEY", "ts-secret")
    with pytest.raises(ValueError, match="OPENROUTER_API_KEY"):
        request_options([])


def test_unknown_provider_is_rejected_without_fallback(monkeypatch):
    monkeypatch.setenv("JEV_PROVIDER", "other")
    monkeypatch.setenv("TYPESAFE_API_KEY", "ts-secret")
    with pytest.raises(ValueError, match="JEV_PROVIDER"):
        jev_url()


def test_visitor_provider_choice_overrides_the_server_setting(monkeypatch):
    monkeypatch.setenv("JEV_PROVIDER", "openrouter")
    monkeypatch.setenv("JEV_MODEL", "server-model")
    token = current_credentials.set(Credentials("visitor-openai", "visitor-jev"))
    try:
        assert jev_url() == "https://api.typesafe.ai/v1/systemone"
        assert request_options([])["json"]["model"] == "jev-latest"
    finally:
        current_credentials.reset(token)
    token = current_credentials.set(Credentials("visitor-openai", "visitor-jev", "openrouter"))
    try:
        assert jev_url() == "https://openrouter.ai/api/alpha/decisions"
        assert request_options([])["json"]["model"] == "typesafe/jev-1.14"
    finally:
        current_credentials.reset(token)


def test_server_credentials_follow_the_selected_provider(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai")
    monkeypatch.setenv("OPENROUTER_API_KEY", "or")
    assert not server_credentials_available()
    monkeypatch.setenv("JEV_PROVIDER", "openrouter")
    assert server_credentials_available()
    monkeypatch.setenv("JEV_PROVIDER", "typesafe")
    monkeypatch.setenv("TYPESAFE_API_KEY", "ts")
    assert server_credentials_available()
