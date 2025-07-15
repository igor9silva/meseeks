import { Id } from 'convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { Action } from '~/components/Action';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Textarea } from '~/components/ui/textarea';

import { z } from 'zod';
import { cn } from '~/lib/utils';
import { actionSchema } from '../../convex/schemas/actionSchema';

// Default test action for setUserInfo
const DEFAULT_ACTION = `{
  "_creationTime": 1750954710909.044,
  "_id": "nd72mqnsnze8tk21rextqdtawn7jjsjz",
  "approvedAt": 1750954711276,
  "approvedBy": "auto",
  "args": {
    "userInfo": "Igor Silva, born 1997-01-22 in São Paulo, Brazil; raised in Santos; moved to Setúbal, Portugal in Nov/2023; Brazilian/Portuguese citizen; engineer, entrepreneur, investor; speaks English (advanced), Portuguese (native), Spanish (some); Twitter @igor9silva; creator of Meseeks"
  },
  "author": "nd7ehvp1shq129m44hfrh8tqt17jkmhy",
  "costs": [
    {
      "amount": "0",
      "description": "Built-in skills are free of charge.",
      "symbol": "USD"
    }
  ],
  "depth": 4,
  "estimatedCost": null,
  "owner": "jd7160sjr09g2dkxhenn3fy9wx74pfsk",
  "result": {
    "reactions": [
      {
        "args": {},
        "author": "nd72mqnsnze8tk21rextqdtawn7jjsjz",
        "depth": 5,
        "owner": "jd7160sjr09g2dkxhenn3fy9wx74pfsk",
        "skillKey": "iterate",
        "taskId": "kh79gxscr97dj1xkd3fa1e556h7jkdre"
      }
    ],
    "text": "✅ User information updated."
  },
  "skillKey": "setUserInfo",
  "status": "succeeded",
  "taskId": "kh79gxscr97dj1xkd3fa1e556h7jkdre",
  "details": null
}`;

export function ActionTest({ className }: { className?: string }) {
	//
	const [actionJSON, setActionJSON] = useState(DEFAULT_ACTION);
	const [parsedAction, setParsedAction] = useState<z.infer<typeof actionSchema> | null>(null);
	const [error, setError] = useState<string>('');

	// Auto-parse when JSON changes
	useEffect(() => {
		//
		try {
			const parsed = JSON.parse(actionJSON);

			// Basic validation
			const requiredFields = ['_id', 'skillKey', 'status', 'args'];
			const missingFields = requiredFields.filter((field) => !(field in parsed));

			if (missingFields.length > 0) {
				setError(`Missing required fields: ${missingFields.join(', ')}`);
				setParsedAction(null);
				return;
			}

			setParsedAction(parsed as z.infer<typeof actionSchema>);
			setError('');
		} catch (err) {
			setError(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
			setParsedAction(null);
		}
	}, [actionJSON]);

	const handleReset = () => {
		//
		setActionJSON(DEFAULT_ACTION);
		setParsedAction(null);
		setError('');
	};

	const handleStatusChange = (newStatus: z.infer<typeof actionSchema>['status']) => {
		//
		if (!parsedAction) return;

		const updatedAction = {
			...parsedAction,
			status: newStatus,
		};

		// @ts-expect-error
		setParsedAction(updatedAction);
		setActionJSON(JSON.stringify(updatedAction, null, 2));
	};

	return (
		<div className={cn('space-y-6', className)}>
			<div className="text-center">
				<h1 className="text-3xl font-bold">UI Test - Action Components</h1>
				<p className="text-muted-foreground mt-2">Test action components by inputting action JSON data</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Input Section */}
				<Card>
					<CardHeader>
						<CardTitle>Action JSON Input</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Textarea
							value={actionJSON}
							onChange={(e) => setActionJSON(e.target.value)}
							placeholder="Paste action JSON here..."
							className="min-h-96 font-mono text-sm"
						/>

						{error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

						<div className="flex gap-2">
							<Button variant="outline" onClick={handleReset}>
								Reset to Default
							</Button>
						</div>

						{parsedAction && (
							<div className="space-y-2">
								<h4 className="font-medium">Quick Status Changes:</h4>
								<div className="flex gap-2 flex-wrap">
									{[
										'pending authorization' as const,
										'running' as const,
										'succeeded' as const,
										'failed' as const,
										'skipped' as const,
										'enqueued' as const,
									].map((status) => (
										<Button
											key={status}
											size="sm"
											variant={parsedAction.status === status ? 'default' : 'outline'}
											onClick={() => handleStatusChange(status)}
										>
											{status}
										</Button>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Preview Section */}
				<Card>
					<CardHeader>
						<CardTitle>Action Component Preview</CardTitle>
					</CardHeader>
					<CardContent>
						{parsedAction ? (
							<div className="space-y-4">
								<div className="text-sm text-muted-foreground">
									<strong>Skill:</strong> {parsedAction.skillKey} <br />
									<strong>Status:</strong> {parsedAction.status}
								</div>

								<div className="border rounded-lg p-4 bg-background">
									<Action
										// @ts-expect-error
										action={parsedAction}
										initialRenderDate={new Date(Date.now() - 1000)} // 1 second ago
										isAuthorCurrentUser={false}
										taskId={'test-task-id' as Id<'tasks'>}
									/>
								</div>

								<div className="text-sm text-muted-foreground">
									<strong>Preview as current user:</strong>
								</div>

								<div className="border rounded-lg p-4 bg-background">
									<Action
										// @ts-expect-error
										action={parsedAction}
										initialRenderDate={new Date(Date.now() - 1000)} // 1 second ago
										isAuthorCurrentUser={true}
										taskId={'test-task-id' as Id<'tasks'>}
									/>
								</div>
							</div>
						) : (
							<div className="text-center text-muted-foreground py-8">
								{error ? 'Fix the JSON to see the preview' : 'Loading preview...'}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
