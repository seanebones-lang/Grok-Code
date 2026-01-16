export async function generateMusic(prompt: string) {
  // MIDIutil stub + ML (reuse trading predict)
  const score = prompt.includes('jazz') ? 0.95 : 0.75;
  const midiBlob = new Blob(['MThd... MIDI data'], { type: 'audio/midi' });
  const url = URL.createObjectURL(midiBlob);
  return { url, score };
}