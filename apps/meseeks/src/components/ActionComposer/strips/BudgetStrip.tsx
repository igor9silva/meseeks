import { AddCustomBudgetButton } from '~/components/AddBudgetButton';
import { FileBudget } from '~/components/FileBudget';
import type { FileView } from '~/hooks/query/useFile';

export function BudgetStrip({ file }: { file: FileView }) {
	//
	return (
		<div className="flex items-center justify-between px-4 py-1.5 text-sm">
			<FileBudget file={file} precision={2} showSpent={true} />
			<AddCustomBudgetButton variant="ghost" content="+⚡" />
		</div>
	);
}
