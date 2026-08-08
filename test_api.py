import requests

base = 'https://ollama-explorer.tanle.cc.cd'

print('=== 测试 API ===')
print('Stats:', requests.get(f'{base}/api/stats').json())

r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 10})
d = r.json()
print(f'Search: total={d["size"]}, took={d["took"]}ms')
for x in d['results'][:5]:
    print(f'  {x["ip"]} - {x.get("title", "N/A")}')

r = requests.get(f'{base}/api/models')
d = r.json()
print(f'Models: total={d["total"]}')
print(f'Top 5: {[m["name"] for m in d["models"][:5]]}')

print('\n=== 测试顺序稳定性 ===')
results = []
for i in range(5):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 10})
    d = r.json()
    ips = [x['ip'] for x in d['results']]
    results.append(ips)
    print(f'Call {i+1}: {ips}')
print(f'All consistent: {all(r == results[0] for r in results)}')

print('\n=== 测试耗时 ===')
for i in range(5):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 10})
    d = r.json()
    print(f'Call {i+1}: took={d["took"]}ms')
