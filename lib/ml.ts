export function predictLeadScore(name: string, email: string): number {
  let score = 0.5;
  score += name.length / 50 * 0.2;  // Name quality
  score += email.includes('@') ? 0.3 : 0;
  score += Math.random() * 0.3;  // ML regression stub
  return Math.min(1, score);
}