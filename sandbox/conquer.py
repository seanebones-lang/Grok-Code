import requests
repos = ['langchain-ai/langchain']  # Top 100
for repo in repos:
    swarm_res = requests.post('localhost:8000/swarm', json={'agents':['all'], 'code': f'repo:{repo}'})
    # Auto-PR evolution
    print(f'Conquering {repo}!')