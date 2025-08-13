import { cn } from '@/lib/utils';

interface FooterProps {
  children?: React.ReactNode;
  className?: string;
}

export default function Footer({ children, className }: FooterProps) {
  return (
    <footer
      className={cn(
        'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      {children}
    </footer>
  );
}
