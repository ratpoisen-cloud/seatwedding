import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalStore } from './ModalStore';

interface ModalProps {
  id: 'guest' | 'table' | 'tags' | 'seatAction';
  title: string;
  children: React.ReactNode;
}

export function Modal({ id, title, children }: ModalProps) {
  const { activeModal, closeModal } = useModalStore();
  const isOpen = activeModal === id;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-50 bg-[#283618]/40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-secondary rounded-2xl shadow-[var(--shadow-card)] border border-primary/20 overflow-hidden pointer-events-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-primary/20">
                <h2 className="text-xl font-heading font-bold text-text-main">{title}</h2>
                <button
                  onClick={closeModal}
                  className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
