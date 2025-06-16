import { Link } from '@tanstack/react-router';
import * as React from 'react';

import { Inbox } from 'lucide-react';
import { Suspense } from 'react';
import { UserMenuItem } from '~/components/UserMenuItem';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '~/components/ui/sidebar';

const menuItems = [
	{
		title: 'Inbox',
		url: '/',
		icon: Inbox,
	},
];

function MenuItem(item: (typeof menuItems)[number]) {
	//
	const { setOpenMobile } = useSidebar();

	return (
		<SidebarMenuItem>
			<Link tabIndex={-1} to={item.url}>
				{({ isActive }) => {
					return (
						<SidebarMenuButton
							tooltip={{
								children: item.title,
								hidden: false,
							}}
							onClick={() => setOpenMobile(false)}
							isActive={isActive}
							className="px-2.5 md:px-2"
						>
							<item.icon />
							<span>{item.title}</span>
						</SidebarMenuButton>
					);
				}}
			</Link>
		</SidebarMenuItem>
	);
}

export function MainSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	//
	// TODO:personalization: allow user to choose between floating and inset
	const variant = 'floating';
	const width = '3rem';
	// const variant = 'inset';
	// const width = '2.5rem';

	return (
		<Sidebar
			variant={variant}
			collapsible="icon"
			className="hidden md:block"
			style={{ '--sidebar-width-icon': width } as React.CSSProperties}
			{...props}
		>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent className="px-1.5 md:px-0">
						<SidebarMenu>
							{menuItems.map((item) => (
								<MenuItem key={item.title} {...item} />
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<Suspense fallback={null}>
					<UserMenuItem />
				</Suspense>
			</SidebarFooter>
		</Sidebar>
	);
}
