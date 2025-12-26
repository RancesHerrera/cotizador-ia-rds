import requests
import time
import subprocess
import sys

PORT = 8002

def start_server():
    print(f"Starting server on port {PORT}...")
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORT)], 
                            cwd=".", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(5)
    return proc

def test_financials():
    server = start_server()
    base_url = f"http://127.0.0.1:{PORT}"
    
    try:
        # Create Project
        resp = requests.post(f"{base_url}/projects/", json={"name": "FinTest Project", "client_name": "Bank Corp", "raw_requirements": "Test info"})
        resp.raise_for_status()
        proj_id = resp.json()['id']
        print(f"Project Created: {proj_id}")

        # Create Quote with Financials
        # Scenario: Cost 1000. Risk 10% (100). CostBase 1100. Margin 20%. Price = 1100 / 0.8 = 1375.
        quote_payload = {
            "project_id": proj_id,
            "applied_margin": 0.20,
            "applied_risk": 0.10,
            "applied_tax": 0.16,
            "ai_raw_input": "none"
        }
        resp = requests.post(f"{base_url}/quotes/", json=quote_payload)
        resp.raise_for_status()
        quote_id = resp.json()['id']
        print(f"Quote Created: {quote_id} with 20% Margin, 10% Risk")

        # Create Quote Items
        # Item 1: 10 hours * 100 rate = 1000 cost.
        item_payload = {
            "role_id": 1,
            "description": "Dev Work",
            "manual_hours": 10.0,
            "hourly_rate": 100.0,
            "ai_suggested_hours": 5.0
        }
        resp = requests.post(f"{base_url}/quotes/{quote_id}/items/", json=item_payload)
        resp.raise_for_status()
        print("Item Created")

        # Verify Calculations
        # Expected:
        # Subtotal Cost = 1000
        # Risk = 100
        # Gross Cost = 1100
        # Price (Gross Margin Formula) = 1100 / (1 - 0.20) = 1100 / 0.8 = 1375.0
        # Tax = 1375 * 0.16 = 220
        # Total Final = 1595.0
        
        resp = requests.get(f"{base_url}/quotes/{quote_id}")
        data = resp.json()
        
        print("\n--- Financial Check ---")
        print(f"Total Cost (Calc): {data['total_cost']}")
        print(f"Total Price (Calc): {data['total_price']}")
        
        expected_price = 1595.0
        actual_price = data['total_price']
        
        # Allow small float error
        if abs(actual_price - expected_price) < 0.1:
            print("SUCCESS: Financial Logic Verified.")
        else:
            print(f"FAILURE: Expected {expected_price}, got {actual_price}")
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        try:
            print(resp.text)
        except: pass
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    test_financials()
