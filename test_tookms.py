import requests, json

url = 'https://strong-roughy-199744.upstash.io'
token = 'gQAAAAAAAwxAAQIgcDI3ZmJjMTMyOTJkYzM0NDE5OGE0OWYxNWI1YWY1ODJlNQ'
h = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}

# Check multiple hosts for tookMs
r = requests.post(url + '/pipeline', headers=h, json=[
    ['GET', 'ollama:host:88.198.12.12'],
    ['GET', 'ollama:host:49.12.7.186'],
    ['GET', 'ollama:host:149.56.14.203'],
])
for item in r.json():
    if item.get('result'):
        host = json.loads(item['result'])
        print(f"{host['ip']}: tookMs={host.get('tookMs', 'N/A')}, lastSeen={host.get('lastSeen', 'N/A')}")
