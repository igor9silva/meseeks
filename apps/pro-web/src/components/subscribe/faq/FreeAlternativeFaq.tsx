import { ExternalLink } from '~/components/subscribe/ExternalLink';

export const FreeAlternativeFaq = {
	question: 'Is there a free alternative?',
	answer: (
		<div className="space-y-3 text-muted-foreground leading-relaxed">
			<p>
				Of course! Meseeks is 100% open-source under{' '}
				<ExternalLink href="https://github.com/igor9silva/meseeks/blob/main/LICENSE.md" text="AGPL-3.0" />, so{' '}
				<strong>you can always self-host it for free, forever.</strong> Please refer to our{' '}
				<ExternalLink href="https://github.com/igor9silva/meseeks" text="Github repository" /> to get started.
			</p>
			<p>
				The Pro subscription is mainly for convenience and scale. Using our cloud, you can interact with your
				Meseeks from anywhere in the world, your data is always safe (backed up) and you have no hardware
				limits.
			</p>
			<p>
				Also, <strong>your data is yours</strong>. That means you can leave Pro at anytime and bring every
				single byte with you.
			</p>
			<p>That also means you come back hassle-free 😁.</p>
		</div>
	),
};
