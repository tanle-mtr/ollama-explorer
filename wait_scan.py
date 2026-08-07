import requests, time

base = 'https://ollama-explorer.tanle.cc.cd'

print('Waiting for scan to complete...')
for i in range(20):
    r = requests.get(f'{base}/api/stats')
    d = r.json()
    print(f'Check {i+1}: hosts={d["hosts"]}, models={d["models"]}')
    if d['hosts'] > 0:
        print('Scan complete!')
        break
    time.sleep(30)
