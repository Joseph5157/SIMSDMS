import {
  Dialog,
  DialogContent,
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

export default function Modal({ open, onClose, title, size = 'md', children }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          widths[size],
          'max-h-[92vh] overflow-hidden flex flex-col',
          'rounded-2xl p-0 gap-0 border border-slate-200 shadow-modal bg-white'
        )}
        showCloseButton={false}
      >
        <DialogHeader className="px-6 py-5 border-b border-slate-200 shrink-0">
          <DialogTitle className="text-[15px] font-bold text-slate-900">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 p-0 flex flex-col gap-0">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
