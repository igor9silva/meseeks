import { createApi } from '@convex-dev/better-auth';
import { createCodegenAuthOptions } from 'lib/authOptions';
import schema from './schema';

export const {
	create, //
	findOne,
	findMany,
	updateOne,
	updateMany,
	deleteOne,
	deleteMany,
	consumeOne,
	incrementOne,
} = createApi(schema, () => createCodegenAuthOptions());
