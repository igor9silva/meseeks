import { z } from 'zod/v3';
import { contentPointerSchema } from 'schemas/fileSchema';

export const storageWriteSchema = z.object({
	key: z.string().min(1),
	contentType: z.string().min(1).optional(),
	size: z.number().int().nonnegative(),
});

const triggerProposalSchema = z.object({
	skillKey: z.string().min(1),
	args: z.record(z.unknown()).default({}),
	loop: z.string().min(1).nullable().optional(),
});

export type ContentPointer = z.infer<typeof contentPointerSchema>;
export type StorageWrite = z.infer<typeof storageWriteSchema>;

export type ObjectReadRange =
	| {
			offset: number;
			length: number;
	  }
	| {
			suffixLength: number;
	  };

export interface ObjectStorageAdapter {
	read(pointer: ContentPointer): Promise<Uint8Array>;
	readRange?(pointer: ContentPointer, range: ObjectReadRange): Promise<Uint8Array>;
	write(input: { bytes: Uint8Array; contentType?: string }): Promise<StorageWrite>;
	delete(key: string): Promise<void>;
}

export interface SandboxAdapter {
	run(input: SandboxRunInput): Promise<SandboxRunResult>;
	cancel(runId: string): Promise<void>;
}

export type SandboxRunInput = {
	actionId: string;
	files: Array<{
		path: string;
		content: Uint8Array;
	}>;
	command: string;
	env: Record<string, string>;
	timeoutMs: number;
};

export type SandboxRunResult = {
	runId: string;
	stdout: string;
	stderr: string;
	exitCode: number;
	declaredOutputs: Array<{
		path: string;
		bytes: Uint8Array;
		contentType?: string;
	}>;
	metadata: Record<string, unknown>;
};

export interface TriggerIsolateAdapter {
	evaluate(input: TriggerIsolateInput): Promise<TriggerIsolateResult>;
}

export type TriggerIsolateInput = {
	code: string;
	context: Record<string, unknown>;
	timeoutMs: number;
};

export type TriggerIsolateResult = {
	proposals: Array<z.infer<typeof triggerProposalSchema>>;
	metadata: Record<string, unknown>;
};

export interface IntelligenceAdapter {
	run(input: IntelligenceRunInput): Promise<IntelligenceRunResult>;
}

export type IntelligenceRunInput = {
	intelligence: string;
	instructions: string;
	input: Array<Record<string, unknown>>;
	settings: Record<string, unknown>;
	maxOutputTokens: number;
};

export type IntelligenceRunResult = {
	text: string;
	costs: Array<{
		symbol: 'USD';
		amount: bigint;
		description: string;
	}>;
	providerItems: Array<Record<string, unknown>>;
	reasoningSummaries: string[];
	metadata: Record<string, unknown>;
};

export const triggerProposalListSchema = z.array(triggerProposalSchema);
