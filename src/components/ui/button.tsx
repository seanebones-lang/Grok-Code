import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-[#6841e7] text-white shadow-md hover:bg-[#7c5cff] hover:shadow-lg active:scale-[0.98] focus-visible:ring-primary/50",
        destructive:
          "bg-[#ef4444] text-white shadow-md hover:bg-[#dc2626] hover:shadow-lg active:scale-[0.98]",
        outline:
          "border border-[#404050] bg-[#1a1a2e] text-white shadow-sm hover:bg-[#2a2a3e] hover:border-[#505060] active:scale-[0.98]",
        secondary:
          "bg-[#1a1a2e] text-white shadow-sm hover:bg-[#2a2a3e] active:scale-[0.98]",
        ghost: "text-white hover:bg-[#1a1a2e] active:bg-[#2a2a3e]",
        link: "text-[#6841e7] underline-offset-4 hover:underline hover:text-[#7c5cff]",
      },
      size: {
        default: "h-10 px-4 py-2",      // 40px height, 16px horizontal padding
        sm: "h-8 rounded-md px-3 py-1.5",  // 32px height, 12px horizontal padding
        lg: "h-12 rounded-lg px-6 py-3",   // 48px height, 24px horizontal padding
        icon: "h-10 w-10",              // 40px square
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
