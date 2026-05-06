import { compileReactCode } from './compiler.js';

const validInput = `
import { Div, Button, useIsMobile } from '@comp/primitives';

const MyComponent = () => {
  const isMobile = useIsMobile();
  console.log('Component rendered');
  console.error('Something went wrong');
  return <Div>{isMobile ? <Button>Click Me</Button> : null}</Div>;
};
`;

try {
	const output = compileReactCode(validInput);
	console.log('Compiled Code:\n', output);
} catch (err) {
	console.error('Error:', err.message);
}

const invalidInput = `
import { Div } from '@comp/primitives';

function runMe() {
  console.debug('Hello');
}

const MyComponent = () => {
  return <Div>Invalid</Div>;
};
`;

try {
	const output = compileReactCode(invalidInput);
	console.log('Compiled Code:\n', output);
} catch (err) {
	console.error('Error:', err.message);
}
