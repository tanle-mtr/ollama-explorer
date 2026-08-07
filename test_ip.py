import requests

base = 'https://ollama-explorer.tanle.cc.cd'

print('=== 测试 IP 显示 ===')
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 20})
d = r.json()
print(f'Total: {d["size"]}')
print('IPs (default sort):')
for i, x in enumerate(d['results']):
    print(f'  {i+1}. {x["ip"]} - {x.get("title", "N/A")}')

print('\nSort by IP (asc):')
r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 20, 'sortBy': 'ip', 'sortOrder': 'asc'})
d = r.json()
for i, x in enumerate(d['results']):
    print(f'  {i+1}. {x["ip"]}')
