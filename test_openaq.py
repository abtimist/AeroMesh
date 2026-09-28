import requests

api_key = "5db181c04002576701cb40804dc2f0a81ac7115215c0b93584860a0b6772e73b"

headers = {"X-API-Key": api_key}
print("Testing X-API-Key header...")
r = requests.get("https://api.openaq.org/v3/locations?limit=2", headers=headers)
print(r.status_code, r.text)

print("\nTesting Authorization: Bearer ...")
r = requests.get("https://api.openaq.org/v3/locations?limit=2", headers={"Authorization": f"Bearer {api_key}"})
print(r.status_code, r.text)

print("\nTesting ?api_key=...")
r = requests.get(f"https://api.openaq.org/v3/locations?limit=2&api_key={api_key}")
print(r.status_code, r.text)
