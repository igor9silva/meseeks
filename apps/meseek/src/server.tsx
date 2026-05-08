import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import './lib/bigint-serialization';

const handler = createStartHandler(defaultStreamHandler);

export default {
	fetch: handler,
};
