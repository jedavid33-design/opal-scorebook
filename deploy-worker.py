#!/usr/bin/env python3
"""Deploy opal-scorebook-sync worker with D1 binding."""
import sys
sys.path.insert(0, '/opt/hatch/skills/skill-creator/bin')
from dynamic_credentials import add_surrogate_to_request
import urllib.request
import json
import uuid

ALLOWED_HOSTS = ("api.cloudflare.com",)
CREDENTIAL_NAME = "custom.cloudflare"

ACCOUNT_ID = "b35ff435ff24d134ff640e0099dd13fc"
SCRIPT_NAME = "opal-scorebook-sync"
WORKER_FILE = "/home/hatch/workspace/github-repos/opal-scorebook/worker.js"
COMPATIBILITY_DATE = "2024-01-01"

bindings = [
    {"type": "d1", "name": "DB", "id": "7d01fe99-c41d-4926-9d83-3c7ad718b3ff"},
]

metadata = {
    "compatibility_date": COMPATIBILITY_DATE,
    "bindings": bindings,
    "main_module": "worker.js",
}

with open(WORKER_FILE) as f:
    script_content = f.read()

boundary = f"----{uuid.uuid4().hex}"
lines = []
lines.append(f"--{boundary}")
lines.append('Content-Disposition: form-data; name="metadata"')
lines.append('Content-Type: application/json')
lines.append('')
lines.append(json.dumps(metadata))
lines.append(f"--{boundary}")
lines.append('Content-Disposition: form-data; name="main_module"; filename="worker.js"')
lines.append('Content-Type: application/javascript+module')
lines.append('')
lines.append(script_content)
lines.append(f"--{boundary}--")
lines.append('')
body = '\r\n'.join(lines).encode('utf-8')

url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT_NAME}"
req = urllib.request.Request(url, data=body, method='PUT')
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
req.add_header('User-Agent', 'muse-cloudflare-skill')
add_surrogate_to_request(req, CREDENTIAL_NAME, entry_name="access_token", allowed_hosts=ALLOWED_HOSTS)

print("Uploading worker...", file=sys.stderr)
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
        if result.get('success'):
            print("OK")
        else:
            print("FAILED:", json.dumps(result)[:500], file=sys.stderr)
            sys.exit(1)
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read()[:500], file=sys.stderr)
    sys.exit(1)
