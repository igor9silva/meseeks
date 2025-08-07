import { ExternalLink } from '~/components/subscribe/ExternalLink';

export const FounderPackageFaq = {
	question: 'How does the Founder Package work?',
	answer: (
		<div className="space-y-3 text-muted-foreground leading-relaxed">
			<p>
				We're a really small company (1 person) running on our savings. No investors, no VC, just pure raw
				passion. So we designed the <strong>Founder Package</strong> for those willing to help our free, open
				and transparent research!
			</p>
			<p>
				You make a one-time payment for 24 months of Pro access (worth $240), plus $300 credits immediately,
				plus $10 every month for 24 months, totaling <strong>$780 worth of value</strong>.
			</p>
			<p>
				<h4 className="font-semibold">You also get:</h4>
				<ul className="list-disc pl-5">
					<li>
						An on-chain (numbered NFT) founder badge to display on your (yet to be released) public profile,
						and on our <ExternalLink href="https://discord.gg/nmagFVGvfE" text="Discord server" />.
					</li>
					<li>Early access to new features and experimental stuff, forever.</li>
					<li className="font-bold">A very special place on our hearts 🤍🩶🖤🤎💜🩵💙💚💛🧡🩷.</li>
				</ul>
			</p>
			<p>
				We are limiting that offer to 1000 founders so we can properly support each one of them. We'll make sure
				founders won't regret trusting us 😁
			</p>
		</div>
	),
};
