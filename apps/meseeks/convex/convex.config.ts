import betterAuth from './betterAuth/convex.config';
import migrations from '@convex-dev/migrations/convex.config';
import { defineApp } from 'convex/server';

const app = defineApp();
app.use(betterAuth);
app.use(migrations);

export default app;
