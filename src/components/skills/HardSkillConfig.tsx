import { Trash } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { LabelWithTooltip } from '~/components/ui/form-tooltip';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ParameterType = 'search' | 'header' | 'path' | 'body';
export type ReactionCondition = 'owner' | 'companion' | 'any';

export interface ParamMapping {
	type: ParameterType;
	source: string;
	target: string;
}

export interface KnownReaction {
	skillKey: string;
	args: Record<string, any>;
	condition: ReactionCondition;
}

export interface HardSkillConfigProps {
	// Cost
	cost?: string;
	onCostChange?: (value: string) => void;

	// HTTP Configuration
	url?: string;
	onUrlChange?: (value: string) => void;
	method?: HttpMethod;
	onMethodChange?: (value: HttpMethod) => void;

	// Headers
	headers?: Record<string, string>;
	onHeadersChange?: (headers: Record<string, string>) => void;

	// Parameter Mappings
	paramMappings?: ParamMapping[];
	onParamMappingsChange?: (mappings: ParamMapping[]) => void;

	// Body Template
	bodyTemplate?: string;
	onBodyTemplateChange?: (value: string) => void;

	// Known Reactions
	knownReactions?: KnownReaction[];
	onKnownReactionsChange?: (reactions: KnownReaction[]) => void;

	// Available skills for reactions
	skillOptions?: Array<{ key: string; description: string }>;
}

export function HardSkillConfig({
	// Cost
	cost = '0.01',
	onCostChange = () => {},

	// HTTP Configuration
	url = '',
	onUrlChange = () => {},
	method = 'GET',
	onMethodChange = () => {},

	// Headers
	headers = {},
	onHeadersChange = () => {},

	// Parameter Mappings
	paramMappings = [],
	onParamMappingsChange = () => {},

	// Body Template
	bodyTemplate = '{}',
	onBodyTemplateChange = () => {},

	// Known Reactions
	knownReactions = [],
	onKnownReactionsChange = () => {},

	// Available skills for reactions
	skillOptions = [],
}: HardSkillConfigProps) {
	//
	// Temporary state for new header
	const [newHeader, setNewHeader] = useState({
		key: '',
		value: '',
	});

	// Temporary state for parameter mappings
	const [newParamMapping, setNewParamMapping] = useState<ParamMapping>({
		type: 'search',
		source: '',
		target: '',
	});

	// State for reactions
	const [newSkillKey, setNewSkillKey] = useState('');
	const [newReactionCondition, setNewReactionCondition] = useState<ReactionCondition>('any');

	// Header handlers
	const handleAddHeader = () => {
		if (!newHeader.key || !newHeader.value) return;

		onHeadersChange({
			...headers,
			[newHeader.key]: newHeader.value,
		});

		setNewHeader({ key: '', value: '' });
	};

	const handleRemoveHeader = (headerKey: string) => {
		const newHeaders = { ...headers };
		delete newHeaders[headerKey];
		onHeadersChange(newHeaders);
	};

	// Parameter mapping handlers
	const handleAddParamMapping = () => {
		if (!newParamMapping.source || !newParamMapping.target) return;

		onParamMappingsChange([...paramMappings, { ...newParamMapping }]);
		setNewParamMapping({
			type: 'search',
			source: '',
			target: '',
		});
	};

	const handleRemoveParamMapping = (index: number) => {
		onParamMappingsChange(paramMappings.filter((_, i) => i !== index));
	};

	// Reaction handlers
	const handleAddReaction = () => {
		if (!newSkillKey) return;

		onKnownReactionsChange([
			...knownReactions,
			{
				skillKey: newSkillKey,
				args: {},
				condition: newReactionCondition,
			},
		]);

		setNewSkillKey('');
	};

	const handleRemoveReaction = (index: number) => {
		onKnownReactionsChange(knownReactions.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-medium">HTTP Configuration</h2>

			<div className="space-y-4">
				<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
					{/* <div className="space-y-2">
						<LabelWithTooltip htmlFor="cost" tooltip="The cost to run this skill each time it's used.">
							Cost per use (in $)
						</LabelWithTooltip>
						<Select value={cost} onValueChange={onCostChange}>
							<SelectTrigger>
								<SelectValue placeholder="Select cost" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="0">$0 (Free)</SelectItem>
								<SelectItem value="0.001">$0.001</SelectItem>
								<SelectItem value="0.01">$0.01</SelectItem>
								<SelectItem value="0.05">$0.05</SelectItem>
								<SelectItem value="0.1">$0.10</SelectItem>
							</SelectContent>
						</Select>
					</div> */}

					<div className="space-y-2">
						<LabelWithTooltip htmlFor="method" tooltip="The HTTP method to use for the API request.">
							HTTP Method
						</LabelWithTooltip>
						<Select value={method} onValueChange={onMethodChange}>
							<SelectTrigger>
								<SelectValue placeholder="Select method" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="GET">GET</SelectItem>
								<SelectItem value="POST">POST</SelectItem>
								<SelectItem value="PUT">PUT</SelectItem>
								<SelectItem value="DELETE">DELETE</SelectItem>
								<SelectItem value="PATCH">PATCH</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<LabelWithTooltip htmlFor="url" tooltip="The endpoint URL that this skill will call.">
							URL
						</LabelWithTooltip>
						<Input
							id="url"
							value={url}
							onChange={(e) => onUrlChange(e.target.value)}
							placeholder="https://api.example.com/endpoint"
							required
						/>
					</div>
				</div>

				{/* Headers */}
				<div className="space-y-2">
					<LabelWithTooltip
						htmlFor="Headers"
						tooltip="HTTP headers to include with the request, such as authorization tokens."
					>
						Headers
					</LabelWithTooltip>
					<Card>
						<CardContent className="pt-4">
							<div className="space-y-4">
								<div className="flex gap-2">
									<Input
										placeholder="Header name"
										value={newHeader.key}
										onChange={(e) => setNewHeader({ ...newHeader, key: e.target.value })}
									/>
									<Input
										placeholder="Header value"
										value={newHeader.value}
										onChange={(e) => setNewHeader({ ...newHeader, value: e.target.value })}
									/>
									<Button
										type="button"
										onClick={handleAddHeader}
										disabled={!newHeader.key || !newHeader.value}
									>
										Add
									</Button>
								</div>

								{Object.keys(headers).length > 0 ? (
									<div className="space-y-2">
										{Object.entries(headers).map(([key, value]) => (
											<div
												key={key}
												className="flex justify-between items-center p-2 rounded bg-muted/50"
											>
												<div className="flex gap-2">
													<span className="font-medium">{key}:</span>
													<span>{value}</span>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => handleRemoveHeader(key)}
												>
													<Trash className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								) : (
									<div className="text-center p-4 text-muted-foreground">No headers defined</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Body Template */}
				<div className="space-y-2">
					<LabelWithTooltip
						htmlFor="bodyTemplate"
						tooltip="JSON template for the request body. Use {'{parameter}'} for dynamic values."
					>
						Body Template
					</LabelWithTooltip>
					<Textarea
						id="bodyTemplate"
						value={bodyTemplate}
						onChange={(e) => onBodyTemplateChange(e.target.value)}
						placeholder="{}"
						className="font-mono h-32"
					/>
				</div>

				{/* Parameter Mappings */}
				<div className="space-y-2">
					<LabelWithTooltip
						htmlFor="Parameter Mappings"
						tooltip="Define how input parameters should be mapped to the API request."
					>
						Parameter Mappings
					</LabelWithTooltip>
					<Card>
						<CardContent className="pt-4">
							<div className="space-y-4">
								<div className="flex gap-2 flex-wrap">
									<Select
										value={newParamMapping.type}
										onValueChange={(value) =>
											setNewParamMapping({
												...newParamMapping,
												type: value as ParameterType,
											})
										}
									>
										<SelectTrigger className="w-28">
											<SelectValue placeholder="Type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="search">Query</SelectItem>
											<SelectItem value="header">Header</SelectItem>
											<SelectItem value="path">Path</SelectItem>
											<SelectItem value="body">Body</SelectItem>
										</SelectContent>
									</Select>

									<Input
										placeholder="Source (parameter name)"
										value={newParamMapping.source}
										onChange={(e) =>
											setNewParamMapping({ ...newParamMapping, source: e.target.value })
										}
										className="flex-1"
									/>

									<Input
										placeholder="Target (API parameter name)"
										value={newParamMapping.target}
										onChange={(e) =>
											setNewParamMapping({ ...newParamMapping, target: e.target.value })
										}
										className="flex-1"
									/>

									<Button
										type="button"
										onClick={handleAddParamMapping}
										disabled={!newParamMapping.source || !newParamMapping.target}
									>
										Add
									</Button>
								</div>

								{paramMappings.length > 0 ? (
									<div className="space-y-2">
										{paramMappings.map((param, index) => (
											<div
												key={index}
												className="flex justify-between items-center p-2 rounded bg-muted/50"
											>
												<div>
													<Badge className="mr-2">{param.type}</Badge>
													<span className="font-medium">{param.source}</span>
													<span className="mx-2">→</span>
													<span>{param.target}</span>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => handleRemoveParamMapping(index)}
												>
													<Trash className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								) : (
									<div className="text-center p-4 text-muted-foreground">
										No parameter mappings defined
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Known Reactions */}
				<div className="space-y-2">
					<LabelWithTooltip
						htmlFor="Known Reactions"
						tooltip="Skills that should automatically run after this skill is used."
					>
						Known reactions
					</LabelWithTooltip>
					<div className="flex gap-2 flex-wrap">
						<Select value={newSkillKey} onValueChange={setNewSkillKey}>
							<SelectTrigger className="flex-1">
								<SelectValue placeholder="Select a skill" />
							</SelectTrigger>
							<SelectContent>
								{skillOptions.map((skill) => (
									<SelectItem key={skill.key} value={skill.key}>
										{skill.key}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={newReactionCondition}
							onValueChange={(value) => setNewReactionCondition(value as ReactionCondition)}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Condition" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="owner">Owner</SelectItem>
								<SelectItem value="companion">Companion</SelectItem>
								<SelectItem value="any">Any</SelectItem>
							</SelectContent>
						</Select>

						<Button type="button" onClick={handleAddReaction} disabled={!newSkillKey}>
							Add
						</Button>
					</div>

					{knownReactions.length > 0 ? (
						<div className="space-y-2 mt-2">
							{knownReactions.map((reaction, index) => (
								<div key={index} className="flex justify-between items-center p-2 rounded bg-muted/50">
									<div>
										<span className="font-medium">{reaction.skillKey}</span>
										<Badge className="ml-2" variant="outline">
											{reaction.condition}
										</Badge>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => handleRemoveReaction(index)}
									>
										<Trash className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					) : (
						<div className="text-center p-4 border rounded-md text-muted-foreground mt-2">
							No reactions defined
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
