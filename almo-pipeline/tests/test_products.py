import pytest
from app.services.parser_service import parse_file
from app.services import product_service
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# ── PARSER TESTS ──

def test_parse_file_returns_correct_count():
    sample = "ID|Name|price|inventory|UPC\n1234|samsung TV 32|12.99|10|167889000\n1235|LG TV 43|25.99|5|167889001"
    result = parse_file(sample)
    assert len(result) == 2

def test_parse_file_correct_fields():
    sample = "ID|Name|price|inventory|UPC\n1234|samsung TV 32|12.99|10|167889000"
    result = parse_file(sample)
    assert result[0]["name"] == "samsung TV 32"
    assert result[0]["price"] == 12.99
    assert result[0]["inventory"] == 10
    assert result[0]["upc"] == "167889000"

def test_parse_skips_header():
    sample = "ID|Name|price|inventory|UPC\n1234|samsung TV 32|12.99|10|167889000"
    result = parse_file(sample)
    assert result[0]["name"] != "Name"

# ── API TESTS ──

def test_sync_endpoint():
    response = client.post("/api/products/sync")
    assert response.status_code == 200
    assert "products synced" in response.json()["message"]

def test_get_all_endpoint():
    response = client.get("/api/products/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_one_endpoint():
    response = client.get("/api/products/1")
    assert response.status_code == 200

def test_delete_endpoint():
    response = client.delete("/api/products/1")
    assert response.status_code == 200