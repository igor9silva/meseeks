import { EnterpriseEarlyAccessDialog } from './EnterpriseEarlyAccessDialog';

export const EnterpriseFaq = {
	//
	question: 'Do you offer enterprise plans?',
	answer: (
		<div className="space-y-3 text-muted-foreground leading-relaxed">
			<p>Not yet.</p>
			<EnterpriseEarlyAccessDialog />
		</div>
	),
};
