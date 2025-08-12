import { cn } from '@/lib/utils';

interface SidebarProps {
  children?: React.ReactNode;
  className?: string;
  isOpen?: boolean;
}

export default function Sidebar({
  children,
  className,
  isOpen = true,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-all duration-300 ease-in-out',
        isOpen ? 'w-64' : 'w-0 overflow-hidden',
        className
      )}
    >
      {children}
    </aside>
  );
}
