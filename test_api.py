import requests
import json

base = 'https://ollama-explorer.tanle.cc.cd'

# Test 1: Basic search
print("Test 1: Basic search")
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 5})
d = r.json()
print(f"  Total: {d['size']}, took: {d['took']}ms")
for x in d['results']:
    print(f"    {x['ip']} - {x.get('title', 'N/A')}")

# Test 2: Model filter
print("\nTest 2: Model filter (DeepSeek)")
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'model': 'DeepSeek', 'per': 5})
d = r.json()
print(f"  Total: {d['size']}")

# Test 3: Sort by tookMs
print("\nTest 3: Sort by tookMs (asc)")
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'sortBy': 'tookMs', 'sortOrder': 'asc', 'per': 5})
d = r.json()
print(f"  Total: {d['size']}, took: {d['took']}ms")
for x in d['results']:
    print(f"    {x['ip']} - {x.get('tookMs', 'N/A')}ms")

# Test 4: Sort by lastSeen
print("\nTest 4: Sort by lastSeen (desc)")
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'sortBy': 'lastSeen', 'sortOrder': 'desc', 'per': 5})
d = r.json()
print(f"  Total: {d['size']}, took: {d['took']}ms")
for x in d['results']:
    print(f"    {x['ip']} - lastSeen: {x.get('lastSeen', 'N/A')}")

# Test 5: Models API
print("\nTest 5: Models API")
r = requests.get(f'{base}/api/models')
d = r.json()
print(f"  Total models: {d['total']}")
for m in d['models'][:5]:
    print(f"    {m['name']}: {m['count']} hosts")

# Test 6: Stats API
print("\nTest 6: Stats API")
r = requests.get(f'{base}/api/stats')
d = r.json()
print(f"  Hosts: {d['hosts']}, Models: {d['models']}")

# Test 7: Frontend
print("\nTest 7: Frontend")
r = requests.get(base)
print(f"  Status: {r.status_code}, Length: {len(r.text)}")
