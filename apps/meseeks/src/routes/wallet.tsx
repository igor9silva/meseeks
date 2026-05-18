import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { track } from '@vercel/analytics/react';
import { asDollars } from 'lib/money';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { z } from 'zod/v3';
import { ActiveTasksTab } from '~/components/balance/ActiveTasksTab';
import { LowBalanceWarning } from '~/components/balance/LowBalanceWarning';
import { TopUpSection } from '~/components/balance/TopUpSection';
import { TransactionsTab } from '~/components/balance/TransactionsTab';
import { EnergyTooltip } from '~/components/EnergyTooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@reactor/ui/avatar';
import { Badge } from '@reactor/ui/badge';
import { Separator } from '@reactor/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@reactor/ui/tabs';
import { useLockedBalance } from '~/hooks/query/useTransactions';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { useIsPro } from '~/hooks/useIsPro';
import { CreditCard, Fingerprint, KeyRound, ShieldCheck, Smartphone, Wallet } from 'lucide-react';

const searchSchema = z.object({
	tab: z.enum(['transactions', 'active-tasks']).optional(),
});

export const Route = createFileRoute('/wallet')({
	component: RouteComponent,
	validateSearch: searchSchema,
});

function RouteComponent() {
	//
	const user = useCurrentUser();
	const navigate = useNavigate();
	const { tab } = Route.useSearch();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { lockedBalance } = useLockedBalance();

	const { isPro } = useIsPro();

	const currentTab = tab || 'transactions';
	const availableBalance = user.balanceUSD ?? 0n;
	const totalBalance = availableBalance + lockedBalance;

	const handleTabChange = useCallback(
		(value: string) => {
			const newTab = value === 'transactions' ? undefined : (value as 'active-tasks');
			navigate({
				to: '/wallet',
				search: { tab: newTab },
				replace: true,
			});
		},
		[navigate],
	);

	track('wallet', {
		balance: asDollars({ bigInt: availableBalance, precision: 10 }),
		lockedBalance: asDollars({ bigInt: lockedBalance, precision: 10 }),
	});

	return (
		<div ref={scrollContainerRef} className="h-full overflow-y-auto">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-6 md:py-7">
				<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="space-y-2">
						<h1 className="text-3xl font-semibold">Wallet & Identity</h1>
						<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							<Badge variant={isPro ? 'default' : 'secondary'}>{isPro ? 'Pro' : 'Free'}</Badge>
							<Badge variant="outline">{user.isAnonymous ? 'Anonymous' : 'Signed in'}</Badge>
							<Badge variant="outline">{getVerificationLabel(user.verificationLevel)}</Badge>
						</div>
					</div>
					<div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
						<Avatar className="size-10 rounded-md">
							<AvatarImage src={user.image} alt={user.name ?? user.email ?? 'User'} />
							<AvatarFallback className="rounded-md">{getInitials(user.name, user.email)}</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<div className="truncate text-sm font-medium">{user.name ?? 'Meseeks user'}</div>
							<div className="truncate text-xs text-muted-foreground">{user.email ?? user._id}</div>
						</div>
					</div>
				</header>

				<section className="grid gap-3 md:grid-cols-3">
					<MetricPanel
						icon={<Wallet className="size-4" />}
						label="Available energy"
						value={
							<EnergyTooltip>
								<span>{asDollars({ bigInt: availableBalance, precision: 6 })}⚡</span>
							</EnergyTooltip>
						}
					/>
					<MetricPanel
						icon={<ShieldCheck className="size-4" />}
						label="Locked in tasks"
						value={
							<EnergyTooltip>
								<span>{asDollars({ bigInt: lockedBalance, precision: 6 })}⚡</span>
							</EnergyTooltip>
						}
					/>
					<MetricPanel
						icon={<CreditCard className="size-4" />}
						label="Total account energy"
						value={
							<EnergyTooltip>
								<span>{asDollars({ bigInt: totalBalance, precision: 6 })}⚡</span>
							</EnergyTooltip>
						}
					/>
				</section>

				<LowBalanceWarning balance={availableBalance} />

				<section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
					<div className="space-y-5">
						<div className="rounded-lg border bg-background">
							<div className="grid gap-0 md:grid-cols-3">
								<StatusPanel
									icon={<Fingerprint className="size-4" />}
									title="Identity"
									rows={[
										['Email', user.email ?? 'Not connected'],
										['Phone', user.phone ?? 'Not connected'],
										['Verification', getVerificationLabel(user.verificationLevel)],
									]}
								/>
								<StatusPanel
									icon={<Wallet className="size-4" />}
									title="Wallet"
									rows={[
										['Address', formatWalletAddress(user.walletAddress)],
										['Chain', user.walletChain ?? 'Not connected'],
										['Funding', isPro ? 'Top-ups enabled' : 'Pro required'],
									]}
								/>
								<StatusPanel
									icon={<KeyRound className="size-4" />}
									title="Secrets"
									rows={[
										['Skill secrets', 'Server-held'],
										['OAuth credentials', 'Scoped by provider'],
										['Local keys', 'None connected'],
									]}
								/>
							</div>
						</div>

						<Tabs value={currentTab} onValueChange={handleTabChange} className="flex flex-col">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="transactions">Transactions</TabsTrigger>
								<TabsTrigger value="active-tasks">Task locks</TabsTrigger>
							</TabsList>

							<TabsContent value="transactions" className="mt-4">
								<TransactionsTab scrollContainerRef={scrollContainerRef} />
							</TabsContent>

							<TabsContent value="active-tasks" className="mt-4">
								<ActiveTasksTab scrollContainerRef={scrollContainerRef} />
							</TabsContent>
						</Tabs>
					</div>

					<aside className="space-y-5">
						<div className="rounded-lg border bg-background p-4">
							<div className="mb-4 flex items-center gap-2">
								<Smartphone className="size-4 text-muted-foreground" />
								<h2 className="text-base font-semibold">Account Access</h2>
							</div>
							<div className="space-y-3 text-sm">
								<AccessRow
									label="Email"
									value={user.emailVerificationTime ? 'Verified' : 'Unverified'}
								/>
								<AccessRow
									label="Phone"
									value={user.phoneVerificationTime ? 'Verified' : 'Not verified'}
								/>
								<AccessRow
									label="Device"
									value={user.verificationLevel === 'device' ? 'Verified' : 'Not verified'}
								/>
								<AccessRow
									label="Orb"
									value={user.verificationLevel === 'orb' ? 'Verified' : 'Not verified'}
								/>
							</div>
						</div>

						<div className="rounded-lg border bg-background p-4">
							<TopUpSection isPro={isPro} user={user} />
						</div>
					</aside>
				</section>
			</div>
		</div>
	);
}

function MetricPanel({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
	return (
		<div className="rounded-lg border bg-background p-4">
			<div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
				{icon}
				<span>{label}</span>
			</div>
			<div className="text-2xl font-semibold">{value}</div>
		</div>
	);
}

function StatusPanel({ icon, rows, title }: { icon: ReactNode; rows: Array<[string, string]>; title: string }) {
	return (
		<div className="space-y-3 border-b p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
			<div className="flex items-center gap-2">
				{icon}
				<h2 className="text-base font-semibold">{title}</h2>
			</div>
			<div className="space-y-2">
				{rows.map(([label, value]) => (
					<div key={label} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 text-sm">
						<div className="text-muted-foreground">{label}</div>
						<div className="min-w-0 truncate font-medium">{value}</div>
					</div>
				))}
			</div>
		</div>
	);
}

function AccessRow({ label, value }: { label: string; value: string }) {
	const isVerified = value === 'Verified';

	return (
		<div>
			<div className="flex items-center justify-between gap-3">
				<span className="text-muted-foreground">{label}</span>
				<span className={isVerified ? 'font-medium text-emerald-500' : 'font-medium'}>{value}</span>
			</div>
			<Separator className="mt-3" />
		</div>
	);
}

function getInitials(name?: string, email?: string) {
	const value = name ?? email ?? 'ME';
	const initials = value
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join('');

	return initials.toUpperCase() || 'ME';
}

function getVerificationLabel(verificationLevel?: 'orb' | 'device') {
	if (verificationLevel === 'orb') return 'Orb verified';
	if (verificationLevel === 'device') return 'Device verified';
	return 'Unverified';
}

function formatWalletAddress(walletAddress?: string) {
	if (!walletAddress) return 'Not connected';
	if (walletAddress.length <= 14) return walletAddress;
	return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}
