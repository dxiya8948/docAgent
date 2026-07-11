import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config.settings import SETTINGS_FILE, DEFAULT_SETTINGS
import os


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def cleanup():
    if os.path.exists(SETTINGS_FILE):
        os.remove(SETTINGS_FILE)
    yield
    if os.path.exists(SETTINGS_FILE):
        os.remove(SETTINGS_FILE)


class TestAPI:
    def test_health_check(self, client):
        response = client.get("/api/health")
        
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

    def test_root_endpoint(self, client):
        response = client.get("/")
        
        assert response.status_code == 200
        assert "Document Q&A System API" in response.json()["message"]

    def test_get_settings(self, client):
        response = client.get("/api/settings")
        
        assert response.status_code == 200
        data = response.json()
        assert "current_provider" in data
        assert "providers" in data
        assert "embedding" in data

    def test_update_settings(self, client):
        settings = DEFAULT_SETTINGS.copy()
        settings["current_provider"] = "ollama"
        settings["stream"] = False
        settings["max_history_messages"] = 5
        
        response = client.put("/api/settings", json=settings)
        
        assert response.status_code == 200
        assert response.json() == {"success": True}

    def test_get_current_provider(self, client):
        response = client.get("/api/settings/provider")
        
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data
        assert "config" in data

    def test_set_current_provider(self, client):
        request_data = {
            "provider_type": "openai",
            "config": {"api_key": "test-key", "model": "gpt-4"}
        }
        
        response = client.post("/api/settings/provider", json=request_data)
        
        assert response.status_code == 200
        assert response.json()["success"] == True
        assert response.json()["provider"] == "openai"

    def test_get_available_providers(self, client):
        response = client.get("/api/settings/providers")
        
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert isinstance(data["providers"], list)
        assert "openai" in data["providers"]

    def test_list_documents_empty(self, client):
        response = client.get("/api/documents")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_conversations_empty(self, client):
        response = client.get("/api/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert isinstance(data["conversations"], list)

    def test_get_conversation_not_found(self, client):
        response = client.get("/api/conversations/non-existent-id")
        
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data

    def test_delete_conversation_not_found(self, client):
        response = client.delete("/api/conversations/non-existent-id")
        
        assert response.status_code == 404

    def test_get_document_status_not_found(self, client):
        response = client.get("/api/documents/non-existent-id/status")
        
        assert response.status_code == 404

    def test_delete_document_not_found(self, client):
        response = client.delete("/api/documents/non-existent-id")
        
        assert response.status_code == 404

    def test_get_embedding_config(self, client):
        response = client.get("/api/settings/embedding")
        
        assert response.status_code == 200
        data = response.json()
        assert "provider_type" in data
        assert "model" in data

    def test_update_embedding_config(self, client):
        config = {
            "provider_type": "openai",
            "api_key": "embed-key",
            "model": "text-embedding-3-small"
        }
        
        response = client.put("/api/settings/embedding", json=config)
        
        assert response.status_code == 200
        assert response.json()["success"] == True

    def test_get_stats(self, client):
        response = client.get("/api/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "conversation_count" in data
        assert "message_count" in data
        assert "user_message_count" in data
        assert "assistant_message_count" in data

    def test_get_all_messages(self, client):
        response = client.get("/api/messages")
        
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)

    def test_update_feedback_not_found(self, client):
        response = client.put("/api/messages/9999/feedback", params={"feedback": 1})
        
        assert response.status_code == 404

    def test_list_local_models(self, client):
        response = client.get("/api/models/local/list")
        
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert isinstance(data["models"], list)

    def test_wiki_status(self, client):
        response = client.get("/api/documents/wiki/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "updated_at" in data
        assert "prompt_docs_count" in data
        assert "rag_docs_count" in data
