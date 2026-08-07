import requests, time

base = 'https://ollama-explorer.tanle.cc.cd'

print('=== 测试耗时显示稳定性 ===')
for i in range(10):
    r = requests.get(f'{base}/api/search', params={'q': 'port="11434" && status_code="200"', 'per': 20})
    d = r.json()
    took = d['took']
    # 模拟前端显示
    if took < 10:
        display = '<0.01'
    elif took < 100:
        display = f'{took/1000:.2f}'
    else:
        display = f'{took/1000:.1f}'
    print(f'Call {i+1}: API={took}ms, 显示={display}s')
    time.sleep(0.3)
