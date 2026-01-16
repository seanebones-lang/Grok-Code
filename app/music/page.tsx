'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { generateMusic } from '@/lib/composer';

type Composition = {
  id: number;
  title: string;
  midi_url: string;
  score: number;
};

export default function MusicCreator() {
  const supabase = createClient();
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCompositions();
    const channel = supabase
      .channel('music-compositions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compositions' }, fetchCompositions)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchCompositions = async () => {
    const { data } = await supabase.from('compositions').select('*').order('score', { ascending: false });
    setCompositions(data || []);
  };

  const createComposition = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    const midiData = await generateMusic(prompt);
    const { data } = await supabase.from('compositions').insert({
      title: prompt.slice(0, 50),
      midi_url: midiData.url,
      score: midiData.score,
    });
    setPrompt('');
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-black mb-16 text-center drop-shadow-2xl bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          AI Music Creator Empire
        </h1>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl mb-16">
          <h2 className="text-3xl mb-8 text-center">Describe your music</h2>
          <div className="flex gap-4">
            <input
              className="flex-1 p-6 text-2xl border-2 border-white/30 rounded-2xl focus:ring-4 focus:ring-yellow-400 focus:border-transparent bg-white/5 placeholder-gray-300"
              placeholder="E.g., upbeat jazz piano with saxophone solo, 120 BPM"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={createComposition}
              disabled={generating || !prompt.trim()}
              className="px-12 py-6 text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 rounded-2xl hover:shadow-2xl transition-all disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Create'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {compositions.map((comp) => (
            <div key={comp.id} className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all">
              <h3 className="text-2xl font-bold mb-4">{comp.title}</h3>
              <div className="w-full bg-black/20 rounded-xl p-4 mb-6">
                <div className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-lg" style={{ width: `${comp.score * 100}%` }} />
                <span className="text-sm ml-2">ML Score: {comp.score.toFixed(2)}</span>
              </div>
              <button
                onClick={() => {/* Web Audio MIDI play */}}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-xl transition-all"
              >
                Play MIDI
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}