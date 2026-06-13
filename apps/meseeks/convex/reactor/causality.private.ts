'use node';

import { z } from 'zod/v3';
import { actionAuthorSchema } from 'schemas/workspaceSchema';

export type SourceAuthor = z.infer<typeof actionAuthorSchema>;
