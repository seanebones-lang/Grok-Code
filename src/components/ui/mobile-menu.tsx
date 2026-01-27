'use client'

import { Button } from './button'
import { Sheet, SheetContent, SheetTrigger } from './sheet'

export function MobileMenu({ children }: { children?: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost">Menu</Button>
      </SheetTrigger>
      <SheetContent>
        {children}
      </SheetContent>
    </Sheet>
  )
}
