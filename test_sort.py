import requests

base = 'https://ollama-explorer.tanle.cc.cd'

# Test sorting
print("Test 1: Sort by tookMs (asc)")
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 10, 'sortBy': 'tookMs', 'sortOrder': 'asc'})
d = r.json()
for x in d['results']:
    print(f'  {x["ip"]} - lastSeen: {x.get("lastSeen", "N/A")}')

print("\nTest 2: Sort by lastSeen (desc)")
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 10, 'sortBy': 'lastSeen', 'sortOrder': 'desc'})
d = r.json()
for x in d['results']:
    print(f'  {x["ip"]} - lastSeen: {x.get("lastSeen", "N/A")}')

print("\nTest 3: Sort by ip (asc)")
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 10, 'sortBy': 'ip', 'sortOrder': 'asc'})
d = r.json()
for x in d['results']:
    print(f'  {x["ip"]}')
