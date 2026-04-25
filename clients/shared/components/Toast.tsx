import toast from 'react-hot-toast';
import type { ToastOptions } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import React from 'react';

interface CustomToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  toastId: string;
}

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
};

const bgMap = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

const CustomToast: React.FC<CustomToastProps> = ({ message, type, toastId }) => (
  <div
    className={`
      flex items-center gap-3 px-4 py-3 rounded-xl border
      backdrop-blur-md shadow-lg min-w-[280px] max-w-[400px]
      ${bgMap[type]}
    `}
  >
    {iconMap[type]}
    <p className="text-sm text-white font-medium flex-1">{message}</p>
    <button
      onClick={() => toast.dismiss(toastId)}
      className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
    >
      <X className="w-4 h-4 text-white/60" />
    </button>
  </div>
);

// Toast utility functions
const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'top-right',
};

export const showToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.custom(
      (t) => <CustomToast message={message} type="success" toastId={t.id} />,
      { ...defaultOptions, duration: 3000, ...options }
    ),

  error: (message: string, options?: ToastOptions) =>
    toast.custom(
      (t) => <CustomToast message={message} type="error" toastId={t.id} />,
      { ...defaultOptions, duration: 5000, ...options }
    ),

  warning: (message: string, options?: ToastOptions) =>
    toast.custom(
      (t) => <CustomToast message={message} type="warning" toastId={t.id} />,
      { ...defaultOptions, ...options }
    ),

  info: (message: string, options?: ToastOptions) =>
    toast.custom(
      (t) => <CustomToast message={message} type="info" toastId={t.id} />,
      { ...defaultOptions, ...options }
    ),
};

export default showToast;
