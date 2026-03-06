import { CodexDesktopPrototype } from './CodexDesktopPrototype';

const app = new CodexDesktopPrototype();

const shutdown = async (): Promise<void> => {
  await app.shutdown();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

const main = async (): Promise<void> => {
  await app.boot();
  await app.startThread('Electrobun prototype thread', process.cwd());
  await app.submitPrompt('Summarize the project status and ask for next step.');
  console.info('prototype booted', app.getState());
};

void main();
