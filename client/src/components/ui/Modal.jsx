import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const widths = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
};

export default function Modal({ open, onClose, title, description, size = 'md', children, footer }) {
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;
  const descriptionId = `modal-desc-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'w-[calc(100vw-24px)] sm:w-full',
          widths[size],
          'max-h-[calc(100dvh-24px)] overflow-hidden flex flex-col',
          'rounded-2xl p-0 gap-0 border border-slate-200 shadow-modal bg-white'
        )}
        showCloseButton={false}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader className="px-5 sm:px-6 md:px-8 py-4 md:py-6 border-b border-slate-200 shrink-0">
          <DialogTitle id={titleId} className="text-[15px] font-bold text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription id={descriptionId} className={description ? "text-[13px] text-slate-600" : "sr-only"}>
            {description || title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 md:px-8 py-5 md:py-6 flex flex-col gap-4">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 px-5 sm:px-6 md:px-8 py-3 md:py-4 flex justify-end gap-2 border-t border-slate-200 bg-white">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
