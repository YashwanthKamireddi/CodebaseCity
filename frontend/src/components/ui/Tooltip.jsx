/**
 * Tooltip.jsx
 *
 * Premium tooltip using Radix + Framer Motion
 * Accessible and beautifully animated
 */

import { forwardRef } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import './Tooltip.css'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = forwardRef(({
  className,
  children,
  side = 'top',
  sideOffset = 6,
  ...props
}, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      side={side}
      sideOffset={sideOffset}
      className={clsx('tooltip-content', className)}
      asChild
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: side === 'top' ? 4 : -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300,
          duration: 0.15
        }}
      >
        {children}
        <TooltipPrimitive.Arrow className="tooltip-arrow" />
      </motion.div>
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = 'TooltipContent'

/**
 * Simple tooltip wrapper for common use case
 */
function SimpleTooltip({
  children,
  content,
  side = 'top',
  delayDuration = 300,
  ...props
}) {
  return (
    <Tooltip delayDuration={delayDuration} {...props}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  SimpleTooltip
}

export default SimpleTooltip
