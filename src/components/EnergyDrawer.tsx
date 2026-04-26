import { useEffect, useMemo, useState } from 'react';
import { BudgetSelector } from '~/components/BudgetSelector';
import { Button } from '~/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '~/components/ui/drawer';
import { useComposer } from '~/hooks/useComposer';

const DEFAULT_ENERGY_AMOUNT = 0.2;
const ENERGY_QUICK_OPTIONS = [0.2, 1, 5] as const;

type EnergyDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function EnergyDrawer({ open, onOpenChange }: EnergyDrawerProps) {
	//
	const { queue, setEnergyIncrease } = useComposer();
	const [selectedEnergy, setSelectedEnergy] = useState(DEFAULT_ENERGY_AMOUNT);

	const queuedIncreaseBudget = useMemo(() => {
		return queue.find((skill) => skill.skillKey === 'increaseBudget');
	}, [queue]);

	const queuedEnergy = getQueuedEnergyDollars(queuedIncreaseBudget?.args) ?? DEFAULT_ENERGY_AMOUNT;

	useEffect(() => {
		if (!open) return;
		setSelectedEnergy(queuedEnergy);
	}, [open, queuedEnergy]);

	const handleConfirm = () => {
		//
		if (!setEnergyIncrease(selectedEnergy)) return;
		onOpenChange(false);
	};

	const handleQuickEnergyAdd = (dollars: number) => {
		//
		const nextEnergy = selectedEnergy + dollars;
		setSelectedEnergy(nextEnergy);

		if (!setEnergyIncrease(nextEnergy)) return;
		onOpenChange(false);
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Increase energy budget</DrawerTitle>
				</DrawerHeader>
				<div className="mt-1 px-4 pb-4 space-y-3">
					<div className="grid grid-cols-3 gap-2">
						{ENERGY_QUICK_OPTIONS.map((amount) => (
							<Button
								key={amount}
								type="button"
								variant="secondary"
								onClick={() => handleQuickEnergyAdd(amount)}
								className="w-full"
							>
								<span className="flex items-center gap-1">
									<span aria-hidden="true">+</span>
									<span>{formatQuickEnergyOption(amount)}</span>
									<span aria-hidden="true">⚡</span>
								</span>
							</Button>
						))}
					</div>
					<BudgetSelector
						value={selectedEnergy}
						onChange={setSelectedEnergy}
						label="Add energy"
						className="w-full"
					/>
				</div>
				<DrawerFooter className="flex-row gap-2 pt-2">
					<DrawerClose asChild>
						<Button variant="outline" className="flex-1">
							Cancel
						</Button>
					</DrawerClose>
					<Button className="flex-1" onClick={handleConfirm}>
						Confirm
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

function formatQuickEnergyOption(amount: number) {
	//
	return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}

function getQueuedEnergyDollars(args: Record<string, unknown> | undefined) {
	//
	if (!args) return undefined;

	const dollars = args['dollars'];
	return typeof dollars === 'number' ? dollars : undefined;
}
