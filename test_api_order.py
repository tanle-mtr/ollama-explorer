import requests

base = 'https://ollama-explorer.tanle.cc.cd'

# Test multiple times
print("Testing API order stability...")
results = []
for i in range(5):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 5})
    d = r.json()
    ips = [x['ip'] for x in d['results']]
    results.append(ips)
    print(f'Call {i+1}: {ips} (took {d["took"]}ms)')

# Check if all are the same
all_same = all(r == results[0] for r in results)
print(f'\nAll calls consistent: {all_same}')
