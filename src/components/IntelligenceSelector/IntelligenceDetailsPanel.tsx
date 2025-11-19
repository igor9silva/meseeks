import { Brain, FileText } from 'lucide-react';
import { IntelligenceRating } from './IntelligenceRating';
import { type Intelligence } from 'convex/schemas/intelligenceSchema';
import { formatPricing, formatWordCount } from '~/lib/intelligence-utils';

interface IntelligenceDetailsPanelProps {
	intelligence: Intelligence | undefined;
}

export function IntelligenceDetailsPanel({ intelligence }: IntelligenceDetailsPanelProps) {
	//
	if (!intelligence) {
		return (
			<div className="w-72 hidden md:flex flex-col bg-transparent">
				<div className="p-4 border-b border-border">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Brain className="h-5 w-5 text-primary" />
							<h3 className="font-semibold text-sm text-card-foreground">Intelligence Details</h3>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const {
		name, //
		provider,
		intelligenceLevel,
		context,
		pricing,
	} = intelligence;

	const formattedPricing = formatPricing(pricing);
	const formattedMaxWords = formatWordCount(context.maxWords);

	return (
		<div className="w-72 hidden md:flex flex-col bg-transparent">
			<div className="p-4 border-b border-border">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Brain className="h-5 w-5 text-primary" />
						<h3 className="font-semibold text-sm text-card-foreground">{name}</h3>
					</div>
					<p className="text-xs text-muted-foreground">by {provider}</p>
				</div>
			</div>

			<div className="flex-1 p-4 space-y-4 bg-transparent">
				{/* Intelligence */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<Brain className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium text-card-foreground">Intelligence</span>
						<span className="text-xs text-muted-foreground">({intelligenceLevel}/10)</span>
					</div>
					<IntelligenceRating level={intelligenceLevel} showNumeric={false} />
				</div>

				{/* Context Length */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<FileText className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium text-card-foreground">Context length</span>
					</div>
					<p className="text-sm text-muted-foreground">
						Up to {context.maxTokens.toLocaleString()} tokens (~{formattedMaxWords})
					</p>
				</div>

				{/* Cost */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="text-sm text-muted-foreground">⚡</span>
						<span className="text-sm font-medium text-card-foreground">Cost</span>
						<span className="text-xs text-muted-foreground">
							(~${formattedPricing.estimatedPerMillionWords} per million words)
						</span>
					</div>
					<div className="space-y-1">
						<div className="flex justify-between items-center text-sm">
							<span className="text-muted-foreground">Input</span>
							<span className="font-medium text-card-foreground">
								${formattedPricing.input}/million tokens
							</span>
						</div>
						<div className="flex justify-between items-center text-sm">
							<span className="text-muted-foreground">Output</span>
							<span className="font-medium text-card-foreground">
								${formattedPricing.output}/million tokens
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
