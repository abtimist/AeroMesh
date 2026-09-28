import requests
api_key = "2f2145987bdc36005d649c8ede7b2ba05a783665beefb1015cd5154fd89fe12c"
headers = {"X-API-Key": api_key}
r = requests.get("https://api.openaq.org/v3/locations?limit=2", headers=headers)
print(r.status_code, r.text[:200])
