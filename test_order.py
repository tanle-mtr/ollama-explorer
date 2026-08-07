import requests, time

base = 'https://ollama-explorer.tanle.cc.cd'

# Test order stability after fix
print("Testing order stability after fix...")
results = []
for i in range(5):
    r = requests.get(f'{base}/api/search', params={
        'q': 'port="11434" && status_code="200"',
        'per': 5
    })
    d = r.json()
    ips = [x['ip'] for x in d['results']]
    results.append(ips)
    print(f'Call {i+1}: {ips}')
    time.sleep(0.3)

# Check if all are the same
all_same = all(r == results[0] for r in results)
print(f'\nAll calls consistent: {all_same}')
if not all_same:
    print('WARNING: Order still changing!')
else:
    print('SUCCESS: Order is now stable!')
