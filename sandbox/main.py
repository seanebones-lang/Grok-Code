from fastapi import FastAPI, Body
from pydantic import BaseModel
import subprocess
import json
import os

app = FastAPI(title='Agent Swarm')

class SwarmRequest(BaseModel):
    agents: list[str]
    code: str
    llm_api_key: str = None  # Env override

@app.post('/swarm')
async def run_swarm(req: SwarmRequest = Body(...)):
    # Orchestrate: Delegate to agents via Python tools
    results = {}
    for agent in req.agents:
        # Exec agent script (e.g., security_agent.py)
        proc = subprocess.run(['python', f'{agent}_agent.py', req.code], 
                              capture_output=True, text=True, timeout=30)
        results[agent] = {'output': proc.stdout, 'error': proc.stderr, 'code': proc.returncode}
    return {'swarm_results': results}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)