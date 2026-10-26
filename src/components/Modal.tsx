import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export default function Modal({ title, subtitle, children, onClose, wide }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    document.body.classList.add('modal-open');
    const cancel = (event: Event) => {
      event.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.close();
      document.body.classList.remove('modal-open');
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          const rect = dialogRef.current.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <button className="icon-button modal-close" onClick={onClose} aria-label="关闭弹窗">
        <X size={20} />
      </button>
      <div className="modal-heading">
        <span className="eyebrow">MAKE YOUR NEXT MOVE</span>
        <h2 id="dialog-title">{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </dialog>
  );
}
