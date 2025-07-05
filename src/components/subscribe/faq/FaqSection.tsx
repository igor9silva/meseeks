import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { QuestionDialog } from '~/components/ui/QuestionDialog';

import { faqs } from './index';

export function FaqSection() {
	//
	return (
		<div className="w-full max-w-4xl mx-auto space-y-4 mt-2">
			<div className="text-center mb-6">
				<h2 className="text-2xl font-bold tracking-tight mb-2">Frequently Asked Questions</h2>
			</div>

			<Accordion type="multiple" className="w-full">
				{faqs.map((faq, index) => (
					<AccordionItem key={index} value={`item-${index}`} className="border rounded-lg mb-2 px-4">
						<AccordionTrigger className="text-left hover:no-underline font-bold">
							{faq.question}
						</AccordionTrigger>
						<AccordionContent>{faq.answer}</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>

			<div className="text-center flex flex-col items-center gap-1 pt-4">
				<p className="text-muted-foreground">Still have questions? We're here to help!</p>
				<QuestionDialog />
			</div>
		</div>
	);
}
