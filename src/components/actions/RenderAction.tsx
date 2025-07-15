import { ActionComponentProps } from '~/components/actions';
import { SayAction } from '~/components/actions/SayAction';

export function RenderAction(props: ActionComponentProps) {
	//
	return <SayAction {...props} shouldRenderComponents={true} contentKey="code" className="[&>*]:bg-transparent!" />;
}
