import { cn } from '@/lib/utils';

interface NavigationProps {
  children?: React.ReactNode;
  className?: string;
}

export default function Navigation({ children, className }: NavigationProps) {
  return (
    <nav className={cn('flex items-center space-x-4', className)}>
      {children}
    </nav>
  );
}
