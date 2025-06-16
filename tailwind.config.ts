import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
	darkMode: 'selector',
	content: ['src/**/*.{ts,tsx}'],
	theme: {
		container: {
			center: true,
			padding: '2rem',
		},
		extend: {
			fontFamily: {
				sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
				mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				sidebar: {
					'DEFAULT': 'hsl(var(--sidebar-background))',
					'foreground': 'hsl(var(--sidebar-foreground))',
					'primary': 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					'accent': 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					'border': 'hsl(var(--sidebar-border))',
					'ring': 'hsl(var(--sidebar-ring))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'pulse-blur': {
					'0%, 100%': {
						transform: 'scale(1)',
						filter: 'blur(3px)',
					},
					'50%': {
						transform: 'scale(1.1)',
						filter: 'blur(1.5px)',
					},
				},
				'shimmer': {
					'0%': { backgroundPosition: '200% 50%' },
					'100%': { backgroundPosition: '-200% 50%' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-blur': 'pulse-blur 1s ease-in-out infinite',
			},
			transitionTimingFunction: {
				'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
			},
			cursor: {
				magic: 'url("data:image/svg+xml;base64,PHN2ZwoJd2lkdGg9IjMyIgoJaGVpZ2h0PSIzMiIKCXZpZXdCb3g9IjAgMCAzMiAzMiIKCXhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKPgoJPGRlZnM+CgkJPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTUwJSIgeT0iLTUwJSIgd2lkdGg9IjIwMCUiIGhlaWdodD0iMjAwJSI+CgkJCTxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEuNSIgcmVzdWx0PSJjb2xvcmVkQmx1ciIgLz4KCQkJPGZlRmxvb2QgZmxvb2QtY29sb3I9IiM3YzNhZWQiIGZsb29kLW9wYWNpdHk9IjAuNSIgcmVzdWx0PSJnbG93Q29sb3IiIC8+CgkJCTxmZUNvbXBvc2l0ZSBpbj0iZ2xvd0NvbG9yIiBpbjI9ImNvbG9yZWRCbHVyIiBvcGVyYXRvcj0iaW4iIHJlc3VsdD0ic29mdEdsb3ciIC8+CgkJCTxmZU1lcmdlPgoJCQkJPGZlTWVyZ2VOb2RlIGluPSJzb2Z0R2xvdyIgLz4KCQkJCTxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4KCQkJPC9mZU1lcmdlPgoJCTwvZmlsdGVyPgoJPC9kZWZzPgoJPHBhdGgKCQl0cmFuc2Zvcm09InJvdGF0ZSgxNTAgIDE2IDE2KSIKCQlkPSJNMTYgOC43YzAuNCAwIDAuOC0wLjEgMS4xLTAuMmw0LjYtMi4xTDE2IDE3LjIgMTAuMyA2LjRsNC42IDIuMWMwLjQgMC4xIDAuOCAwLjIgMS4xIDAuMnpNMjEuMyA1LjhjLTAuNCAwLTAuNyAwLjEtMS4xIDAuMkwxNiA4LjJsLTQuMi0xLjljLTEtMC41LTIuMi0wLjItMyAwLjZjLTAuOCAwLjgtMSAyLTAuNiAzbDUuMyAxMS44YzAuNCAxIDEuNCAxLjYgMi41IDEuNmMxLjEgMCAyLTAuNiAyLjUtMS42bDUuMi0xMS44YzAuMi0wLjQgMC4zLTAuOCAwLjMtMS4yYzAtMS41LTEuMi0yLjctMi42LTIuN2MwIDAtMC4xIDAtMC4xIDAiCgkJZmlsbD0iI2Y1ZjNmZiIKCQlzdHJva2U9IiM3YzNhZWQiCgkJc3Ryb2tlLXdpZHRoPSIxIgoJCWZpbHRlcj0idXJsKCNnbG93KSIKCS8+Cjwvc3ZnPg==") 16 16, pointer',
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
		require('tailwindcss-animate'),
		require('tailwindcss-displaymodes'),
		require('tailwind-scrollbar'),
	],
} satisfies Config;
