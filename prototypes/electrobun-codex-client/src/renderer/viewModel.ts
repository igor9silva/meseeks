import type { StreamEvent } from '../shared/protocol';

export type ApprovalCard =
  | { kind: 'command'; requestId: string; detail: string; reason: string }
  | { kind: 'file'; requestId: string; detail: string; reason: string };

export type RendererState = {
  threadTitle: string;
  transcript: string;
  approvals: ApprovalCard[];
  isBusy: boolean;
  error: string | null;
};

export const createInitialState = (): RendererState => ({
  threadTitle: 'New thread',
  transcript: '',
  approvals: [],
  isBusy: false,
  error: null,
});

export const reduceStreamEvent = (state: RendererState, event: StreamEvent): RendererState => {
  if (event.type === 'output.delta') {
    return {
      ...state,
      transcript: state.transcript.concat(event.text),
      isBusy: true,
    };
  }

  if (event.type === 'approval.command.required') {
    return {
      ...state,
      approvals: state.approvals.concat({
        kind: 'command',
        requestId: event.payload.requestId,
        detail: event.payload.command,
        reason: event.payload.reason,
      }),
      isBusy: false,
    };
  }

  if (event.type === 'approval.file.required') {
    return {
      ...state,
      approvals: state.approvals.concat({
        kind: 'file',
        requestId: event.payload.requestId,
        detail: `${event.payload.action} ${event.payload.filePath}`,
        reason: event.payload.reason,
      }),
      isBusy: false,
    };
  }

  if (event.type === 'run.completed') {
    return {
      ...state,
      isBusy: false,
      error: null,
    };
  }

  return {
    ...state,
    isBusy: false,
    error: event.message,
  };
};

export const removeApproval = (state: RendererState, requestId: string): RendererState => ({
  ...state,
  approvals: state.approvals.filter((approval) => approval.requestId !== requestId),
});
