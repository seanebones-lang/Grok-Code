// Force dynamic rendering for newsletters page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function NewslettersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
