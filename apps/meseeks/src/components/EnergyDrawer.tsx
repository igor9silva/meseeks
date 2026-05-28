import { useRef, useState } from 'react';
import { BudgetSelector } from '~/components/BudgetSelector';
import { Button } from '@reactor/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@reactor/ui/drawer';
import { useComposer } from '~/hooks/useComposer';
import { TaskBudget } from '~/components/TaskBudget';
import { useCurrentTask } from '~/hooks/useCurrentTask';

const DEFAULT_ENERGY_AMOUNT = 0.2;
const ENERGY_QUICK_OPTIONS = [0.2, 1, 5] as const;

type EnergyDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function EnergyDrawer({ open, onOpenChange }: EnergyDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<EnergyDrawerContent key={open ? 'open' : 'closed'} onOpenChange={onOpenChange} />
		</Drawer>
	);
}

function EnergyDrawerContent({ onOpenChange }: Pick<EnergyDrawerProps, 'onOpenChange'>) {
	//
	const { addEnergyIncrease } = useComposer();
	const [selectedEnergy, setSelectedEnergy] = useState(DEFAULT_ENERGY_AMOUNT);
	const hasChangedSelectedEnergyRef = useRef(false);
	const { task } = useCurrentTask();

	const handleConfirm = () => {
		//
		if (!addEnergyIncrease(selectedEnergy)) return;
		onOpenChange(false);
	};

	const handleQuickEnergyAdd = (dollars: number) => {
		//
		const nextEnergy = hasChangedSelectedEnergyRef.current ? selectedEnergy + dollars : dollars;
		setSelectedEnergy(nextEnergy);

		if (!addEnergyIncrease(nextEnergy)) return;
		onOpenChange(false);
	};

	const handleSelectedEnergyChange = (dollars: number) => {
		//
		setSelectedEnergy(dollars);
		hasChangedSelectedEnergyRef.current = true;
	};

	return (
		<DrawerContent>
			<DrawerHeader>
				<div className="flex justify-between items-center">
					<DrawerTitle>Increase energy</DrawerTitle>
					<TaskBudget task={task} />
				</div>
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
					onChange={handleSelectedEnergyChange}
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
	);
}

function formatQuickEnergyOption(amount: number) {
	//
	return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}
