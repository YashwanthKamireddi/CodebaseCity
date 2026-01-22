/**
 * Button.jsx
 *
 * Premium button component with Framer Motion springs
 * Inspired by Linear, Vercel, and Stripe button designs
 */

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import './Button.css'

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className,
  onClick,
  ...props
}, ref) => {

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault()
      return
    }
    onClick?.(e)
  }

  return (
    <motion.button
      ref={ref}
      className={clsx(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        disabled && 'btn-disabled',
        loading && 'btn-loading',
        fullWidth && 'btn-full-width',
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <span className="btn-spinner">
          <svg viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}

      {/* Left icon */}
      {icon && !loading && (
        <span className="btn-icon btn-icon-left">{icon}</span>
      )}

      {/* Label */}
      <span className="btn-label">{children}</span>

      {/* Right icon */}
      {iconRight && !loading && (
        <span className="btn-icon btn-icon-right">{iconRight}</span>
      )}

      {/* Shine effect overlay */}
      <span className="btn-shine" />
    </motion.button>
  )
})

Button.displayName = 'Button'

/**
 * IconButton - Square button for icons only
 */
export const IconButton = forwardRef(({
  children,
  variant = 'ghost',
  size = 'md',
  label,
  disabled = false,
  className,
  ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      className={clsx(
        'icon-btn',
        `icon-btn-${variant}`,
        `icon-btn-${size}`,
        disabled && 'icon-btn-disabled',
        className
      )}
      disabled={disabled}
      aria-label={label}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  )
})

IconButton.displayName = 'IconButton'

export default Button
