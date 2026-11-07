import httpx
import sys

def run_tests():
    base = "http://127.0.0.1:8000/api"
    print("Testing Health...")
    r = httpx.get(f"{base}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[OK] Health:", r.json())

    print("\nTesting Triage Engine...")
    triage_payload = {
        "transcript": "gai khana nahi kha rahi aur pet phool gaya hai",
        "symptoms": ["bloat", "not eating"],
        "eating_change": "off feed"
    }
    r = httpx.post(f"{base}/cases/triage", json=triage_payload)
    assert r.status_code == 200, f"Triage failed: {r.text}"
    res = r.json()
    assert res["urgency_level"] == "urgent", "Triage should detect urgent bloat"
    print("[OK] Deterministic Red Flag Triage:", res["urgency_level"])

    print("\nTesting Case Creation...")
    case_payload = {
        "animal_type": "cow",
        "animal_identifier": "Kamadhenu",
        "language": "odia",
        "transcript": "Cow not eating and bloated left side",
        "urgency_level": "urgent",
        "urgency_reasons": ["[RED FLAG] Suspected acute bloat"],
        "district": "Khordha",
        "village": "Jatni",
        "farmer_name": "Subash Mohapatra",
        "farmer_phone": "9876543210"
    }
    r = httpx.post(f"{base}/cases", json=case_payload)
    assert r.status_code == 200, f"Create case failed: {r.text}"
    case_data = r.json()
    case_id = case_data["id"]
    ref = case_data["public_reference"]
    print(f"[OK] Case Created: ID={case_id}, Ref={ref}")

    print("\nTesting Case Status Update...")
    r = httpx.patch(f"{base}/cases/{case_id}/status", json={
        "status": "under_review",
        "reason": "Reviewing with block veterinary dispensary",
        "changed_by": "Dr. P. Mishra"
    })
    assert r.status_code == 200
    updated = r.json()
    assert updated["status"] == "under_review"
    assert len(updated["status_history"]) >= 2
    print("[OK] Status Update & Audit Trail:", updated["status"], "History count:", len(updated["status_history"]))

    print("\nTesting Vet Services...")
    r = httpx.get(f"{base}/veterinary-services")
    assert r.status_code == 200
    vets = r.json()
    assert len(vets) > 0
    print(f"[OK] Vet Directory: {len(vets)} facilities found")

    print("\n=== ALL BACKEND API TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
