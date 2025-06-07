export function ExternalLink({ href, text }: { href: string; text: string }) {
	//
	return (
		<a className="underline" href={href} target="_blank" rel="noopener noreferrer">
			{text}
		</a>
	);
}
