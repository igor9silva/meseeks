import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { Checkbox } from './checkbox';

interface LoadingCheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
	loading?: boolean;
}

export function LoadingCheckbox({ loading = false, disabled, ...props }: LoadingCheckboxProps) {
	//
	if (loading) {
		return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />;
	}

	return <Checkbox disabled={disabled || loading} {...props} />;
}
