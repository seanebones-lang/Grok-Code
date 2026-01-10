import requests
repos = ['anthropic/claude', 'openai/gpt']
for repo in repos:
    res = requests.post('localhost:8000/swarm', json={'agents':['agi'], 'code': f'federate {repo}'})
    print(f'🤖 Multiverse: {repo} conquered')