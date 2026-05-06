// Tailwind CSS safelist configuration
// Classes that can be used in MDX and shouldn't be stripped out during purge

export const tailwindSafelist = [
	//
	// Layout & Display
	'flex',
	'inline-flex',
	'block',
	'inline-block',
	'inline',
	'hidden',
	'grid',
	'table',
	'table-cell',
	'table-row',

	// Flexbox & Grid
	'flex-row',
	'flex-col',
	'flex-wrap',
	'flex-nowrap',
	'items-start',
	'items-center',
	'items-end',
	'items-stretch',
	'justify-start',
	'justify-center',
	'justify-end',
	'justify-between',
	'justify-around',
	'justify-evenly',
	'self-start',
	'self-center',
	'self-end',
	'self-stretch',
	'flex-1',
	'flex-auto',
	'flex-initial',
	'flex-none',
	'grow',
	'grow-0',
	'shrink',
	'shrink-0',

	// Grid system patterns - comprehensive but targeted
	{ pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12|none)$/ },
	{ pattern: /^col-span-(1|2|3|4|5|6|7|8|9|10|11|12|full)$/ },
	{ pattern: /^row-span-(1|2|3|4|5|6|full)$/ },
	{
		pattern:
			/^gap-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},

	// Spacing patterns - all valid Tailwind spacing values
	{
		pattern:
			/^m-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px)$/,
	},
	{
		pattern:
			/^mx-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px)$/,
	},
	{
		pattern:
			/^my-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px)$/,
	},
	{
		pattern:
			/^mt-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px)$/,
	},
	{
		pattern:
			/^mr-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px)$/,
	},
	{
		pattern:
			/^mb-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px)$/,
	},
	{
		pattern:
			/^ml-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px)$/,
	},
	{
		pattern:
			/^p-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},
	{
		pattern:
			/^px-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},
	{
		pattern:
			/^py-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},
	{
		pattern:
			/^pt-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},
	{
		pattern:
			/^pr-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},
	{
		pattern:
			/^pb-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},
	{
		pattern:
			/^pl-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},

	// Width patterns - all valid Tailwind width values
	{
		pattern:
			/^w-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px|full|screen|min|max|fit)$/,
	},
	{
		pattern:
			/^w-(1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|1\/5|2\/5|3\/5|4\/5|1\/6|2\/6|3\/6|4\/6|5\/6|1\/12|2\/12|3\/12|4\/12|5\/12|6\/12|7\/12|8\/12|9\/12|10\/12|11\/12)$/,
	},

	// Height patterns
	{
		pattern:
			/^h-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px|full|screen|min|max|fit)$/,
	},
	{ pattern: /^h-(1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|1\/5|2\/5|3\/5|4\/5|1\/6|2\/6|3\/6|4\/6|5\/6)$/ },

	// Min/max sizing
	{ pattern: /^min-w-(0|full|min|max|fit|none)$/ },
	{ pattern: /^min-h-(0|full|screen|min|max|fit)$/ },
	{
		pattern:
			/^max-w-(0|none|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|min|max|fit|prose|screen-sm|screen-md|screen-lg|screen-xl|screen-2xl)$/,
	},
	{
		pattern:
			/^max-h-(0|1|2|3|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px|full|screen|min|max|fit)$/,
	},

	// Typography patterns - specific and targeted
	{ pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/ },
	{ pattern: /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/ },
	{ pattern: /^leading-(3|4|5|6|7|8|9|10|none|tight|snug|normal|relaxed|loose)$/ },
	{ pattern: /^tracking-(tighter|tight|normal|wide|wider|widest)$/ },
	'text-left',
	'text-center',
	'text-right',
	'text-justify',
	'uppercase',
	'lowercase',
	'capitalize',
	'normal-case',
	'underline',
	'line-through',
	'no-underline',
	'italic',
	'not-italic',

	// Color patterns - targeted to common color variants
	{ pattern: /^text-(inherit|current|transparent|black|white)$/ },
	{
		pattern:
			/^text-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
	},
	{ pattern: /^bg-(inherit|current|transparent|black|white)$/ },
	{
		pattern:
			/^bg-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
	},
	{ pattern: /^border-(inherit|current|transparent|black|white)$/ },
	{
		pattern:
			/^border-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
	},

	// Border patterns
	{ pattern: /^border(-0|-2|-4|-8)?$/ },
	{ pattern: /^border-(t|r|b|l)(-0|-2|-4|-8)?$/ },
	'border-solid',
	'border-dashed',
	'border-dotted',
	'border-double',
	'border-none',
	{ pattern: /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/ },
	{ pattern: /^rounded-(t|r|b|l|tl|tr|br|bl)(-none|-sm|-md|-lg|-xl|-2xl|-3xl)?$/ },

	// Shadow patterns
	{ pattern: /^shadow(-sm|-md|-lg|-xl|-2xl|-inner|-none)?$/ },

	// Position patterns
	'static',
	'fixed',
	'absolute',
	'relative',
	'sticky',
	{
		pattern:
			/^(top|right|bottom|left)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px|full)$/,
	},
	{
		pattern:
			/^inset-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|px|full)$/,
	},
	{ pattern: /^z-(0|10|20|30|40|50|auto)$/ },

	// Overflow patterns
	{ pattern: /^overflow-(auto|hidden|visible|scroll|clip)$/ },
	{ pattern: /^overflow-(x|y)-(auto|hidden|visible|scroll|clip)$/ },

	// Opacity patterns
	{ pattern: /^opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)$/ },

	// Transitions & Transforms
	{ pattern: /^transition(-none|-all|-colors|-opacity|-shadow|-transform)?$/ },
	{ pattern: /^duration-(75|100|150|200|300|500|700|1000)$/ },
	{ pattern: /^ease-(linear|in|out|in-out)$/ },
	{ pattern: /^transform(-gpu|-none)?$/ },
	{ pattern: /^scale-(0|50|75|90|95|100|105|110|125|150)$/ },
	{ pattern: /^rotate-(0|1|2|3|6|12|45|90|180)$/ },
	{
		pattern:
			/^translate-(x|y)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px|full)$/,
	},

	// Interactive states
	{
		pattern:
			/^cursor-(auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out)$/,
	},
	{ pattern: /^pointer-events-(none|auto)$/ },
	{ pattern: /^select-(none|text|all|auto)$/ },

	// Custom theme colors
	{ pattern: /^(text|bg|border)-(primary|secondary|destructive|muted|accent|popover|card|sidebar)(-foreground)?$/ },
	{
		pattern:
			/^(text|bg|border)-(primary|secondary|destructive|muted|accent|popover|card|sidebar)(-foreground)?\/\d+$/,
	},

	// Chart colors
	'text-chart-1',
	'text-chart-2',
	'text-chart-3',
	'text-chart-4',
	'text-chart-5',
	'bg-chart-1',
	'bg-chart-2',
	'bg-chart-3',
	'bg-chart-4',
	'bg-chart-5',
	'border-chart-1',
	'border-chart-2',
	'border-chart-3',
	'border-chart-4',
	'border-chart-5',

	// Scrollbar utilities
	'scrollbar',
	'scrollbar-thin',
	'scrollbar-none',
	'scrollbar-track-transparent',
	'scrollbar-track-muted',
	'scrollbar-thumb-muted-foreground',

	// Text utilities
	'break-words',
	'break-all',
	'break-normal',
	{ pattern: /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap)$/ },
	{ pattern: /^hyphens-(none|manual|auto)$/ },

	// Form states and placeholders
	{
		pattern:
			/^placeholder-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(300|400|500|600)$/,
	},
	'placeholder-muted-foreground',

	// Ring utilities
	{ pattern: /^ring-(0|1|2|4|8)$/ },
	{ pattern: /^ring-offset-(0|1|2|4|8)$/ },
	{
		pattern:
			/^ring-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(300|400|500|600)$/,
	},
	{ pattern: /^ring-(primary|secondary|destructive|muted|accent)$/ },
	'focus:outline-none',

	// Spacing utilities
	{
		pattern:
			/^space-(x|y)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px|reverse)$/,
	},
	{
		pattern:
			/^-space-(x|y)-(0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|px)$/,
	},
	{ pattern: /^divide-(x|y)-(0|2|4|8)$/ },
	{
		pattern:
			/^divide-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(200|300|400|500)$/,
	},
	'divide-solid',
	'divide-dashed',
	'divide-dotted',
	'divide-double',
	'divide-none',

	// Backdrop utilities
	{ pattern: /^backdrop-blur(-none|-sm|-md|-lg|-xl|-2xl|-3xl)?$/ },
	{ pattern: /^backdrop-brightness-(0|50|75|90|95|100|105|110|125|150|200)$/ },
	{ pattern: /^backdrop-contrast-(0|50|75|100|125|150|200)$/ },
	{ pattern: /^backdrop-opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)$/ },

	// Responsive variants - using explicit classes to avoid overly broad patterns
	...['sm', 'md', 'lg', 'xl', '2xl'].flatMap((breakpoint) => [
		`${breakpoint}:flex`,
		`${breakpoint}:hidden`,
		`${breakpoint}:block`,
		`${breakpoint}:grid`,
		`${breakpoint}:text-xs`,
		`${breakpoint}:text-sm`,
		`${breakpoint}:text-base`,
		`${breakpoint}:text-lg`,
		`${breakpoint}:text-xl`,
		`${breakpoint}:text-2xl`,
		`${breakpoint}:w-full`,
		`${breakpoint}:w-1/2`,
		`${breakpoint}:w-1/3`,
		`${breakpoint}:w-2/3`,
		`${breakpoint}:w-1/4`,
		`${breakpoint}:w-3/4`,
		`${breakpoint}:h-full`,
		`${breakpoint}:h-auto`,
		...Array.from({ length: 13 }, (_, i) => `${breakpoint}:col-span-${i === 0 ? 'full' : i}`),
		...Array.from({ length: 9 }, (_, i) => [`${breakpoint}:p-${i}`, `${breakpoint}:m-${i}`]).flat(),
	]),

	// Common hover/focus/active states - explicit to avoid performance issues
	'hover:opacity-75',
	'hover:opacity-50',
	'hover:scale-105',
	'hover:scale-110',
	'focus:ring-1',
	'focus:ring-2',
	'focus:ring-4',
	'focus:ring-offset-1',
	'focus:ring-offset-2',
	'active:scale-95',
	'active:scale-90',
	'disabled:opacity-50',
	'disabled:cursor-not-allowed',

	// Animation classes
	'animate-bounce',
	'animate-pulse',
	'animate-spin',
	'animate-ping',
	'animate-fade-in',

	// Gradient backgrounds
	'bg-gradient-to-t',
	'bg-gradient-to-tr',
	'bg-gradient-to-r',
	'bg-gradient-to-br',
	'bg-gradient-to-b',
	'bg-gradient-to-bl',
	'bg-gradient-to-l',
	'bg-gradient-to-tl',

	// Gradient from/to colors - all color combinations
	{
		pattern:
			/^from-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
	},
	{
		pattern:
			/^to-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
	},

	// Z-index utilities
	'z-0',
	'z-10',
	'z-20',
	'z-30',
	'z-40',
	'z-50',
	'-z-10',
	'-z-20',
	'-z-30',
	'-z-40',
	'-z-50',

	// Positioning utilities
	'inset-0',
	'inset-x-0',
	'inset-y-0',
	'top-0',
	'right-0',
	'bottom-0',
	'left-0',
	{
		pattern:
			/^(top|right|bottom|left)-(0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)$/,
	},

	// Color with opacity (alpha)
	{
		pattern:
			/^bg-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\/([0-9]|[1-9][0-9]|100)$/,
	},
	{
		pattern:
			/^text-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\/([0-9]|[1-9][0-9]|100)$/,
	},

	// Transform utilities
	'scale-0',
	'scale-50',
	'scale-75',
	'scale-90',
	'scale-95',
	'scale-100',
	'scale-105',
	'scale-110',
	'scale-125',
	'scale-150',
	'hover:scale-105',
	'hover:scale-110',
	'hover:scale-125',

	// Additional responsive text sizes for presentations
	...['sm', 'md', 'lg', 'xl', '2xl'].flatMap((breakpoint) => [
		`${breakpoint}:text-3xl`,
		`${breakpoint}:text-4xl`,
		`${breakpoint}:text-5xl`,
		`${breakpoint}:text-6xl`,
	]),
];
