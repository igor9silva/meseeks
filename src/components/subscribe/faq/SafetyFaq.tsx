export const SafetyFaq = {
	question: 'Is it safe?',
	answer: (
		<div className="space-y-3 text-muted-foreground leading-relaxed">
			<p>
				<strong>Yes.</strong> Safety is built into the core design through multiple layers of control.
			</p>
			<p>
				<strong>Open source:</strong> Every single line of code that runs Meseeks is open source. That means one
				can read, inspect and verify how it works, and if our claims are true.
			</p>
			<p>
				<strong>Transparency:</strong> Meseeks operates under <strong>full transparency</strong>. You can see
				every byte and every token going in and out, including our own system prompts.
			</p>
			<p>
				<strong>Budget Control:</strong> All actions are funded using task budgets. You control autonomy at the
				skill level - allowing automatic execution up to a set amount, or requiring human authorization for
				sensitive actions like publishing content or sending emails.
			</p>
			<p>
				<strong>Progressive Trust:</strong> As Meseeks learns from your actions and decisions, you naturally
				increase its limits over time. The system's autonomy grows linearly with your trust in it.
			</p>
			<p>
				<strong>Full Control:</strong> You can stop anything at any time.
			</p>
			<div className="border-l-4 border-amber-500 pl-4 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-r">
				<p className="font-semibold text-amber-800 dark:text-amber-200">IMPORTANT DISCLAIMER</p>
				<div className="text-amber-700 dark:text-amber-300 space-y-2">
					<p>
						Meseeks is a tool and, therefore, cannot be held accountable. It takes actions{' '}
						<strong>on your behalf</strong>, meaning you are responsible for any outcomes.
					</p>
					<p>
						To guarantee that, Meseeks is designed to be fully traceable, i.e. every action is traceable to
						a human decision that triggered it, directly or through a chain of reactions.{' '}
						<strong>By using Meseeks, you agree that you are responsible for all outcomes.</strong>
					</p>
					<p>If it earns money, it's yours. If it causes damages, you pay.</p>
					<p>
						Meseeks allows you to operate at infinite scale. <strong>Be responsible.</strong>
					</p>
				</div>
			</div>
		</div>
	),
};
