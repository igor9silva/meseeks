import {
	BookOpenText,
	CakeSlice,
	Cloud,
	Landmark,
	Leaf,
	MoonStar,
	Mountain,
	Newspaper,
	Palette,
	PenTool,
	PencilRuler,
	Receipt,
	SunMedium,
	Wine,
} from 'lucide-react';

export function ThemeIcon({ iconName }: { iconName: string | undefined }) {
	//
	if (iconName === 'moon-star') return <MoonStar className="mr-2" />;
	if (iconName === 'sun-medium') return <SunMedium className="mr-2" />;
	if (iconName === 'cake-slice') return <CakeSlice className="mr-2" />;
	if (iconName === 'book-open-text') return <BookOpenText className="mr-2" />;
	if (iconName === 'pen-tool') return <PenTool className="mr-2" />;
	if (iconName === 'leaf') return <Leaf className="mr-2" />;
	if (iconName === 'wine') return <Wine className="mr-2" />;
	if (iconName === 'mountain') return <Mountain className="mr-2" />;
	if (iconName === 'landmark') return <Landmark className="mr-2" />;
	if (iconName === 'newspaper') return <Newspaper className="mr-2" />;
	if (iconName === 'receipt') return <Receipt className="mr-2" />;
	if (iconName === 'pencil-ruler') return <PencilRuler className="mr-2" />;
	if (iconName === 'cloud') return <Cloud className="mr-2" />;
	return <Palette className="mr-2" />;
}
