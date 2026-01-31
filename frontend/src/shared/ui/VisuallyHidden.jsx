/**
 * VisuallyHidden
 * Hide content visually but keep accessible to screen readers
 */

import React from 'react'

export function VisuallyHidden({ children, as: Component = 'span', ...props }) {
  return (
    <Component
      {...props}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        ...props.style
      }}
    >
      {children}
    </Component>
  )
}

export default VisuallyHidden
