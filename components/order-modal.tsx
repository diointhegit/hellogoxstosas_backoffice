"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type OrderModalProps = {
  isOpen: boolean
  onClose: () => void
  orderId?: string
  // Add other props as needed
}

export function OrderModal({ isOpen, onClose, orderId }: OrderModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Order ID: {orderId}
          </DialogDescription>
        </DialogHeader>

        <div>
          {/* Add your modal content here */}
        </div>

        <DialogFooter>
          <button onClick={onClose}>Close</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

