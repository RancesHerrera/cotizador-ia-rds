import requests
import time
import subprocess
import sys

# Start server process
server_process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", "8000"], cwd=".", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print("Starting server...")
time.sleep(5) # Wait for server to start

try:
    # ... (Root and Create tests same as before) ...
    resp = requests.get("http://127.0.0.1:8000/")
    print(f"Root: {resp.json()}")

    # 2. Create Role
    role_data = {"name": "Senior Backend Developer", "hourly_rate": 60.0}
    resp = requests.post("http://127.0.0.1:8000/roles/", json=role_data)
    if resp.status_code == 200:
        print("Role Created:", resp.json())
        role_id = resp.json()['id']
    else:
        print("Error creating role:", resp.text)
        sys.exit(1)

    # 2b. Update Role (NEW)
    update_data = {"name": "Senior Backend Dev (Updated)", "hourly_rate": 75.0}
    resp = requests.put(f"http://127.0.0.1:8000/roles/{role_id}", json=update_data)
    print("Role Updated:", resp.json())

    # 3. List Roles
    resp = requests.get("http://127.0.0.1:8000/roles/")
    print("Roles List:", resp.json())

    # 4. Set Config (NEW STRUCTURE)
    # Test float value
    config_float = {"key": "default_margin", "value_float": 0.30}
    resp = requests.post("http://127.0.0.1:8000/config/", json=config_float)
    print("Config Float Set:", resp.json())

    # Test text value
    config_text = {"key": "openai_model", "value_text": "gpt-4o"}
    resp = requests.post("http://127.0.0.1:8000/config/", json=config_text)
    print("Config Text Set:", resp.json())

    # 5. Delete Role (NEW)
    resp = requests.delete(f"http://127.0.0.1:8000/roles/{role_id}")
    print("Role Deleted:", resp.json())

    # Verify Deletion
    resp = requests.get("http://127.0.0.1:8000/roles/")
    print("Roles List (After Delete):", resp.json())

finally:
    server_process.terminate() # Fixed method name
    print("Server stopped.")
