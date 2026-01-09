'use client'

import { useState, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Wrench,
  TestTube,
  Copy,
  Check,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RefactorPlan as RefactorPlanType, RefactorStep } from '@/hooks/useAgentOrchestrator'

/**
 * RefactorPlan Component
 * Displays a structured refactoring plan with before/after diffs
 */

interface RefactorPlanProps {
  plan: RefactorPlanType
  className?: string
}

// Step component with expandable diff view
const RefactorStepCard = memo(function RefactorStepCard({ 
  step, 
  isLast 
}: { 
  step: RefactorStep
  isLast: boolean 
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedBefore, setCopiedBefore] = useState(false)
  const [copiedAfter, setCopiedAfter] = useState(false)

  const handleCopy = useCallback(async (code: string, type: 'before' | 'after') => {
    try {
      await navigator.clipboard.writeText(code)
      if (type === 'before') {
        setCopiedBefore(true)
        setTimeout(() => setCopiedBefore(false), 2000)
      } else {
        setCopiedAfter(true)
        setTimeout(() => setCopiedAfter(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  const hasDiff = step.before || step.after

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-[#404050]" />
      )}
      
      <div className="flex gap-3">
        {/* Step number */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#6841e7] flex items-center justify-center text-white font-bold text-sm z-10">
          {step.step}
        </div>
        
        {/* Step content */}
        <div className="flex-1 pb-6">
          <button
            onClick={() => hasDiff && setIsExpanded(!isExpanded)}
            className={cn(
              "w-full text-left p-3 rounded-lg bg-[#2a2a3e] border border-[#404050] transition-colors",
              hasDiff && "hover:border-[#6841e7] cursor-pointer"
            )}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-white">{step.description}</h4>
              {hasDiff && (
                <span className="text-[#9ca3af]">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
              )}
            </div>
            
            {step.rationale && (
              <p className="mt-2 text-sm text-[#9ca3af]">{step.rationale}</p>
            )}
          </button>
          
          {/* Expandable diff section */}
          <AnimatePresence>
            {isExpanded && hasDiff && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Before */}
                  {step.before && (
                    <div className="rounded-lg border border-red-500/20 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-b border-red-500/20">
                        <span className="text-sm font-medium text-red-400">Before</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(step.before!, 'before')
                          }}
                        >
                          {copiedBefore ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <pre className="p-3 text-sm font-mono text-[#e5e7eb] bg-[#0f0f23] overflow-x-auto">
                        <code>{step.before}</code>
                      </pre>
                    </div>
                  )}
                  
                  {/* After */}
                  {step.after && (
                    <div className="rounded-lg border border-green-500/20 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border-b border-green-500/20">
                        <span className="text-sm font-medium text-green-400">After</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(step.after!, 'after')
                          }}
                        >
                          {copiedAfter ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <pre className="p-3 text-sm font-mono text-[#e5e7eb] bg-[#0f0f23] overflow-x-auto">
                        <code>{step.after}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
})

// Impact badge component
const ImpactBadge = memo(function ImpactBadge({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string
  value: string
  icon: React.ElementType 
}) {
  // Determine color based on value sentiment
  const isPositive = value.toLowerCase().includes('improve') || 
                     value.toLowerCase().includes('better') ||
                     value.toLowerCase().includes('increase') ||
                     value.toLowerCase().includes('high')
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border",
      isPositive 
        ? "bg-green-500/10 border-green-500/20" 
        : "bg-[#2a2a3e] border-[#404050]"
    )}>
      <Icon className={cn("h-4 w-4", isPositive ? "text-green-400" : "text-[#9ca3af]")} />
      <div>
        <p className="text-xs text-[#9ca3af]">{label}</p>
        <p className={cn("text-sm font-medium", isPositive ? "text-green-400" : "text-white")}>
          {value}
        </p>
      </div>
    </div>
  )
})

export const RefactorPlan = memo(function RefactorPlan({ plan, className }: RefactorPlanProps) {
  const [showAllTests, setShowAllTests] = useState(false)
  const visibleTests = showAllTests ? plan.suggestedTests : plan.suggestedTests.slice(0, 3)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Analysis Section */}
      {plan.analysis && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-[#2a2a3e] border border-[#404050]"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded bg-blue-500/20">
              <AlertTriangle className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white">Analysis</h3>
          </div>
          <p className="text-sm text-[#9ca3af] whitespace-pre-wrap">{plan.analysis}</p>
        </motion.div>
      )}

      {/* Refactor Steps */}
      {plan.steps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded bg-[#6841e7]/20">
              <Wrench className="h-4 w-4 text-[#6841e7]" />
            </div>
            <h3 className="font-semibold text-white">Refactor Plan</h3>
            <span className="text-xs text-[#9ca3af] bg-[#2a2a3e] px-2 py-0.5 rounded">
              {plan.steps.length} steps
            </span>
          </div>
          
          <div className="space-y-0">
            {plan.steps.map((step, index) => (
              <RefactorStepCard 
                key={step.step} 
                step={step} 
                isLast={index === plan.steps.length - 1}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Impact Assessment */}
      {(plan.impact.performance || plan.impact.maintainability || plan.impact.testability) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded bg-amber-500/20">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white">Impact Assessment</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plan.impact.performance && (
              <ImpactBadge 
                label="Performance" 
                value={plan.impact.performance} 
                icon={Zap}
              />
            )}
            {plan.impact.maintainability && (
              <ImpactBadge 
                label="Maintainability" 
                value={plan.impact.maintainability} 
                icon={Wrench}
              />
            )}
            {plan.impact.testability && (
              <ImpactBadge 
                label="Testability" 
                value={plan.impact.testability} 
                icon={TestTube}
              />
            )}
          </div>
        </motion.div>
      )}

      {/* Suggested Tests */}
      {plan.suggestedTests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded bg-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <h3 className="font-semibold text-white">Suggested Tests</h3>
            <span className="text-xs text-[#9ca3af] bg-[#2a2a3e] px-2 py-0.5 rounded">
              {plan.suggestedTests.length} tests
            </span>
          </div>
          
          <ul className="space-y-2">
            {visibleTests.map((test, index) => (
              <li 
                key={index}
                className="flex items-start gap-2 text-sm text-[#9ca3af]"
              >
                <ArrowRight className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>{test}</span>
              </li>
            ))}
          </ul>
          
          {plan.suggestedTests.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs text-[#6841e7] hover:text-[#7c5cff]"
              onClick={() => setShowAllTests(!showAllTests)}
            >
              {showAllTests ? 'Show less' : `Show ${plan.suggestedTests.length - 3} more`}
            </Button>
          )}
        </motion.div>
      )}
    </div>
  )
})
