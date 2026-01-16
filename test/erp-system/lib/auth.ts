export function checkAuth(req) {
  const token = req.headers.get('authorization');
  return token === 'Bearer empire'; // Stub - evolve JWT
}