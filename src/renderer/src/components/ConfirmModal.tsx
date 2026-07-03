import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText }: ConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-all"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-white pr-8">{title}</h2>
        <p className="text-gray-300 mb-8 text-sm">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-white/70 font-semibold hover:text-white hover:bg-white/10 transition-colors"
          >
            {cancelText || t('common.cancel', 'Cancelar')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
          >
            {confirmText || t('common.confirm', 'Aceptar')}
          </button>
        </div>
      </div>
    </div>
  );
}
