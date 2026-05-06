export const seo = ({
	title,
	description,
	keywords,
	image,
}: {
	title: string;
	description?: string;
	image?: string;
	keywords?: string;
}) => {
	//
	const URL = 'https://meseeks.app';

	const tags = [
		{ title },
		{ name: 'description', content: description },
		{ name: 'keywords', content: keywords },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description },
		{ name: 'twitter:creator', content: '@igor9silva' },
		{ name: 'twitter:site', content: '@igor9silva' },
		{ name: 'og:type', content: 'website' },
		{ name: 'og:title', content: title },
		{ name: 'og:description', content: description },
		{ name: 'og:site_name', content: 'Meseeks' },
		{ name: 'og:url', content: URL },
		...(image
			? [
					{ name: 'twitter:image', content: URL + image },
					{ name: 'twitter:card', content: 'summary_large_image' },
					{ name: 'og:image', content: URL + image },
				]
			: []),
	];

	return tags;
};
