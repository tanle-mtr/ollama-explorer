import requests, time

base = 'https://ollama-explorer.tanle.cc.cd'

print('Testing took values...')
for i in range(10):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 20})
    d = r.json()
    print(f'Call {i+1}: took={d["took"]}ms')
    time.sleep(0.2)
