import { InfoIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '~/components/ui/form';
import { LabelWithTooltip } from '~/components/ui/form-tooltip';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

interface SkillKindSelectorProps {
	//
	disabled?: boolean;
}

export function SkillKindSelector({ disabled = false }: SkillKindSelectorProps) {
	//
	const { control } = useFormContext();

	return (
		<FormField
			control={control}
			name="kind"
			render={({ field }) => (
				<FormItem>
					<LabelWithTooltip tooltip="Choose between a soft skill (decision-making by AI), or a hard skill (that connects to external apps).">
						What kind of skill?
					</LabelWithTooltip>
					<FormControl>
						<Tabs value={field.value} onValueChange={field.onChange} className="mt-2">
							<TabsList>
								<TabsTrigger value="soft" className="relative group" disabled={disabled}>
									Soft (decision-making)
									<InfoTooltip>
										AI-powered skills that make decisions, effectively controlling the reaction
										chain.
									</InfoTooltip>
								</TabsTrigger>
								<TabsTrigger value="hard" className="relative group" disabled={disabled}>
									Hard (using other apps)
									<InfoTooltip>
										API-based skills that connect to external apps and execute specific actions.
									</InfoTooltip>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

function InfoTooltip({ children }: { children: React.ReactNode }) {
	//
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<InfoIcon className="h-4 w-4 inline-block ml-1" />
				</TooltipTrigger>
				<TooltipContent>{children}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
