"use client"

import * as React from "react"
import { Group, Panel, Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

// Extended props to include autoSaveId
interface ResizablePanelGroupProps extends React.ComponentProps<typeof Group> {
  autoSaveId?: string
}

const ResizablePanelGroup = ({
  className,
  autoSaveId,
  ...props
}: ResizablePanelGroupProps) => (
  <Group
    className={cn("flex h-full w-full", className)}
    {...(autoSaveId ? { id: autoSaveId } : {})}
    {...props}
  />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) => {
  return (
    <Separator
      className={cn(
        "relative flex w-1 items-center justify-center bg-[#1a1a1a] hover:bg-primary/50 transition-colors cursor-col-resize group",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-full after:-translate-x-1/2 after:cursor-col-resize",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-8 w-6 items-center justify-center rounded-sm border border-[#1a1a1a] bg-[#1a1a1a] group-hover:bg-primary/20 group-hover:border-primary/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 text-[#9ca3af] group-hover:text-primary"
          >
            <path d="M9 5v14M15 5v14" />
          </svg>
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
