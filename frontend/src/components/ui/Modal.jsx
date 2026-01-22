/**
 * Modal.jsx
 *
 * Premium modal using Radix Dialog + Framer Motion
 * Accessible, animated, world-class feel
 */

import { forwardRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import './Modal.css'

const Modal = ({
    open,
    onOpenChange,
    children,
    ...props
}) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange} {...props}>
            {children}
        </Dialog.Root>
    )
}

const ModalTrigger = Dialog.Trigger

const ModalPortal = Dialog.Portal

const ModalOverlay = forwardRef(({ className, ...props }, ref) => (
    <Dialog.Overlay asChild ref={ref}>
        <motion.div
            className={clsx('modal-overlay', className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            {...props}
        />
    </Dialog.Overlay>
))
ModalOverlay.displayName = 'ModalOverlay'

const ModalContent = forwardRef(({
    className,
    children,
    size = 'md',
    showClose = true,
    ...props
}, ref) => (
    <AnimatePresence>
        <ModalPortal>
            <ModalOverlay />
            <Dialog.Content asChild ref={ref}>
                <motion.div
                    className={clsx('modal-content', `modal-${size}`, className)}
                    initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                    animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                    exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                    transition={{
                        type: 'spring',
                        damping: 25,
                        stiffness: 300
                    }}
                    {...props}
                >
                    {children}
                    {showClose && (
                        <Dialog.Close asChild>
                            <button className="modal-close" aria-label="Close">
                                <X size={18} />
                            </button>
                        </Dialog.Close>
                    )}
                </motion.div>
            </Dialog.Content>
        </ModalPortal>
    </AnimatePresence>
))
ModalContent.displayName = 'ModalContent'

const ModalHeader = ({ className, children, ...props }) => (
    <div className={clsx('modal-header', className)} {...props}>
        {children}
    </div>
)

const ModalTitle = forwardRef(({ className, ...props }, ref) => (
    <Dialog.Title
        ref={ref}
        className={clsx('modal-title', className)}
        {...props}
    />
))
ModalTitle.displayName = 'ModalTitle'

const ModalDescription = forwardRef(({ className, ...props }, ref) => (
    <Dialog.Description
        ref={ref}
        className={clsx('modal-description', className)}
        {...props}
    />
))
ModalDescription.displayName = 'ModalDescription'

const ModalBody = ({ className, children, ...props }) => (
    <div className={clsx('modal-body', className)} {...props}>
        {children}
    </div>
)

const ModalFooter = ({ className, children, ...props }) => (
    <div className={clsx('modal-footer', className)} {...props}>
        {children}
    </div>
)

// Export all parts
export {
    Modal,
    ModalTrigger,
    ModalContent,
    ModalHeader,
    ModalTitle,
    ModalDescription,
    ModalBody,
    ModalFooter,
}

export default Modal
