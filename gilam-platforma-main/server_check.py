import paramiko, subprocess, time, os
os.environ["PYTHONIOENCODING"] = "utf-8"

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
        for l in out.strip().split("\n")[-10:]: print(f"  {l}")
    if err.strip():
        for l in err.strip().split("\n")[-3:]: print(f"  ! {l}")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect("localhost", port=2222, username="root", password="testpassword", timeout=15)
    print("SSH orqali ulandi!\n")
    
    print("=== RAM VA DISK ===")
    run(ssh, "free -m")
    run(ssh, "df -h /")
    
    print("\n=== JARAYONLAR (PROCESSES) ===")
    run(ssh, "pgrep -af 'node dist/main' || echo 'Gilam Backend: OFF'")
    run(ssh, "pgrep -af 'next start' || echo 'Gilam Frontend: OFF'")
    run(ssh, "pgrep -af 'cloudflared tunnel' || echo 'Tunnels: OFF'")
    run(ssh, "service nginx status | grep Active")
    run(ssh, "service postgresql status | grep Active")
    
    print("\n=== XIZMATLAR TEKSHIRUVI (CURL) ===")
    run(ssh, "curl -s -o /dev/null -w 'Gilam Frontend (3001): %{http_code}\n' http://localhost:3001/ || echo 'Gilam Frontend: FAIL'")
    run(ssh, "curl -s -o /dev/null -w 'Gilam Backend (8081): %{http_code}\n' http://localhost:8081/api || echo 'Gilam Backend: FAIL'")
    
    ssh.close()
except Exception as e:
    print(f"SSH ulanishda xatolik: {e}")

proxy.terminate()
print("\nDIAGNOSTIKA TUGADI!")
