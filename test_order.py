import requests, time

base = 'https://ollama-explorer.tanle.cc.cd'

print("Test 1: Basic search (no sort param)")
results = []
for i in range(10):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 20})
    d = r.json()
    ips = [x['ip'] for x in d['results']]
    results.append(ips)
    print(f'Call {i+1}: {ips}')
    time.sleep(0.3)
print(f'All consistent: {all(r == results[0] for r in results)}')

print("\nTest 2: Sort by lastSeen desc")
results = []
for i in range(10):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 20, 'sortBy': 'lastSeen', 'sortOrder': 'desc'})
    d = r.json()
    ips = [x['ip'] for x in d['results']]
    results.append(ips)
    print(f'Call {i+1}: {ips}')
    time.sleep(0.3)
print(f'All consistent: {all(r == results[0] for r in results)}')

print("\nTest 3: Sort by ip asc")
results = []
for i in range(10):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 20, 'sortBy': 'ip', 'sortOrder': 'asc'})
    d = r.json()
    ips = [x['ip'] for x in d['results']]
    results.append(ips)
    print(f'Call {i+1}: {ips}')
    time.sleep(0.3)
print(f'All consistent: {all(r == results[0] for r in results)}')
