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

export default function Modal({ open, onClose, title, description, size = 'md', children }) {
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;
  const descriptionId = `modal-desc-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          widths[size],
          'max-h-[calc(100vh-80px)] md:max-h-[92vh] overflow-hidden flex flex-col',
          'rounded-2xl p-0 gap-0 border border-slate-200 shadow-modal bg-white'
        )}
        showCloseButton={false}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader className="px-6 py-5 border-b border-slate-200 shrink-0">
          <DialogTitle id={titleId} className="text-[15px] font-bold text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription id={descriptionId} className={description ? "text-[13px] text-slate-600" : "sr-only"}>
            {description || title}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-6 py-4 md:py-5 flex flex-col gap-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
