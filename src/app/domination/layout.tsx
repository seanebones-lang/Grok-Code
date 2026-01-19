// Server Component layout to force dynamic rendering for Client Component page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DominationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
