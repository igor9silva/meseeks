import { cn } from '~/lib/utils';

export function ExternalLink({ href, text, className }: { href: string; text: string; className?: string }) {
	//
	return (
		<a className={cn('underline', className)} href={href} target="_blank" rel="noopener noreferrer">
			{text}
		</a>
	);
}
