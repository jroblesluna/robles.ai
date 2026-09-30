import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** Optional override for the error message; defaults to the i18n `state.error`. */
  message?: string;
  /** When provided, renders a retry/alternative action button. */
  onRetry?: () => void;
  /** Optional override for the retry label; defaults to the i18n `state.retry`. */
  retryLabel?: string;
  className?: string;
}

/**
 * Shared error state that informs the visitor and offers a retry/alternative
 * action (Req 19.3, 19.4). Copy flows through i18next (`state.error`,
 * `state.retry`). Design: Area 3 — 3d Consistent loading / empty / error states.
 */
export function ErrorState({ message, onRetry, retryLabel, className }: ErrorStateProps) {
  const { t } = useTranslation();
  const text = message ?? t('state.error');
  const retryText = retryLabel ?? t('state.retry');
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 py-10 text-gray-700', className)}
    >
      <AlertTriangle className="h-6 w-6 text-red-500" aria-hidden="true" />
      <p className="text-sm">{text}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="tap-target">
          {retryText}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
