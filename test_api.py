import requests

base = 'https://ollama.tanle.cc.cd'

print('=== Testing APIs ===')
print('Stats:', requests.get(f'{base}/api/stats', headers={'Cache-Control': 'no-cache'}).json())

r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 5})
d = r.json()
print(f'Search: {d["size"]} results, took={d["took"]}ms')

r = requests.get(f'{base}/api/models')
d = r.json()
print(f'Models: {d["total"]}')

print('\n=== Testing order stability ===')
for i in range(5):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 5})
    d = r.json()
    ips = [x['ip'] for x in d['results']]
    print(f'Call {i+1}: {ips}')

print('\n=== Testing took stability ===')
for i in range(5):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 5})
    d = r.json()
    print(f'Call {i+1}: took={d["took"]}ms')
