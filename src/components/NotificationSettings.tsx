import { Bell, BellOff } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { useWebNotifications } from '~/hooks/useWebNotifications';

export function NotificationSettings() {
	//
	const { isSupported, permission, isSubscribed, subscribeToPush, unsubscribeFromPush, testNotification } =
		useWebNotifications();

	const handleToggleNotifications = async () => {
		//
		if (!isSubscribed) {
			await subscribeToPush();
		} else {
			await unsubscribeFromPush();
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{isSubscribed ? (
						<Bell className="h-5 w-5" />
					) : (
						<BellOff className="h-5 w-5 text-muted-foreground" />
					)}
					Push Notifications
				</CardTitle>
				<CardDescription>
					Get notified when your tasks need attention or have updates, even when you're not using the app.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<p className="text-sm font-medium">Enable push notifications</p>
						<p className="text-xs text-muted-foreground">
							Receive notifications for task status changes (unread, blocked)
						</p>
					</div>
					<Switch
						checked={isSubscribed}
						onCheckedChange={handleToggleNotifications}
						disabled={!isSupported}
					/>
				</div>

				{/* Test button for development */}
				{isSubscribed && permission === 'granted' && (
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="space-y-0.5">
							<p className="font-medium">Test Notifications</p>
							<p className="text-sm text-muted-foreground">
								Send a test notification to verify everything is working
							</p>
						</div>
						<Button onClick={testNotification} variant="outline" size="sm">
							Send Test
						</Button>
					</div>
				)}

				{!isSupported && (
					<div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
						<p className="font-medium">Browser not supported</p>
						<p>Your browser doesn't support push notifications. Please use a modern browser.</p>
					</div>
				)}

				{isSupported && permission === 'denied' && (
					<div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
						<p className="font-medium">Permission denied</p>
						<p>
							You have denied notification permissions. Please enable them in your browser settings and
							refresh the page.
						</p>
					</div>
				)}

				<div className="text-xs text-muted-foreground">
					<p>
						Push notifications will be sent from our servers when:
						<br />• A task becomes "unread" (has new responses)
						<br />• A task becomes "blocked" (needs your approval or attention)
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
