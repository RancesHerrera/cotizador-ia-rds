import requests
import time
import subprocess
import sys
import os

DB_FILE = "sql_app.db"
PORT = 8001 # Use different port to avoid conflict if zombie exists

def start_server():
    # Start server process
    print(f"Starting server on port {PORT}...")
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORT)], 
                            cwd=".", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(4) # Wait for startup
    return proc

def stop_server(proc):
    print("Stopping server...")
    proc.terminate()
    proc.wait()
    time.sleep(2) # Wait for port release

def test_flow():
    # 1. Start Server
    server = start_server()
    base_url = f"http://127.0.0.1:{PORT}"
    
    try:
        print("--- PHASE 1: Write Data ---")
        # Create Role
        role_payload = {"name": "Persistence Tester", "hourly_rate": 99.9}
        r = requests.post(f"{base_url}/roles/", json=role_payload)
        r.raise_for_status()
        role_id = r.json()['id']
        print(f"Created Role ID: {role_id}")

        # Update Config
        req_config = {"key": "persistence_check", "value_float": 123.456}
        r = requests.post(f"{base_url}/config/", json=req_config)
        r.raise_for_status()
        print("Updated Config 'persistence_check'")

    except Exception as e:
        print(f"Error in Phase 1: {e}")
        stop_server(server)
        sys.exit(1)

    # 2. Stop Server
    stop_server(server)

    # 3. Restart Server
    print("--- PHASE 2: Verify Persistence ---")
    server = start_server()
    
    try:
        # Verify Role
        r = requests.get(f"{base_url}/roles/")
        roles = r.json()
        found_role = next((r for r in roles if r['name'] == "Persistence Tester"), None)
        if found_role and found_role['hourly_rate'] == 99.9:
            print("SUCCESS: Role persisted.")
        else:
            print(f"FAILURE: Role not found or wrong data: {roles}")
            sys.exit(1)

        # Verify Config
        r = requests.get(f"{base_url}/config/")
        configs = r.json()
        found_conf = next((c for c in configs if c['key'] == "persistence_check"), None)
        if found_conf and found_conf['value_float'] == 123.456:
            print("SUCCESS: Config persisted.")
        else:
            print(f"FAILURE: Config not found or wrong data: {configs}")
            sys.exit(1)

        # Cleanup
        requests.delete(f"{base_url}/roles/{role_id}")
        
    except Exception as e:
        print(f"Error in Phase 2: {e}")
        sys.exit(1)
    finally:
        stop_server(server)

if __name__ == "__main__":
    test_flow()
