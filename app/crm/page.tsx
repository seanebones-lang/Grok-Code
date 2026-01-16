'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { predictLeadScore } from '@/lib/ml';

type Lead = { id: number; name: string; email: string; score: number };

export default function CRM() {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchLeads();
    const channel = supabase
      .channel('crm-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchLeads = async () => {
    const { data } = await supabase.from('leads').select('*');
    const scored = (data || []).map((l: Omit<Lead, 'score'>) => ({ ...l, score: predictLeadScore(l.name, l.email) }));
    setLeads(scored);
  };

  const addLead = async () => {
    const score = predictLeadScore(name, email);
    await supabase.from('leads').insert({ name, email, score });
    setName(''); setEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-black mb-16 text-center drop-shadow-2xl">Enterprise CRM Dashboard</h1>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 mb-12 shadow-2xl">
          <input
            className="w-full p-6 mb-4 text-2xl border-2 border-white/30 rounded-2xl bg-white/5"
            placeholder="Lead Name"
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full p-6 mb-4 text-2xl border-2 border-white/30 rounded-2xl bg-white/5"
            placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <button
            onClick={addLead}
            className="w-full p-8 text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl hover:shadow-xl"
          >
            Add Lead (ML Score)
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-xl hover:shadow-2xl">
              <h3 className="text-2xl font-bold mb-2">{lead.name}</h3>
              <p className="text-gray-300 mb-4">{lead.email}</p>
              <div className="w-full bg-gray-800 rounded-xl p-3">
                <div
                  className="h-6 rounded-lg transition-all"
                  style={{ width: `${lead.score * 100}%`, background: `linear-gradient(to right, #10b981, #f59e0b)` }}
                />
                <span className="text-lg font-bold ml-2">{lead.score.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}