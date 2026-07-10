import { useCommandState } from '@reactor/ui/command';
import { Brain, FileText } from 'lucide-react';
import { formatPricing, formatWordCount } from '~/lib/intelligence';
import { IntelligenceRating } from './IntelligenceRating';
import type { IntelligencePickerOption } from './types';

interface IntelligenceDetailsPanelProps {
	options: IntelligencePickerOption[];
	hovered: string | null;
	selected: string;
}

export function IntelligenceDetailsPanel({ options, hovered, selected }: IntelligenceDetailsPanelProps) {
	//
	const focusedValue = useCommandState((state) => state.value);

	const intelligence =
		options.find((option) => option.key === focusedValue) ??
		options.find((option) => option.key === hovered) ??
		options.find((option) => option.key === selected);

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
		description,
	} = intelligence;

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
				{description && <p className="text-sm text-muted-foreground">{description}</p>}

				{intelligenceLevel !== undefined && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Brain className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium text-card-foreground">Intelligence</span>
							<span className="text-xs text-muted-foreground">({intelligenceLevel}/10)</span>
						</div>
						<IntelligenceRating level={intelligenceLevel} showNumeric={false} />
					</div>
				)}

				{context && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium text-card-foreground">Context length</span>
						</div>
						<p className="text-sm text-muted-foreground">
							{context.maxTokens.toLocaleString()} tokens (~{formatWordCount(context.maxWords)})
						</p>
					</div>
				)}

				{pricing && (
					<CostDetails
						input={formatPricing(pricing).input}
						output={formatPricing(pricing).output}
						estimatedPerMillionWords={formatPricing(pricing).estimatedPerMillionWords}
					/>
				)}
			</div>
		</div>
	);
}

function CostDetails({
	input,
	output,
	estimatedPerMillionWords,
}: {
	input: string;
	output: string;
	estimatedPerMillionWords: string;
}) {
	//
	return (
		<div>
			<div className="flex items-center gap-2 mb-2">
				<span className="text-sm text-muted-foreground">⚡</span>
				<span className="text-sm font-medium text-card-foreground">Cost</span>
				<span className="text-xs text-muted-foreground">(~${estimatedPerMillionWords} per million words)</span>
			</div>
			<div className="space-y-1">
				<div className="flex justify-between items-center text-sm">
					<span className="text-muted-foreground">Input</span>
					<span className="font-medium text-card-foreground">${input}/million tokens</span>
				</div>
				<div className="flex justify-between items-center text-sm">
					<span className="text-muted-foreground">Output</span>
					<span className="font-medium text-card-foreground">${output}/million tokens</span>
				</div>
			</div>
		</div>
	);
}
