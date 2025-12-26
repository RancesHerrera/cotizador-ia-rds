import requests
import time
import subprocess
import sys

PORT = 8004

def start_server():
    print(f"Starting server on port {PORT}...")
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORT)], 
                            cwd=".", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(5)
    return proc

def test_full_integration():
    server = start_server()
    base_url = f"http://127.0.0.1:{PORT}"
    
    try:
        print("--- 0. Setup Roles ---")
        # Ensure we have roles for AI to pick
        roles_to_create = [
            {"name": "Senior Backend Developer", "hourly_rate": 60.0},
            {"name": "Frontend Developer", "hourly_rate": 50.0},
            {"name": "UI/UX Designer", "hourly_rate": 55.0}
        ]
        for r_data in roles_to_create:
            # Try create, ignore if exists (endpoint returns 400 if exists, logic might vary so simple try/except or ignore check)
            # Actually our endpoint returns 400 if exists.
            requests.post(f"{base_url}/roles/", json=r_data)

        print("--- 1. Create Project (Ecommerce) ---")
        p_data = {"name": "Test Ecommerce", "client_name": "Shopify Clone", "raw_requirements": "Quiero una web de ecommerce con base de datos y api de pagos"}
        r = requests.post(f"{base_url}/projects/", json=p_data)
        r.raise_for_status()
        pid = r.json()['id']
        print(f"Project ID: {pid}")

        print("--- 2. Create Quote ---")
        q_data = {"project_id": pid, "applied_margin": 0.2, "applied_risk": 0.1, "applied_tax": 0.16}
        r = requests.post(f"{base_url}/quotes/", json=q_data)
        r.raise_for_status()
        qid = r.json()['id']
        print(f"Quote ID: {qid}")

        print("--- 3. Generate Scope with IA (Mock) ---")
        # Should detect 'web', 'db', 'api' keywords
        r = requests.post(f"{base_url}/quotes/{qid}/generate-scope")
        r.raise_for_status()
        items = r.json()
        print(f"Generated {len(items)} items:")
        for i in items:
            print(f" - {i['description']} ({i['manual_hours']}h)")
        
        if len(items) < 2:
            print("FAILURE: AI suggested too few items.")
            sys.exit(1)

        print("--- 4. Verify Financials ---")
        r = requests.get(f"{base_url}/quotes/{qid}")
        data = r.json()
        print(f"Total Price: ${data['total_price']}")
        
        if data['total_price'] <= 0:
            print("FAILURE: Price is zero.")
            sys.exit(1)
            
        print("SUCCESS: Full Flow Integration Verified.")

    except Exception as e:
        print(f"Error: {e}")
        try: print(r.text) 
        except: pass
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    test_full_integration()
