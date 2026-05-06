import defaultTheme from 'tailwindcss/defaultTheme';

const mdBreakpointString = defaultTheme.screens?.md ?? '768px';
const parsedBreakpoint = parseInt(mdBreakpointString, 10);

// default breakpoint inferred from Tailwind's default `md` screen size
export const DEFAULT_MD_BREAKPOINT = isNaN(parsedBreakpoint) ? 768 : parsedBreakpoint;
