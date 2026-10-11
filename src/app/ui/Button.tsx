import type { ComponentProps } from 'react';
import { Link } from 'react-router';

type Appearance = { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'default' | 'compact'; unstyled?: boolean };
function classes({ variant = 'secondary', size = 'default', unstyled, className = '' }: Appearance & { className?: string }) {
  return unstyled ? className : `button button-${variant}${size === 'compact' ? ' button-small' : ''} ${className}`.trim();
}
export function Button({ variant, size, unstyled, className, ...props }: ComponentProps<'button'> & Appearance) {
  return <button className={classes({ variant, size, unstyled, className })} {...props} />;
}
export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & Omit<Appearance, 'unstyled'>) {
  return <Link className={classes({ variant, size, className })} {...props} />;
}
