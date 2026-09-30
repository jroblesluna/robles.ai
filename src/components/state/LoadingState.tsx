import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /** Optional override for the status label; defaults to the i18n `state.loading`. */
  label?: string;
  className?: string;
}

/**
 * Shared loading indicator for data-fetching regions (Req 19.1, 19.4).
 * Copy flows through i18next (`state.loading`); no hard-coded literals.
 * Design: Area 3 — 3d Consistent loading / empty / error states.
 */
export function LoadingState({ label, className }: LoadingStateProps) {
  const { t } = useTranslation();
  const text = label ?? t('state.loading');
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-10 text-gray-600', className)}
    >
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-hidden="true" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export default LoadingState;
