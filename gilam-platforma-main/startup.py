import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

# Dependency-free custom .env parser
def load_env_file(filepath=".env"):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        os.environ[key.strip()] = val.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Warning: Could not parse {filepath}: {e}")

# Load .env in the script's directory if present
load_env_file(os.path.join(os.path.dirname(__file__), ".env"))

GILAM_TOKEN = os.getenv("GILAM_TOKEN", "eyJhIjoiMDI5NDc1MzY0YWNjNDEzY2Q2Y2YzNWVkOGU0MjEzNGIiLCJ0IjoiYzk4ZmU3YmQtZDJhMi00MmFmLWI3YzItMTcwNWE1NGExMjQ3IiwicyI6Ik16WmpOVFU0TmpZdE5EaGhPUzAwTTJObExUaG1ZMlV0TmpneE56Y3lNVFUwTlRNME56Sm1ZVGcxT0dFdE1HSTJZaTAwTVRZM0xXSTRaamt0TnpjMVpHUm1Zemt4T1RSayJ9")
MAKTAB_TOKEN = os.getenv("MAKTAB_TOKEN", "eyJhIjoiMDI5NDc1MzY0YWNjNDEzY2Q2Y2YzNWVkOGU0MjEzNGIiLCJ0IjoiNTAxY2FmZGMtZmNmZi00NmExLTk4MjctMmU3MTRmMGRjODMwIiwicyI6Ik1XSXdPV0l4TURJdE16QmxNUzAwWW1RekxXSXhZek10TkdJelpUazRZV0pqTmpsbCJ9")
GILAM_DIR = "/root/gilam-platforma"
MAKTAB_DIR = "/root/maktab-platforma"


proxy = subprocess.Popen(
    ["cloudflared", "access", "tcp", "--hostname", "server.uzinc.uz", "--url", "localhost:2222"],
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
time.sleep(5)

def run(ssh, cmd, timeout=60):
    print(f"$ {cmd[:150]}")
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    out = o.read().decode(errors="replace")
    err = e.read().decode(errors="replace")
    if out.strip():
        for l in out.strip().split("\n")[-5:]: print(f"  {l}")
    if err.strip():
        for l in err.strip().split("\n")[-3:]: print(f"  ! {l}")

def fire(ssh, cmd):
    print(f"$ [bg] {cmd[:100]}")
    ssh.exec_command(cmd)
    time.sleep(2)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
print("Ulandi!\n")

print("=== 1. XIZMATLARNI YOQISH ===")
run(ssh, "service postgresql start")
run(ssh, "service nginx start")

print("\n=== 2. MAKTAB PLATFORMA ===")
run(ssh, "pkill -f 'java -jar' 2>/dev/null")
fire(ssh, f"cd {MAKTAB_DIR}/backend && nohup java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/maktabdb --spring.datasource.username=postgres --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=update > /var/log/maktab-backend.log 2>&1 &")

print("\n=== 3. GILAM PLATFORMA ===")
run(ssh, "pkill -f 'node dist/main' 2>/dev/null; pkill -f 'next start' 2>/dev/null")
fire(ssh, f"cd {GILAM_DIR}/backend && DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD= DB_NAME=gilam_saas JWT_SECRET=gilam-saas-jwt-secret-key-2026 FIREBASE_SERVICE_ACCOUNT_PATH={GILAM_DIR}/backend/firebase-service-account.json nohup node dist/main > /var/log/gilam-backend.log 2>&1 &")
time.sleep(5)
fire(ssh, f"cd {GILAM_DIR}/frontend-app && BACKEND_URL=http://localhost:3000 PORT=3001 nohup npx next start -p 3001 > /var/log/gilam-frontend.log 2>&1 &")

print("\n=== 4. CLOUDFLARE TUNNELS ===")
run(ssh, "killall -9 cloudflared 2>/dev/null; > /var/log/gilam-tunnel.log; > /var/log/maktab-tunnel.log")
fire(ssh, f"nohup cloudflared tunnel run --token {GILAM_TOKEN} >> /var/log/gilam-tunnel.log 2>&1 &")
fire(ssh, f"nohup cloudflared tunnel run --token {MAKTAB_TOKEN} >> /var/log/maktab-tunnel.log 2>&1 &")

print("\nKutish (15s)...")
time.sleep(15)

print("\n=== YAKUNIY HOLAT ===")
run(ssh, "pgrep -af 'node dist/main' || echo 'Gilam Backend: OFF'")
run(ssh, "pgrep -af 'next start' || echo 'Gilam Frontend: OFF'")
run(ssh, "pgrep -af 'java -jar' || echo 'Maktab Backend: OFF'")
run(ssh, "pgrep -c cloudflared && echo ' tunnels running'")
run(ssh, "curl -s -o /dev/null -w 'Gilam Frontend: %{http_code}\n' http://localhost:3001/")
run(ssh, "curl -s -o /dev/null -w 'Maktab Frontend: %{http_code}\n' http://localhost/")

ssh.close()
proxy.terminate()
print("\nBARCHA XIZMATLAR QAYTA ISHGA TUSHIRILDI!")
