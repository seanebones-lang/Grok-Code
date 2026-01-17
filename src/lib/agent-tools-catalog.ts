/**
 * Agent Tools Catalog
 * Comprehensive inventory of tools, libraries, and APIs available to agents
 * Last Updated: January 2026
 */

// ============================================================================
// Types
// ============================================================================

export interface ToolDefinition {
  name: string
  version: string
  category: ToolCategory
  description: string
  integration: string // How to import/use
  requirements: string[]
  envVars?: string[] // Required environment variables
  example: string
  preInstalled: boolean
  stars?: number
  riskLevel: 'safe' | 'low' | 'medium' | 'high'
  dualUseWarning?: string
}

export type ToolCategory =
  | 'core_execution'
  | 'data_manipulation'
  | 'web_network'
  | 'cloud_apis'
  | 'media'
  | 'specialized'
  | 'social_realtime'
  | 'utility'
  | 'orchestration'
  | 'security'

// ============================================================================
// Tools Catalog
// ============================================================================

export const TOOLS_CATALOG: ToolDefinition[] = [
  // ============================================================================
  // Category 1: Core Execution
  // ============================================================================
  {
    name: 'subprocess',
    version: 'stdlib',
    category: 'core_execution',
    description: 'Execute shell commands, external programs, and system operations',
    integration: 'import subprocess',
    requirements: ['Python >= 3.10'],
    example: `import subprocess
result = subprocess.run(['echo', 'Hello'], capture_output=True, text=True)
print(result.stdout)`,
    preInstalled: true,
    riskLevel: 'medium',
    dualUseWarning: 'Can execute arbitrary commands - validate inputs',
  },
  {
    name: 'ast',
    version: 'stdlib',
    category: 'core_execution',
    description: 'Parse and analyze Python code structure for code analysis agents',
    integration: 'import ast',
    requirements: ['Python >= 3.10'],
    example: `import ast
tree = ast.parse("x = 1 + 2")
print(ast.dump(tree, indent=2))`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'inspect',
    version: 'stdlib',
    category: 'core_execution',
    description: 'Get information about live objects, source code inspection',
    integration: 'import inspect',
    requirements: ['Python >= 3.10'],
    example: `import inspect
def example(): pass
print(inspect.getsource(example))`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'traceback',
    version: 'stdlib',
    category: 'core_execution',
    description: 'Extract, format, and print stack traces for debugging',
    integration: 'import traceback',
    requirements: ['Python >= 3.10'],
    example: `import traceback
try:
    1/0
except:
    print(traceback.format_exc())`,
    preInstalled: true,
    riskLevel: 'safe',
  },

  // ============================================================================
  // Category 2: Data Access & Manipulation
  // ============================================================================
  {
    name: 'pandas',
    version: '2.2.x',
    category: 'data_manipulation',
    description: 'Data manipulation and analysis for CSV, Excel, JSON, SQL data',
    integration: 'import pandas as pd',
    requirements: ['pandas >= 2.1', 'numpy'],
    example: `import pandas as pd
df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
print(df.describe())`,
    preInstalled: false,
    stars: 45000,
    riskLevel: 'safe',
  },
  {
    name: 'numpy',
    version: '2.0.x',
    category: 'data_manipulation',
    description: 'Numerical computing: arrays, linear algebra, random numbers',
    integration: 'import numpy as np',
    requirements: ['numpy >= 1.26'],
    example: `import numpy as np
arr = np.array([1, 2, 3, 4, 5])
print(f"Mean: {np.mean(arr)}, Std: {np.std(arr)}")`,
    preInstalled: false,
    stars: 27000,
    riskLevel: 'safe',
  },
  {
    name: 'json',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'JSON encoding and decoding',
    integration: 'import json',
    requirements: ['Python >= 3.10'],
    example: `import json
data = {"key": "value"}
json_str = json.dumps(data)
parsed = json.loads(json_str)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'csv',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'CSV file reading and writing',
    integration: 'import csv',
    requirements: ['Python >= 3.10'],
    example: `import csv
with open('data.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['name', 'value'])`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'PyMuPDF',
    version: '1.24.x',
    category: 'data_manipulation',
    description: 'PDF parsing, text extraction, image extraction from documents',
    integration: 'import fitz',
    requirements: ['pip install PyMuPDF'],
    example: `import fitz
doc = fitz.open("document.pdf")
text = doc[0].get_text()
print(text[:500])`,
    preInstalled: false,
    stars: 5000,
    riskLevel: 'safe',
  },
  {
    name: 'Pillow',
    version: '10.4.x',
    category: 'data_manipulation',
    description: 'Image processing: open, manipulate, save images',
    integration: 'from PIL import Image',
    requirements: ['pillow >= 10.0'],
    example: `from PIL import Image
img = Image.new('RGB', (100, 100), color='red')
img.save('test.png')`,
    preInstalled: false,
    stars: 12000,
    riskLevel: 'safe',
  },
  {
    name: 'PyYAML',
    version: '6.0.x',
    category: 'data_manipulation',
    description: 'YAML parsing and serialization',
    integration: 'import yaml',
    requirements: ['pyyaml >= 6.0'],
    example: `import yaml
data = yaml.safe_load("key: value")
print(yaml.dump(data))`,
    preInstalled: false,
    stars: 2500,
    riskLevel: 'safe',
  },

  // ============================================================================
  // Category 3: Web & Network
  // ============================================================================
  {
    name: 'requests',
    version: '2.32.x',
    category: 'web_network',
    description: 'HTTP library for REST API calls, web requests, downloads',
    integration: 'import requests',
    requirements: ['requests >= 2.31'],
    example: `import requests
response = requests.get('https://api.github.com')
print(response.status_code, response.json())`,
    preInstalled: false,
    stars: 52000,
    riskLevel: 'low',
  },
  {
    name: 'httpx',
    version: '0.27.x',
    category: 'web_network',
    description: 'Modern async HTTP client with HTTP/2 support',
    integration: 'import httpx',
    requirements: ['httpx >= 0.27'],
    example: `import httpx
async with httpx.AsyncClient() as client:
    r = await client.get('https://httpbin.org/get')
    print(r.json())`,
    preInstalled: false,
    stars: 13000,
    riskLevel: 'low',
  },
  {
    name: 'aiohttp',
    version: '3.10.x',
    category: 'web_network',
    description: 'Async HTTP client/server with WebSocket support',
    integration: 'import aiohttp',
    requirements: ['aiohttp >= 3.9'],
    example: `import aiohttp
async with aiohttp.ClientSession() as session:
    async with session.get('https://api.github.com') as response:
        print(await response.json())`,
    preInstalled: false,
    stars: 15000,
    riskLevel: 'low',
  },
  {
    name: 'BeautifulSoup4',
    version: '4.12.x',
    category: 'web_network',
    description: 'HTML/XML parsing and web scraping',
    integration: 'from bs4 import BeautifulSoup',
    requirements: ['beautifulsoup4 >= 4.12', 'lxml'],
    example: `from bs4 import BeautifulSoup
html = "<html><body><h1>Hello</h1></body></html>"
soup = BeautifulSoup(html, 'html.parser')
print(soup.h1.text)`,
    preInstalled: false,
    riskLevel: 'safe',
  },
  {
    name: 'playwright',
    version: '1.47.x',
    category: 'web_network',
    description: 'Browser automation for web scraping, testing (Chromium/Firefox/WebKit)',
    integration: 'from playwright.sync_api import sync_playwright',
    requirements: ['pip install playwright', 'playwright install'],
    example: `from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('https://example.com')
    print(page.title())`,
    preInstalled: false,
    stars: 66000,
    riskLevel: 'low',
  },
  {
    name: 'websockets',
    version: '13.x',
    category: 'web_network',
    description: 'WebSocket client/server for real-time communication',
    integration: 'import websockets',
    requirements: ['websockets >= 12.0'],
    example: `import websockets
async with websockets.connect("wss://echo.websocket.org") as ws:
    await ws.send("Hello!")
    print(await ws.recv())`,
    preInstalled: false,
    stars: 5000,
    riskLevel: 'safe',
  },

  // ============================================================================
  // Category 4: Cloud & External APIs
  // ============================================================================
  {
    name: 'openai',
    version: '1.50.x',
    category: 'cloud_apis',
    description: 'Official OpenAI Python SDK for GPT, DALL-E, Whisper',
    integration: 'from openai import OpenAI',
    requirements: ['openai >= 1.40'],
    envVars: ['OPENAI_API_KEY'],
    example: `from openai import OpenAI
import os
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
    preInstalled: false,
    stars: 22000,
    riskLevel: 'low',
  },
  {
    name: 'anthropic',
    version: '0.34.x',
    category: 'cloud_apis',
    description: 'Official Anthropic SDK for Claude models',
    integration: 'from anthropic import Anthropic',
    requirements: ['anthropic >= 0.30'],
    envVars: ['ANTHROPIC_API_KEY'],
    example: `from anthropic import Anthropic
import os
client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)`,
    preInstalled: false,
    stars: 2000,
    riskLevel: 'low',
  },
  {
    name: 'boto3',
    version: '1.35.x',
    category: 'cloud_apis',
    description: 'AWS SDK for S3, Lambda, DynamoDB, EC2, and 200+ services',
    integration: 'import boto3',
    requirements: ['boto3 >= 1.34'],
    envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    example: `import boto3
s3 = boto3.client('s3')
buckets = s3.list_buckets()
print([b['Name'] for b in buckets['Buckets']])`,
    preInstalled: false,
    stars: 9000,
    riskLevel: 'low',
  },
  {
    name: 'stripe',
    version: '10.x',
    category: 'cloud_apis',
    description: 'Stripe payment processing SDK',
    integration: 'import stripe',
    requirements: ['stripe >= 10.0'],
    envVars: ['STRIPE_API_KEY'],
    example: `import stripe
import os
stripe.api_key = os.getenv('STRIPE_API_KEY')
# customers = stripe.Customer.list(limit=3)`,
    preInstalled: false,
    stars: 2000,
    riskLevel: 'low',
  },

  // ============================================================================
  // Category 5: Media & Multimedia
  // ============================================================================
  {
    name: 'opencv-python',
    version: '4.10.x',
    category: 'media',
    description: 'Computer vision: image/video analysis, object detection',
    integration: 'import cv2',
    requirements: ['opencv-python >= 4.9'],
    example: `import cv2
import numpy as np
img = np.zeros((100, 100, 3), dtype=np.uint8)
cv2.rectangle(img, (10, 10), (90, 90), (0, 255, 0), 2)
cv2.imwrite('test.png', img)`,
    preInstalled: false,
    stars: 78000,
    riskLevel: 'safe',
  },
  {
    name: 'moviepy',
    version: '1.0.x',
    category: 'media',
    description: 'Video editing: cut, concatenate, add effects, export',
    integration: 'from moviepy.editor import *',
    requirements: ['moviepy >= 1.0', 'ffmpeg'],
    example: `from moviepy.editor import ColorClip
clip = ColorClip(size=(320, 240), color=(255, 0, 0), duration=2)
clip.write_videofile("test.mp4", fps=24)`,
    preInstalled: false,
    stars: 12000,
    riskLevel: 'safe',
  },
  {
    name: 'pydub',
    version: '0.25.x',
    category: 'media',
    description: 'Audio processing: manipulate audio files',
    integration: 'from pydub import AudioSegment',
    requirements: ['pydub >= 0.25', 'ffmpeg'],
    example: `from pydub import AudioSegment
# audio = AudioSegment.from_mp3("input.mp3")
# audio.export("output.wav", format="wav")`,
    preInstalled: false,
    stars: 9000,
    riskLevel: 'safe',
  },

  // ============================================================================
  // Category 6: Specialized Domains
  // ============================================================================
  {
    name: 'sympy',
    version: '1.13.x',
    category: 'specialized',
    description: 'Symbolic mathematics: algebra, calculus, equation solving',
    integration: 'import sympy',
    requirements: ['sympy >= 1.12'],
    example: `from sympy import symbols, solve, diff
x = symbols('x')
print(f"Solve x²-4=0: {solve(x**2 - 4, x)}")
print(f"Derivative of x²: {diff(x**2, x)}")`,
    preInstalled: false,
    stars: 13000,
    riskLevel: 'safe',
  },
  {
    name: 'scipy',
    version: '1.14.x',
    category: 'specialized',
    description: 'Scientific computing: optimization, integration, signal processing',
    integration: 'from scipy import optimize, integrate',
    requirements: ['scipy >= 1.12', 'numpy'],
    example: `from scipy import optimize
result = optimize.minimize(lambda x: (x-3)**2, x0=0)
print(f"Minimum at x={result.x[0]:.2f}")`,
    preInstalled: false,
    stars: 13000,
    riskLevel: 'safe',
  },
  {
    name: 'scikit-learn',
    version: '1.5.x',
    category: 'specialized',
    description: 'Machine learning: classification, regression, clustering',
    integration: 'from sklearn import ...',
    requirements: ['scikit-learn >= 1.4', 'numpy', 'scipy'],
    example: `from sklearn.linear_model import LinearRegression
import numpy as np
X = np.array([[1], [2], [3]])
y = np.array([2, 4, 6])
model = LinearRegression().fit(X, y)
print(f"Prediction for 4: {model.predict([[4]])[0]:.1f}")`,
    preInstalled: false,
    stars: 60000,
    riskLevel: 'safe',
  },
  {
    name: 'torch',
    version: '2.4.x',
    category: 'specialized',
    description: 'Deep learning framework for neural networks',
    integration: 'import torch',
    requirements: ['torch >= 2.2'],
    example: `import torch
x = torch.tensor([1.0, 2.0, 3.0])
print(f"Tensor: {x}, Sum: {x.sum()}")`,
    preInstalled: false,
    stars: 83000,
    riskLevel: 'safe',
  },
  {
    name: 'networkx',
    version: '3.3.x',
    category: 'specialized',
    description: 'Graph/network analysis and algorithms',
    integration: 'import networkx as nx',
    requirements: ['networkx >= 3.2'],
    example: `import networkx as nx
G = nx.Graph()
G.add_edges_from([(1, 2), (2, 3), (3, 1)])
print(f"Nodes: {G.nodes()}, Edges: {G.edges()}")`,
    preInstalled: false,
    stars: 15000,
    riskLevel: 'safe',
  },
  {
    name: 'ccxt',
    version: '4.4.x',
    category: 'specialized',
    description: 'Cryptocurrency exchange trading library (100+ exchanges)',
    integration: 'import ccxt',
    requirements: ['ccxt >= 4.0'],
    example: `import ccxt
exchange = ccxt.binance()
ticker = exchange.fetch_ticker('BTC/USDT')
print(f"BTC price: \${ticker['last']:,.2f}")`,
    preInstalled: false,
    stars: 33000,
    riskLevel: 'medium',
    dualUseWarning: 'Financial trading involves risk - use caution',
  },
  {
    name: 'python-chess',
    version: '1.10.x',
    category: 'specialized',
    description: 'Chess library with move generation, validation, engine integration',
    integration: 'import chess',
    requirements: ['python-chess >= 1.10'],
    example: `import chess
board = chess.Board()
board.push_san("e4")
print(board)`,
    preInstalled: false,
    stars: 2000,
    riskLevel: 'safe',
  },

  // ============================================================================
  // Category 7: Social & Real-Time
  // ============================================================================
  {
    name: 'tweepy',
    version: '4.14.x',
    category: 'social_realtime',
    description: 'Twitter/X API wrapper for posting, searching, streaming',
    integration: 'import tweepy',
    requirements: ['tweepy >= 4.14'],
    envVars: ['TWITTER_BEARER_TOKEN', 'TWITTER_API_KEY', 'TWITTER_API_SECRET'],
    example: `import tweepy
import os
client = tweepy.Client(bearer_token=os.getenv('TWITTER_BEARER_TOKEN'))
tweets = client.search_recent_tweets(query="python", max_results=10)`,
    preInstalled: false,
    stars: 10000,
    riskLevel: 'low',
  },
  {
    name: 'feedparser',
    version: '6.0.x',
    category: 'social_realtime',
    description: 'Parse RSS and Atom feeds',
    integration: 'import feedparser',
    requirements: ['feedparser >= 6.0'],
    example: `import feedparser
feed = feedparser.parse('https://news.ycombinator.com/rss')
for entry in feed.entries[:3]:
    print(entry.title)`,
    preInstalled: false,
    stars: 2000,
    riskLevel: 'safe',
  },

  // ============================================================================
  // Category 8: Utility & Automation
  // ============================================================================
  {
    name: 'logging',
    version: 'stdlib',
    category: 'utility',
    description: 'Structured logging for debugging and monitoring',
    integration: 'import logging',
    requirements: ['Python >= 3.10'],
    example: `import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Task completed successfully")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'concurrent.futures',
    version: 'stdlib',
    category: 'utility',
    description: 'High-level async execution with thread/process pools',
    integration: 'from concurrent.futures import ThreadPoolExecutor',
    requirements: ['Python >= 3.10'],
    example: `from concurrent.futures import ThreadPoolExecutor
def task(n): return n * 2
with ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(task, range(10)))
print(results)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'asyncio',
    version: 'stdlib',
    category: 'utility',
    description: 'Asynchronous I/O framework for concurrent code',
    integration: 'import asyncio',
    requirements: ['Python >= 3.10'],
    example: `import asyncio
async def main():
    await asyncio.sleep(0.1)
    return "done"
result = asyncio.run(main())`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'pathlib',
    version: 'stdlib',
    category: 'utility',
    description: 'Object-oriented filesystem paths',
    integration: 'from pathlib import Path',
    requirements: ['Python >= 3.10'],
    example: `from pathlib import Path
p = Path('.')
print([f.name for f in p.glob('*.py')])`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'python-dotenv',
    version: '1.0.x',
    category: 'utility',
    description: 'Load environment variables from .env files',
    integration: 'from dotenv import load_dotenv',
    requirements: ['python-dotenv >= 1.0'],
    example: `from dotenv import load_dotenv
import os
load_dotenv()
api_key = os.getenv('API_KEY')`,
    preInstalled: false,
    stars: 7000,
    riskLevel: 'safe',
  },

  // ============================================================================
  // Category 9: Agent Orchestration
  // ============================================================================
  {
    name: 'langchain',
    version: '0.3.x',
    category: 'orchestration',
    description: 'Framework for building LLM-powered applications with chains and agents',
    integration: 'from langchain import ...',
    requirements: ['langchain >= 0.2', 'langchain-core', 'langchain-openai'],
    envVars: ['OPENAI_API_KEY'],
    example: `from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
prompt = ChatPromptTemplate.from_template("Tell me about {topic}")
llm = ChatOpenAI(model="gpt-4")
chain = prompt | llm`,
    preInstalled: false,
    stars: 95000,
    riskLevel: 'low',
  },
  {
    name: 'langgraph',
    version: '0.2.x',
    category: 'orchestration',
    description: 'Build stateful multi-agent applications with graph-based workflows',
    integration: 'from langgraph.graph import StateGraph',
    requirements: ['langgraph >= 0.2', 'langchain'],
    example: `from langgraph.graph import StateGraph, END
from typing import TypedDict
class State(TypedDict):
    messages: list
graph = StateGraph(State)`,
    preInstalled: false,
    stars: 7000,
    riskLevel: 'low',
  },
  {
    name: 'autogen',
    version: '0.4.x',
    category: 'orchestration',
    description: 'Microsoft framework for multi-agent conversations and collaboration',
    integration: 'from autogen import AssistantAgent, UserProxyAgent',
    requirements: ['pyautogen >= 0.3'],
    envVars: ['OPENAI_API_KEY'],
    example: `from autogen import AssistantAgent, UserProxyAgent
# assistant = AssistantAgent("assistant", llm_config={...})
# user = UserProxyAgent("user", human_input_mode="NEVER")`,
    preInstalled: false,
    stars: 35000,
    riskLevel: 'low',
  },
  {
    name: 'crewai',
    version: '0.80.x',
    category: 'orchestration',
    description: 'Framework for orchestrating role-playing AI agents in crews',
    integration: 'from crewai import Agent, Task, Crew',
    requirements: ['crewai >= 0.60'],
    example: `from crewai import Agent, Task, Crew
researcher = Agent(
    role='Researcher',
    goal='Find information',
    backstory='Expert researcher'
)`,
    preInstalled: false,
    stars: 22000,
    riskLevel: 'low',
  },
  {
    name: 'llamaindex',
    version: '0.11.x',
    category: 'orchestration',
    description: 'Data framework for LLM applications with RAG capabilities',
    integration: 'from llama_index import ...',
    requirements: ['llama-index >= 0.10'],
    example: `from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
# documents = SimpleDirectoryReader('data').load_data()
# index = VectorStoreIndex.from_documents(documents)`,
    preInstalled: false,
    stars: 37000,
    riskLevel: 'low',
  },

  // ============================================================================
  // Category 10: Security & Compliance
  // ============================================================================
  {
    name: 'cryptography',
    version: '43.x',
    category: 'security',
    description: 'Cryptographic recipes and primitives (AES, RSA, hashing, X.509)',
    integration: 'from cryptography.fernet import Fernet',
    requirements: ['cryptography >= 42.0'],
    example: `from cryptography.fernet import Fernet
key = Fernet.generate_key()
f = Fernet(key)
encrypted = f.encrypt(b"secret message")
decrypted = f.decrypt(encrypted)`,
    preInstalled: false,
    stars: 7000,
    riskLevel: 'low',
    dualUseWarning: 'Use only for legitimate encryption purposes',
  },
  {
    name: 'hashlib',
    version: 'stdlib',
    category: 'security',
    description: 'Secure hash functions (SHA-256, SHA-512, MD5)',
    integration: 'import hashlib',
    requirements: ['Python >= 3.10'],
    example: `import hashlib
text = "Hello, World!"
hash_obj = hashlib.sha256(text.encode())
print(f"SHA-256: {hash_obj.hexdigest()}")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'secrets',
    version: 'stdlib',
    category: 'security',
    description: 'Generate cryptographically strong random numbers for tokens',
    integration: 'import secrets',
    requirements: ['Python >= 3.10'],
    example: `import secrets
token = secrets.token_hex(32)
url_safe = secrets.token_urlsafe(32)
print(f"Token: {token[:20]}...")`,
    preInstalled: true,
    riskLevel: 'safe',
  },

  // ============================================================================
  // ROUND 2 ADDITIONS: Vector Databases, Search APIs, CLI, Validation, Testing
  // ============================================================================
  
  // Vector Databases & Embeddings
  {
    name: 'chromadb',
    version: '0.5.x',
    category: 'orchestration',
    description: 'Open-source vector database for AI/ML embeddings and semantic search',
    integration: 'import chromadb',
    requirements: ['chromadb >= 0.4'],
    example: `import chromadb
client = chromadb.Client()
collection = client.create_collection("my_collection")
collection.add(documents=["doc1", "doc2"], ids=["id1", "id2"])
results = collection.query(query_texts=["search"], n_results=2)`,
    preInstalled: false,
    stars: 15000,
    riskLevel: 'safe',
  },
  {
    name: 'faiss-cpu',
    version: '1.8.x',
    category: 'orchestration',
    description: 'Facebook AI Similarity Search for efficient vector similarity',
    integration: 'import faiss',
    requirements: ['faiss-cpu >= 1.7'],
    example: `import faiss
import numpy as np
d = 64  # dimension
index = faiss.IndexFlatL2(d)
vectors = np.random.random((100, d)).astype('float32')
index.add(vectors)
D, I = index.search(vectors[:5], k=4)`,
    preInstalled: false,
    stars: 30000,
    riskLevel: 'safe',
  },
  {
    name: 'qdrant-client',
    version: '1.11.x',
    category: 'orchestration',
    description: 'Vector database client for semantic search and recommendations',
    integration: 'from qdrant_client import QdrantClient',
    requirements: ['qdrant-client >= 1.9'],
    example: `from qdrant_client import QdrantClient
client = QdrantClient(":memory:")
# client.create_collection("test", vectors_config={"size": 384, "distance": "Cosine"})`,
    preInstalled: false,
    stars: 20000,
    riskLevel: 'safe',
  },

  // Web Search APIs
  {
    name: 'tavily-python',
    version: '0.4.x',
    category: 'web_network',
    description: 'AI-optimized search API for agents and RAG applications',
    integration: 'from tavily import TavilyClient',
    requirements: ['tavily-python >= 0.3'],
    envVars: ['TAVILY_API_KEY'],
    example: `from tavily import TavilyClient
import os
client = TavilyClient(api_key=os.getenv('TAVILY_API_KEY'))
response = client.search("latest AI news")`,
    preInstalled: false,
    stars: 2000,
    riskLevel: 'low',
  },
  {
    name: 'duckduckgo-search',
    version: '6.3.x',
    category: 'web_network',
    description: 'DuckDuckGo search API - no API key required',
    integration: 'from duckduckgo_search import DDGS',
    requirements: ['duckduckgo-search >= 6.0'],
    example: `from duckduckgo_search import DDGS
with DDGS() as ddgs:
    results = list(ddgs.text("python programming", max_results=5))
    for r in results:
        print(r['title'], r['href'])`,
    preInstalled: false,
    stars: 3000,
    riskLevel: 'safe',
  },

  // CLI & Terminal Tools
  {
    name: 'rich',
    version: '13.9.x',
    category: 'utility',
    description: 'Beautiful terminal formatting, tables, progress bars, syntax highlighting',
    integration: 'from rich import print',
    requirements: ['rich >= 13.0'],
    example: `from rich.console import Console
from rich.table import Table
console = Console()
table = Table(title="Data")
table.add_column("Name")
table.add_row("Example")
console.print(table)`,
    preInstalled: false,
    stars: 50000,
    riskLevel: 'safe',
  },
  {
    name: 'typer',
    version: '0.12.x',
    category: 'utility',
    description: 'Build CLI applications with type hints',
    integration: 'import typer',
    requirements: ['typer >= 0.9'],
    example: `import typer
app = typer.Typer()
@app.command()
def hello(name: str):
    print(f"Hello {name}")
# if __name__ == "__main__": app()`,
    preInstalled: false,
    stars: 16000,
    riskLevel: 'safe',
  },
  {
    name: 'click',
    version: '8.1.x',
    category: 'utility',
    description: 'Command line interface creation kit',
    integration: 'import click',
    requirements: ['click >= 8.0'],
    example: `import click
@click.command()
@click.option('--name', default='World')
def hello(name):
    click.echo(f'Hello {name}!')`,
    preInstalled: false,
    stars: 15000,
    riskLevel: 'safe',
  },
  {
    name: 'tqdm',
    version: '4.66.x',
    category: 'utility',
    description: 'Fast, extensible progress bar for loops and CLI',
    integration: 'from tqdm import tqdm',
    requirements: ['tqdm >= 4.65'],
    example: `from tqdm import tqdm
import time
for i in tqdm(range(100)):
    time.sleep(0.01)`,
    preInstalled: false,
    stars: 28000,
    riskLevel: 'safe',
  },

  // Data Validation
  {
    name: 'pydantic',
    version: '2.9.x',
    category: 'data_manipulation',
    description: 'Data validation using Python type annotations',
    integration: 'from pydantic import BaseModel',
    requirements: ['pydantic >= 2.0'],
    example: `from pydantic import BaseModel
class User(BaseModel):
    name: str
    age: int
user = User(name="John", age=30)
print(user.model_dump())`,
    preInstalled: false,
    stars: 21000,
    riskLevel: 'safe',
  },

  // Testing
  {
    name: 'pytest',
    version: '8.3.x',
    category: 'utility',
    description: 'Full-featured Python testing framework',
    integration: 'import pytest',
    requirements: ['pytest >= 8.0'],
    example: `import pytest
def test_example():
    assert 1 + 1 == 2
# Run with: pytest test_file.py`,
    preInstalled: false,
    stars: 12000,
    riskLevel: 'safe',
  },
  {
    name: 'faker',
    version: '30.x',
    category: 'utility',
    description: 'Generate fake data for testing (names, addresses, etc.)',
    integration: 'from faker import Faker',
    requirements: ['faker >= 25.0'],
    example: `from faker import Faker
fake = Faker()
print(fake.name())
print(fake.email())
print(fake.address())`,
    preInstalled: false,
    stars: 18000,
    riskLevel: 'safe',
  },

  // Document Processing
  {
    name: 'python-docx',
    version: '1.1.x',
    category: 'data_manipulation',
    description: 'Create and modify Microsoft Word documents',
    integration: 'from docx import Document',
    requirements: ['python-docx >= 1.0'],
    example: `from docx import Document
doc = Document()
doc.add_heading('Title', 0)
doc.add_paragraph('Content here')
doc.save('output.docx')`,
    preInstalled: false,
    stars: 5000,
    riskLevel: 'safe',
  },
  {
    name: 'markdown',
    version: '3.7.x',
    category: 'data_manipulation',
    description: 'Markdown to HTML converter',
    integration: 'import markdown',
    requirements: ['markdown >= 3.5'],
    example: `import markdown
html = markdown.markdown("# Hello\\n**Bold** text")
print(html)`,
    preInstalled: false,
    stars: 4000,
    riskLevel: 'safe',
  },

  // Date/Time
  {
    name: 'datetime',
    version: 'stdlib',
    category: 'utility',
    description: 'Date and time manipulation',
    integration: 'from datetime import datetime, timedelta',
    requirements: ['Python >= 3.10'],
    example: `from datetime import datetime, timedelta
now = datetime.now()
tomorrow = now + timedelta(days=1)
print(f"Now: {now}, Tomorrow: {tomorrow}")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'python-dateutil',
    version: '2.9.x',
    category: 'utility',
    description: 'Powerful extensions to datetime (parsing, timezones)',
    integration: 'from dateutil import parser, tz',
    requirements: ['python-dateutil >= 2.8'],
    example: `from dateutil import parser
dt = parser.parse("January 9, 2026 3:30 PM")
print(dt)`,
    preInstalled: false,
    stars: 2000,
    riskLevel: 'safe',
  },

  // Email (stdlib)
  {
    name: 'smtplib',
    version: 'stdlib',
    category: 'utility',
    description: 'SMTP email sending',
    integration: 'import smtplib',
    requirements: ['Python >= 3.10'],
    example: `import smtplib
from email.mime.text import MIMEText
# server = smtplib.SMTP('smtp.gmail.com', 587)
# server.starttls()
# server.login(user, password)`,
    preInstalled: true,
    riskLevel: 'low',
  },

  // Core stdlib additions
  {
    name: 're',
    version: 'stdlib',
    category: 'core_execution',
    description: 'Regular expression operations',
    integration: 'import re',
    requirements: ['Python >= 3.10'],
    example: `import re
pattern = r'\\d+'
text = "There are 123 numbers"
matches = re.findall(pattern, text)
print(matches)  # ['123']`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'os',
    version: 'stdlib',
    category: 'core_execution',
    description: 'Operating system interfaces (files, env vars, paths)',
    integration: 'import os',
    requirements: ['Python >= 3.10'],
    example: `import os
print(os.getcwd())
print(os.environ.get('HOME'))
os.makedirs('new_dir', exist_ok=True)`,
    preInstalled: true,
    riskLevel: 'medium',
  },
  {
    name: 'sys',
    version: 'stdlib',
    category: 'core_execution',
    description: 'System-specific parameters and functions',
    integration: 'import sys',
    requirements: ['Python >= 3.10'],
    example: `import sys
print(sys.version)
print(sys.platform)
print(sys.argv)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'uuid',
    version: 'stdlib',
    category: 'utility',
    description: 'Generate universally unique identifiers',
    integration: 'import uuid',
    requirements: ['Python >= 3.10'],
    example: `import uuid
new_id = uuid.uuid4()
print(f"UUID: {new_id}")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'base64',
    version: 'stdlib',
    category: 'utility',
    description: 'Base64 encoding and decoding',
    integration: 'import base64',
    requirements: ['Python >= 3.10'],
    example: `import base64
encoded = base64.b64encode(b"Hello World")
decoded = base64.b64decode(encoded)
print(decoded.decode())`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'gzip',
    version: 'stdlib',
    category: 'utility',
    description: 'Gzip compression and decompression',
    integration: 'import gzip',
    requirements: ['Python >= 3.10'],
    example: `import gzip
data = b"Hello World" * 100
compressed = gzip.compress(data)
print(f"Original: {len(data)}, Compressed: {len(compressed)}")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'zipfile',
    version: 'stdlib',
    category: 'utility',
    description: 'Read and write ZIP archives',
    integration: 'import zipfile',
    requirements: ['Python >= 3.10'],
    example: `import zipfile
with zipfile.ZipFile('archive.zip', 'w') as zf:
    zf.writestr('file.txt', 'Hello World')`,
    preInstalled: true,
    riskLevel: 'safe',
  },

  // ============================================================================
  // ROUND 3 ADDITIONS: LLM APIs, Database, Embeddings, Stdlib, Web Frameworks
  // ============================================================================

  // Additional LLM APIs
  {
    name: 'google-generativeai',
    version: '0.8.x',
    category: 'cloud_apis',
    description: 'Google Gemini AI API client',
    integration: 'import google.generativeai as genai',
    requirements: ['google-generativeai >= 0.7'],
    envVars: ['GOOGLE_API_KEY'],
    example: `import google.generativeai as genai
import os
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = genai.GenerativeModel('gemini-pro')
response = model.generate_content("Hello!")`,
    preInstalled: false,
    stars: 5000,
    riskLevel: 'low',
  },
  {
    name: 'groq',
    version: '0.11.x',
    category: 'cloud_apis',
    description: 'Groq API client - ultra-fast LLM inference',
    integration: 'from groq import Groq',
    requirements: ['groq >= 0.9'],
    envVars: ['GROQ_API_KEY'],
    example: `from groq import Groq
import os
client = Groq(api_key=os.getenv('GROQ_API_KEY'))
response = client.chat.completions.create(
    model="llama-3.1-70b-versatile",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
    preInstalled: false,
    stars: 3000,
    riskLevel: 'low',
  },
  {
    name: 'mistralai',
    version: '1.2.x',
    category: 'cloud_apis',
    description: 'Mistral AI API client',
    integration: 'from mistralai import Mistral',
    requirements: ['mistralai >= 1.0'],
    envVars: ['MISTRAL_API_KEY'],
    example: `from mistralai import Mistral
import os
client = Mistral(api_key=os.getenv('MISTRAL_API_KEY'))
response = client.chat.complete(
    model="mistral-large-latest",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
    preInstalled: false,
    stars: 1000,
    riskLevel: 'low',
  },
  {
    name: 'cohere',
    version: '5.11.x',
    category: 'cloud_apis',
    description: 'Cohere API client for embeddings and generation',
    integration: 'import cohere',
    requirements: ['cohere >= 5.0'],
    envVars: ['COHERE_API_KEY'],
    example: `import cohere
import os
co = cohere.ClientV2(api_key=os.getenv('COHERE_API_KEY'))
response = co.chat(model="command-r-plus", messages=[{"role": "user", "content": "Hello!"}])`,
    preInstalled: false,
    stars: 1000,
    riskLevel: 'low',
  },

  // Embeddings & Transformers
  {
    name: 'sentence-transformers',
    version: '3.3.x',
    category: 'specialized',
    description: 'State-of-the-art text embeddings for semantic search',
    integration: 'from sentence_transformers import SentenceTransformer',
    requirements: ['sentence-transformers >= 2.5', 'torch'],
    example: `from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(['Hello world', 'How are you'])
print(embeddings.shape)`,
    preInstalled: false,
    stars: 15000,
    riskLevel: 'safe',
  },
  {
    name: 'tiktoken',
    version: '0.8.x',
    category: 'specialized',
    description: 'OpenAI tokenizer for counting tokens',
    integration: 'import tiktoken',
    requirements: ['tiktoken >= 0.7'],
    example: `import tiktoken
enc = tiktoken.encoding_for_model("gpt-4")
tokens = enc.encode("Hello, world!")
print(f"Token count: {len(tokens)}")`,
    preInstalled: false,
    stars: 12000,
    riskLevel: 'safe',
  },
  {
    name: 'transformers',
    version: '4.46.x',
    category: 'specialized',
    description: 'HuggingFace transformers for NLP models',
    integration: 'from transformers import pipeline',
    requirements: ['transformers >= 4.40', 'torch'],
    example: `from transformers import pipeline
classifier = pipeline("sentiment-analysis")
result = classifier("I love this product!")
print(result)`,
    preInstalled: false,
    stars: 135000,
    riskLevel: 'safe',
  },

  // Database
  {
    name: 'sqlite3',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'SQLite database interface',
    integration: 'import sqlite3',
    requirements: ['Python >= 3.10'],
    example: `import sqlite3
conn = sqlite3.connect(':memory:')
cursor = conn.cursor()
cursor.execute('CREATE TABLE test (id INTEGER, name TEXT)')
cursor.execute('INSERT INTO test VALUES (1, "Alice")')
print(cursor.execute('SELECT * FROM test').fetchall())`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'sqlalchemy',
    version: '2.0.x',
    category: 'data_manipulation',
    description: 'Python SQL toolkit and ORM',
    integration: 'from sqlalchemy import create_engine',
    requirements: ['sqlalchemy >= 2.0'],
    example: `from sqlalchemy import create_engine, text
engine = create_engine('sqlite:///:memory:')
with engine.connect() as conn:
    result = conn.execute(text("SELECT 1"))
    print(result.fetchone())`,
    preInstalled: false,
    stars: 10000,
    riskLevel: 'safe',
  },

  // Web Frameworks
  {
    name: 'fastapi',
    version: '0.115.x',
    category: 'web_network',
    description: 'Modern, fast web framework for building APIs',
    integration: 'from fastapi import FastAPI',
    requirements: ['fastapi >= 0.110', 'uvicorn'],
    example: `from fastapi import FastAPI
app = FastAPI()
@app.get("/")
def read_root():
    return {"Hello": "World"}
# Run with: uvicorn main:app --reload`,
    preInstalled: false,
    stars: 78000,
    riskLevel: 'safe',
  },
  {
    name: 'flask',
    version: '3.1.x',
    category: 'web_network',
    description: 'Lightweight WSGI web application framework',
    integration: 'from flask import Flask',
    requirements: ['flask >= 3.0'],
    example: `from flask import Flask
app = Flask(__name__)
@app.route("/")
def hello():
    return "Hello, World!"`,
    preInstalled: false,
    stars: 68000,
    riskLevel: 'safe',
  },

  // Templating
  {
    name: 'jinja2',
    version: '3.1.x',
    category: 'utility',
    description: 'Template engine for Python',
    integration: 'from jinja2 import Template',
    requirements: ['jinja2 >= 3.1'],
    example: `from jinja2 import Template
template = Template("Hello {{ name }}!")
result = template.render(name="World")
print(result)`,
    preInstalled: false,
    stars: 10000,
    riskLevel: 'safe',
  },

  // Retry/Resilience
  {
    name: 'tenacity',
    version: '9.0.x',
    category: 'utility',
    description: 'Retry library with exponential backoff',
    integration: 'from tenacity import retry',
    requirements: ['tenacity >= 8.2'],
    example: `from tenacity import retry, stop_after_attempt, wait_exponential
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1))
def fetch_data():
    # Will retry 3 times with exponential backoff
    pass`,
    preInstalled: false,
    stars: 6500,
    riskLevel: 'safe',
  },

  // Fast JSON
  {
    name: 'orjson',
    version: '3.10.x',
    category: 'data_manipulation',
    description: 'Fast JSON library (10x faster than stdlib)',
    integration: 'import orjson',
    requirements: ['orjson >= 3.9'],
    example: `import orjson
data = {"key": "value", "numbers": [1, 2, 3]}
json_bytes = orjson.dumps(data)
parsed = orjson.loads(json_bytes)
print(parsed)`,
    preInstalled: false,
    stars: 6000,
    riskLevel: 'safe',
  },

  // Better Logging
  {
    name: 'loguru',
    version: '0.7.x',
    category: 'utility',
    description: 'Better logging with colors and rotation',
    integration: 'from loguru import logger',
    requirements: ['loguru >= 0.7'],
    example: `from loguru import logger
logger.info("This is an info message")
logger.error("This is an error")
logger.debug("Debug with {}", "formatting")`,
    preInstalled: false,
    stars: 20000,
    riskLevel: 'safe',
  },

  // Scheduling
  {
    name: 'schedule',
    version: '1.2.x',
    category: 'utility',
    description: 'Job scheduling for humans',
    integration: 'import schedule',
    requirements: ['schedule >= 1.2'],
    example: `import schedule
import time
def job():
    print("Running task...")
schedule.every(10).seconds.do(job)
# while True: schedule.run_pending(); time.sleep(1)`,
    preInstalled: false,
    stars: 12000,
    riskLevel: 'safe',
  },

  // Essential stdlib additions
  {
    name: 'math',
    version: 'stdlib',
    category: 'specialized',
    description: 'Mathematical functions (sin, cos, sqrt, etc.)',
    integration: 'import math',
    requirements: ['Python >= 3.10'],
    example: `import math
print(f"Pi: {math.pi}")
print(f"sqrt(16): {math.sqrt(16)}")
print(f"sin(0): {math.sin(0)}")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'random',
    version: 'stdlib',
    category: 'utility',
    description: 'Random number generation',
    integration: 'import random',
    requirements: ['Python >= 3.10'],
    example: `import random
print(random.randint(1, 100))
print(random.choice(['a', 'b', 'c']))
print(random.random())`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'collections',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'Specialized container datatypes (Counter, deque, defaultdict)',
    integration: 'from collections import Counter, deque, defaultdict',
    requirements: ['Python >= 3.10'],
    example: `from collections import Counter, defaultdict
words = ['a', 'b', 'a', 'c', 'a']
print(Counter(words))  # Counter({'a': 3, 'b': 1, 'c': 1})
d = defaultdict(list)
d['key'].append(1)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'itertools',
    version: 'stdlib',
    category: 'utility',
    description: 'Iterator building blocks (chain, cycle, combinations)',
    integration: 'import itertools',
    requirements: ['Python >= 3.10'],
    example: `import itertools
# Combinations
print(list(itertools.combinations([1,2,3], 2)))
# Chain iterables
print(list(itertools.chain([1,2], [3,4])))`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'functools',
    version: 'stdlib',
    category: 'utility',
    description: 'Higher-order functions (lru_cache, partial, reduce)',
    integration: 'from functools import lru_cache, partial',
    requirements: ['Python >= 3.10'],
    example: `from functools import lru_cache
@lru_cache(maxsize=128)
def expensive_func(n):
    return sum(range(n))
print(expensive_func(1000))`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'copy',
    version: 'stdlib',
    category: 'utility',
    description: 'Shallow and deep copy operations',
    integration: 'import copy',
    requirements: ['Python >= 3.10'],
    example: `import copy
original = {'a': [1, 2, 3]}
shallow = copy.copy(original)
deep = copy.deepcopy(original)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'pickle',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'Python object serialization',
    integration: 'import pickle',
    requirements: ['Python >= 3.10'],
    example: `import pickle
data = {'key': 'value', 'list': [1, 2, 3]}
serialized = pickle.dumps(data)
restored = pickle.loads(serialized)`,
    preInstalled: true,
    riskLevel: 'medium',
    dualUseWarning: 'Never unpickle untrusted data - security risk',
  },
  {
    name: 'urllib.parse',
    version: 'stdlib',
    category: 'web_network',
    description: 'URL parsing and manipulation',
    integration: 'from urllib.parse import urlparse, urlencode',
    requirements: ['Python >= 3.10'],
    example: `from urllib.parse import urlparse, urlencode, quote
url = urlparse('https://example.com/path?q=test')
print(url.netloc, url.path)
print(urlencode({'key': 'value with spaces'}))`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'xml.etree.ElementTree',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'XML parsing and generation',
    integration: 'import xml.etree.ElementTree as ET',
    requirements: ['Python >= 3.10'],
    example: `import xml.etree.ElementTree as ET
root = ET.Element("root")
child = ET.SubElement(root, "child")
child.text = "Hello"
print(ET.tostring(root, encoding='unicode'))`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'difflib',
    version: 'stdlib',
    category: 'utility',
    description: 'Text comparison and diff generation',
    integration: 'import difflib',
    requirements: ['Python >= 3.10'],
    example: `import difflib
text1 = "Hello World"
text2 = "Hello Python"
diff = difflib.unified_diff(text1.split(), text2.split())
print('\\n'.join(diff))`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'threading',
    version: 'stdlib',
    category: 'utility',
    description: 'Thread-based parallelism',
    integration: 'import threading',
    requirements: ['Python >= 3.10'],
    example: `import threading
def worker():
    print(f"Thread {threading.current_thread().name}")
thread = threading.Thread(target=worker)
thread.start()
thread.join()`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'queue',
    version: 'stdlib',
    category: 'utility',
    description: 'Thread-safe queue implementations',
    integration: 'from queue import Queue, PriorityQueue',
    requirements: ['Python >= 3.10'],
    example: `from queue import Queue
q = Queue()
q.put("item1")
q.put("item2")
print(q.get())  # item1`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'glob',
    version: 'stdlib',
    category: 'utility',
    description: 'Unix-style pathname pattern expansion',
    integration: 'import glob',
    requirements: ['Python >= 3.10'],
    example: `import glob
# Find all Python files
py_files = glob.glob('**/*.py', recursive=True)
print(py_files[:5])`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'shutil',
    version: 'stdlib',
    category: 'utility',
    description: 'High-level file operations (copy, move, archive)',
    integration: 'import shutil',
    requirements: ['Python >= 3.10'],
    example: `import shutil
shutil.copy('source.txt', 'dest.txt')
shutil.rmtree('dir_to_remove')
shutil.make_archive('backup', 'zip', 'folder')`,
    preInstalled: true,
    riskLevel: 'medium',
  },
  {
    name: 'tempfile',
    version: 'stdlib',
    category: 'utility',
    description: 'Generate temporary files and directories',
    integration: 'import tempfile',
    requirements: ['Python >= 3.10'],
    example: `import tempfile
with tempfile.NamedTemporaryFile(delete=False) as f:
    f.write(b"temp data")
    print(f.name)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'io',
    version: 'stdlib',
    category: 'utility',
    description: 'Core I/O functionality (StringIO, BytesIO)',
    integration: 'from io import StringIO, BytesIO',
    requirements: ['Python >= 3.10'],
    example: `from io import StringIO, BytesIO
buffer = StringIO()
buffer.write("Hello")
buffer.seek(0)
print(buffer.read())`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'contextlib',
    version: 'stdlib',
    category: 'utility',
    description: 'Context manager utilities',
    integration: 'from contextlib import contextmanager',
    requirements: ['Python >= 3.10'],
    example: `from contextlib import contextmanager
@contextmanager
def timer():
    import time
    start = time.time()
    yield
    print(f"Elapsed: {time.time() - start:.2f}s")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'typing',
    version: 'stdlib',
    category: 'core_execution',
    description: 'Type hints support',
    integration: 'from typing import List, Dict, Optional, Union',
    requirements: ['Python >= 3.10'],
    example: `from typing import List, Dict, Optional
def process(items: List[str]) -> Dict[str, int]:
    return {item: len(item) for item in items}`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'dataclasses',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'Data class decorator for automatic __init__, __repr__, etc.',
    integration: 'from dataclasses import dataclass',
    requirements: ['Python >= 3.10'],
    example: `from dataclasses import dataclass
@dataclass
class Point:
    x: float
    y: float
p = Point(1.0, 2.0)
print(p)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'enum',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'Support for enumerations',
    integration: 'from enum import Enum, auto',
    requirements: ['Python >= 3.10'],
    example: `from enum import Enum, auto
class Status(Enum):
    PENDING = auto()
    RUNNING = auto()
    DONE = auto()
print(Status.PENDING)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'struct',
    version: 'stdlib',
    category: 'data_manipulation',
    description: 'Pack/unpack binary data',
    integration: 'import struct',
    requirements: ['Python >= 3.10'],
    example: `import struct
packed = struct.pack('ihb', 1, 2, 3)
unpacked = struct.unpack('ihb', packed)
print(unpacked)  # (1, 2, 3)`,
    preInstalled: true,
    riskLevel: 'safe',
  },
  {
    name: 'time',
    version: 'stdlib',
    category: 'utility',
    description: 'Time access and conversions',
    integration: 'import time',
    requirements: ['Python >= 3.10'],
    example: `import time
start = time.time()
time.sleep(0.1)
print(f"Elapsed: {time.time() - start:.3f}s")`,
    preInstalled: true,
    riskLevel: 'safe',
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOLS_CATALOG.filter(tool => tool.category === category)
}

/**
 * Get all categories with their tools
 */
export function getAllCategories(): Record<ToolCategory, ToolDefinition[]> {
  const categories: Record<ToolCategory, ToolDefinition[]> = {
    core_execution: [],
    data_manipulation: [],
    web_network: [],
    cloud_apis: [],
    media: [],
    specialized: [],
    social_realtime: [],
    utility: [],
    orchestration: [],
    security: [],
  }
  
  for (const tool of TOOLS_CATALOG) {
    categories[tool.category].push(tool)
  }
  
  return categories
}

/**
 * Get pre-installed tools (stdlib)
 */
export function getPreInstalledTools(): ToolDefinition[] {
  return TOOLS_CATALOG.filter(tool => tool.preInstalled)
}

/**
 * Get tools requiring API keys
 */
export function getToolsRequiringApiKeys(): ToolDefinition[] {
  return TOOLS_CATALOG.filter(tool => tool.envVars && tool.envVars.length > 0)
}

/**
 * Search tools by name or description
 */
export function searchTools(query: string): ToolDefinition[] {
  const lowerQuery = query.toLowerCase()
  return TOOLS_CATALOG.filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get tool by name
 */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOLS_CATALOG.find(tool => tool.name.toLowerCase() === name.toLowerCase())
}

/**
 * Format tools catalog for agent system prompt
 */
export function formatToolsCatalogForPrompt(): string {
  const categories = getAllCategories()
  let output = '## Available Python Tools & Libraries\n\n'
  
  const categoryNames: Record<ToolCategory, string> = {
    core_execution: '🔧 Core Execution',
    data_manipulation: '📊 Data Manipulation',
    web_network: '🌐 Web & Network',
    cloud_apis: '☁️ Cloud & APIs',
    media: '🎬 Media & Multimedia',
    specialized: '🔬 Specialized Domains',
    social_realtime: '📱 Social & Real-Time',
    utility: '⚙️ Utility & Automation',
    orchestration: '🤖 Agent Orchestration',
    security: '🔒 Security',
  }
  
  for (const [category, tools] of Object.entries(categories)) {
    if (tools.length === 0) continue
    
    output += `### ${categoryNames[category as ToolCategory]}\n`
    for (const tool of tools) {
      const envNote = tool.envVars ? ` (requires: ${tool.envVars.join(', ')})` : ''
      output += `- **${tool.name}** (${tool.version}): ${tool.description}${envNote}\n`
    }
    output += '\n'
  }
  
  return output
}

/**
 * Get required environment variables for all tools
 */
export function getAllRequiredEnvVars(): string[] {
  const envVars = new Set<string>()
  for (const tool of TOOLS_CATALOG) {
    if (tool.envVars) {
      tool.envVars.forEach(v => envVars.add(v))
    }
  }
  return Array.from(envVars).sort()
}

// ============================================================================
// Export summary stats
// ============================================================================

export const CATALOG_STATS = {
  totalTools: TOOLS_CATALOG.length,
  preInstalled: TOOLS_CATALOG.filter(t => t.preInstalled).length,
  requiresInstall: TOOLS_CATALOG.filter(t => !t.preInstalled).length,
  requiresApiKey: TOOLS_CATALOG.filter(t => t.envVars && t.envVars.length > 0).length,
  categories: 10,
  lastUpdated: '2026-01-09',
  version: '3.0', // Round 3 - comprehensive coverage
}
