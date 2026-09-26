import urllib.request
try:
    req = urllib.request.Request("https://huggingface.co/api/models/convaiinnovations/laya")
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
