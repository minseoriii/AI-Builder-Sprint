def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "polaris" in data["service"].lower()


def test_ready(client):
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.json()
    assert "database_configured" in data
    assert "upstage_configured" in data
    assert "supabase_auth_configured" in data
