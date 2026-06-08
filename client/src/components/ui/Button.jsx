import { Button as ShadButton } from '@/components/ui/button';

export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  loading,
  className = '',
  ...props
}) {
  const variantMap = {
    primary: 'default',
    secondary: 'outline',
    danger: 'destructive',
    ghost: 'ghost',
    success: 'default',
  };

  const sizeMap = {
    default: 'default',
    sm: 'sm',
    lg: 'lg',
  };

  return (
    <ShadButton
      variant={variantMap[variant] ?? 'default'}
      size={sizeMap[size] ?? 'default'}
      className={className}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current
          border-t-transparent rounded-full animate-spin mr-1" />
      )}
      {children}
    </ShadButton>
  );
}
