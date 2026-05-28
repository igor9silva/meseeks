// source: https://x.com/samselikoff/status/1845640546208870750
import { useEffect } from 'react';

import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import { useState } from 'react';

const DELIMITER = '';
const CHARS_PER_SECOND = 2000;

export function useAnimatedText(text: string) {
	//
	const shouldReduceMotion = useReducedMotion();
	const animatedCursor = useMotionValue(0);
	const [cursor, setCursor] = useState(0);
	const [prevText, setPrevText] = useState(text);
	const [isSameText, setIsSameText] = useState(true);

	if (prevText !== text) {
		setPrevText(text);
		setIsSameText(text.startsWith(prevText));

		if (!text.startsWith(prevText)) {
			setCursor(0);
		}
	}

	useEffect(() => {
		if (shouldReduceMotion) return;

		if (!isSameText) {
			animatedCursor.jump(0);
		}

		const controls = animate(animatedCursor, text.split(DELIMITER).length, {
			duration: text.length / CHARS_PER_SECOND,
			ease: 'easeIn',
			onUpdate(latest) {
				setCursor(Math.floor(latest));
			},
		});

		return () => controls.stop();
	}, [animatedCursor, isSameText, shouldReduceMotion, text]);

	if (shouldReduceMotion) return text;

	return text.split(DELIMITER).slice(0, cursor).join(DELIMITER);
}
