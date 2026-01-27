'use client'

import { Button } from '@/components/ui/button'

export function SignInView() {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2>Sign In</h2>
      <Button>Continue with GitHub</Button>
    </div>
  )
}
