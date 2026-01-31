/**
 * SkipLink
 * Skip to main content for keyboard navigation
 */

import React from 'react'
import './SkipLink.css'

export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a href={href} className="skip-link">
      {children}
    </a>
  )
}

export default SkipLink
