import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '~/lib/utils';

import { type ButtonProps } from '~/components/ui/button';
import { useIsMobileWithMounted } from '~/hooks/useIsMobile';
import { Button } from './button';
import { Drawer, DrawerContent, DrawerTrigger } from './drawer';

const TooltipProvider = ({ delayDuration = 0, children, ...props }: TooltipPrimitive.TooltipProviderProps) => {
	//
	return (
		<TooltipPrimitive.Provider delayDuration={delayDuration} {...props}>
			{children}
		</TooltipPrimitive.Provider>
	);
};
TooltipProvider.displayName = TooltipPrimitive.Provider.displayName;

// context for mobile drawer state
const MobileTooltipContext = React.createContext<{
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
} | null>(null);

/**
 * Enhanced Tooltip component that can optionally render as a drawer on mobile devices.
 * By default, uses regular tooltip behavior. Set renderAsDrawerOnMobile=true for drawer behavior.
 */
const Tooltip = ({
	children,
	renderAsDrawerOnMobile = false,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Root> & {
	renderAsDrawerOnMobile?: boolean;
}) => {
	//
	const { isMobile, isMounted } = useIsMobileWithMounted();
	const [drawerOpen, setDrawerOpen] = React.useState(false);

	// don't render anything until mounted
	if (!isMounted) return null;

	if (isMobile && renderAsDrawerOnMobile) {
		return (
			<MobileTooltipContext.Provider value={{ isOpen: drawerOpen, setIsOpen: setDrawerOpen }}>
				<Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
					{children}
				</Drawer>
			</MobileTooltipContext.Provider>
		);
	}

	return <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>;
};

const TooltipTrigger = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>((props, ref) => {
	//
	const { isMobile, isMounted } = useIsMobileWithMounted();
	const mobileContext = React.useContext(MobileTooltipContext);

	// don't render until mounted
	if (!isMounted) return null;

	if (isMobile && mobileContext) {
		return <DrawerTrigger ref={ref} {...props} />;
	}

	return <TooltipPrimitive.Trigger ref={ref} {...props} />;
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipContent = React.forwardRef<
	React.ElementRef<typeof TooltipPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => {
	//
	const { isMobile, isMounted } = useIsMobileWithMounted();
	const mobileContext = React.useContext(MobileTooltipContext);

	// don't render until mounted
	if (!isMounted) return null;

	if (isMobile && mobileContext) {
		return (
			<DrawerContent>
				<div className="p-4">
					<div className={cn('text-sm text-foreground', className)}>{children}</div>
				</div>
			</DrawerContent>
		);
	}

	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				ref={ref}
				sideOffset={sideOffset}
				className={cn(
					'z-50 overflow-hidden rounded-xl bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]',
					className,
				)}
				{...props}
			>
				{children}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface TooltipButtonProps extends ButtonProps {
	//
	tooltipContent: React.ReactNode;
	renderAsDrawerOnMobile?: boolean;
}

function TooltipButton({ tooltipContent, renderAsDrawerOnMobile = false, children, ...props }: TooltipButtonProps) {
	//
	return (
		<Tooltip renderAsDrawerOnMobile={renderAsDrawerOnMobile}>
			<TooltipTrigger asChild>
				<Button {...props}>{children}</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltipContent}</TooltipContent>
		</Tooltip>
	);
}

export { Tooltip, TooltipButton, TooltipContent, TooltipProvider, TooltipTrigger };
