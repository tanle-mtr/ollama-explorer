import requests

base = 'https://ollama-explorer.tanle.cc.cd'

# Test model filter with exact model name
r = requests.get(f'{base}/api/search', params={
    'q': 'port="11434" && status_code="200"',
    'model': 'deepseek-v4-pro:cloud',
    'per': 5
})
d = r.json()
print(f'deepseek-v4-pro:cloud: {d["size"]}')

# Test model filter with vendor name (should work if vendor is in model name)
r = requests.get(f'{base}/api/search', params={
    'q': 'port="11434" && status_code="200"',
    'model': 'deepseek',
    'per': 5
})
d = r.json()
print(f'deepseek (partial): {d["size"]}')

# Test with multiple models
r = requests.get(f'{base}/api/search', params={
    'q': 'port="11434" && status_code="200"',
    'model': 'deepseek-v4-pro:cloud,kimi-k2.7-code:cloud',
    'per': 5
})
d = r.json()
print(f'deepseek+kimi: {d["size"]}')
