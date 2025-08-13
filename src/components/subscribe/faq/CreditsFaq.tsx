import { ExternalLink } from '../ExternalLink';

export const CreditsFaq = {
	question: 'What are credits?',
	answer: (
		<div className="space-y-3 text-muted-foreground leading-relaxed">
			<p>
				Credits are used to pay for actions your Meseeks perform. Those can be AI computing (e.g. OpenAI API
				tokens), or regular API calls (e.g. every time it does a web search using{' '}
				<ExternalLink href="https://tavily.com" text="Tavily" />, they charge $0.008).
			</p>
			<p>
				1 ⚡ = 1 US Dollar, and <strong>we put no margin on the provider cost</strong>. i.e. if Tavily charges
				us $0.008/usage, we charge you exactly that. The same goes for any AI usage, you pay exactly their
				advertised cost.
			</p>
			<p>
				Pro subscribers get $10 worth of <strong>credits that never expire</strong>, every month.
			</p>
			<p>
				You can also top up as much credits as you need, with zero markup from us -{' '}
				<strong>$10 gets you exactly $10 worth of credits.</strong>
			</p>
		</div>
	),
};
