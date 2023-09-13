import { createRef, useCallback, useLayoutEffect, useState } from "react"

type Dimensions = { width: number; height: number }

export function useDimensions<T extends HTMLElement = HTMLDivElement>(): { ref: React.RefObject<T> } & Dimensions {
	const ref = createRef<T>()
	const [height, setHeight] = useState(0)
	const [width, setWidth] = useState(0)

	const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
		window.requestAnimationFrame(() => {
			if (!Array.isArray(entries)) return
			const entry = entries[0]
			if (width !== entry.contentRect.width) setWidth(entry.contentRect.width)
			if (height !== entry.contentRect.height) setHeight(entry.contentRect.height)
		})
	}, [])

	useLayoutEffect(() => {
		if (!ref.current) return
		let RO: ResizeObserver | null = new ResizeObserver((entries: ResizeObserverEntry[]) => handleResize(entries))
		RO.observe(ref.current)
		return () => {
			RO?.disconnect()
			RO = null
		}
	}, [ref])

	return { ref, width, height }
}
