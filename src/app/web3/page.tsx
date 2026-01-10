import { useState } from 'react';
export default function Web3() {
  const [agentNFT, setAgentNFT] = useState('');
  const mint = async () => {
    // Stub ethers.js
    alert(`Minted ${agentNFT} NFT on Ethereum!`);
  };
  return (<div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-8"><h1 className="text-5xl font-black text-white">🔗 Web3 Swarm Empire</h1><input placeholder="Agent Name" onChange={e=>setAgentNFT(e.target.value)} className="w-full p-6 mt-8 rounded-3xl bg-white/10"/><button onClick={mint} className="w-full bg-purple-600 p-8 mt-4 rounded-3xl text-2xl">Mint NFT Agent!</button></div>);
}