import { useNavigate } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { Bug, Expand, ExternalLink, Loader2, Minimize2, Share } from 'lucide-react';
import { CopyButton } from '~/components/CopyButton';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useComponentShare } from '~/hooks/useComponentShare';

interface RenderActionControlsProps {
	//
	action: Doc<'actions'>;
	code: string;
	isFullscreen: boolean;
	onToggleFullscreen: () => void;
	className?: string;
}

export function RenderActionControls({
	action,
	code,
	isFullscreen,
	onToggleFullscreen,
	className,
}: RenderActionControlsProps) {
	//
	const navigate = useNavigate();
	const { shareComponent, isSharingComponent } = useComponentShare();

	const handleDebugClick = (e?: React.MouseEvent) => {
		e?.stopPropagation();

		// Navigate to dev mode with action anchor
		navigate({
			to: '/$',
			search: (prev) => ({ ...prev, debug: true }),
			hash: `action-${action._id}`,
		});
	};
	const handleShareClick = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		e?.preventDefault();
		void shareComponent({ actionId: action._id });
	};

	return (
		<div className={className}>
			<DebugButton onClick={handleDebugClick} />
			<ShareButton onClick={handleShareClick} isSharing={isSharingComponent} />
			<OpenInNewTabButton href={`/action/${action._id}`} />
			{isFullscreen ? (
				<MinimizeButton onClick={onToggleFullscreen} />
			) : (
				<ExpandButton onClick={onToggleFullscreen} />
			)}
			<CopyButton textToCopy={code} />
		</div>
	);
}

function ExpandButton({ onClick }: { onClick: () => void }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className="h-6 w-6 border">
						<Expand className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Expand to fullscreen</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function MinimizeButton({ onClick }: { onClick: () => void }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className="h-6 w-6 border">
						<Minimize2 className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Exit fullscreen</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function DebugButton({ onClick }: { onClick: (e?: React.MouseEvent) => void }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className="h-6 w-6 border">
						<Bug className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Inspect in dev mode</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function OpenInNewTabButton({ href }: { href: string }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" className="h-6 w-6 border" asChild>
						<a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
							<ExternalLink className="h-4 w-4" />
						</a>
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Open in new tab</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function ShareButton({
	onClick,
	isSharing,
}: {
	onClick: (e?: React.MouseEvent) => void;
	isSharing: boolean;
}) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" className="h-6 w-6 border" onClick={onClick} disabled={isSharing}>
						{isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share className="h-4 w-4" />}
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Share publicly</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
