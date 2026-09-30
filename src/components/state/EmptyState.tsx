import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Optional override for the message; defaults to the i18n `state.empty`. */
  message?: string;
  className?: string;
}

/**
 * Shared empty-state message for lists/articles that return no items
 * (Req 19.2, 19.4). Copy flows through i18next (`state.empty`).
 * Design: Area 3 — 3d Consistent loading / empty / error states.
 */
export function EmptyState({ message, className }: EmptyStateProps) {
  const { t } = useTranslation();
  const text = message ?? t('state.empty');
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10 text-gray-600', className)}>
      <Inbox className="h-6 w-6 text-gray-400" aria-hidden="true" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default EmptyState;
