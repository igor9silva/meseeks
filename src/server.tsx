import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import './lib/bigint-serialization';

import { createRouter } from './router';

export default createStartHandler({
	createRouter,
})(defaultStreamHandler);
