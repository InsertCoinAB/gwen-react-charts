import { ResponsiveSankey } from "@nivo/sankey"
import React, { useEffect, useRef, useState } from "react"
import { BehaviorFlowChartColors } from "."
const NODES_PER_STEP = 6 // Determines amount of nodes per step
const NODE_LIMIT = NODES_PER_STEP - 2
type Node = {
	behaviorFlowId: string
	behaviorId: string
	title?: string
	amount?: number | null | undefined
	step: number
	prevBehaviorId?: string | null | undefined
	date?: Date
}

type Props = {
	data: Node[]
	prevData?: Node[]
	colors: BehaviorFlowChartColors
}

function toolTipStyle() {
	return { padding: "10px", background: "#fff", boxShadow: "0 0 5px rgba(0, 0, 0, 0.3)" }
}
const wrapperStyle = {
	display: "flex",
	height: "100%",
	width: "calc(80% + 150px)",
}

export const Sankey: React.FC<Props> = (props: Props) => {
	const { colors } = props
	const ref = useRef<HTMLDivElement>(null)
	const [width, setWidth] = useState<number>(ref.current?.clientWidth ?? 0)
	const observer = new ResizeObserver(() => setWidth(ref.current?.clientWidth ?? 0))
	const titleRecord: Record<string, string> = props.data.reduce((prev, curr) => ({ ...prev, [`${curr.behaviorId}:${curr.step}`]: curr.title }), {})
	const stepsTotal: Record<number, number> = props.data.reduce((prev, curr) => ({ ...prev, [curr.step]: 0 }), {})
	const prevStepsTotal: Record<number, number> =
		props.prevData?.reduce((prev, curr) => ({ ...prev, [curr.step]: 0 }), {}) ?? props.data.reduce((prev, curr) => ({ ...prev, [curr.step]: 0 }), {})
	const maxSteps = Object.keys(stepsTotal).length
	const endBehaviorId = props.data.find((i) => i.step === maxSteps)?.behaviorId ?? ""
	const mergedData = mergeNodes(props.data, endBehaviorId)
	const prevData = props.prevData ? mergeNodes(props.prevData, endBehaviorId) : mergedData
	// Corrects first step total
	mergedData.filter((n) => n.step === 1).forEach((n) => (stepsTotal[1] += n.amount ?? 0))
	const marginBase = width / maxSteps / maxSteps
	const marginRecord: Record<number, number> = {
		5: width < 1150 ? 120 : marginBase * 2.3,
		4: width < 1150 ? (width < 800 ? 150 : 175) : marginBase * 2.3,
		3: width < 1150 ? (width < 800 ? 200 : 270) : marginBase * 2.1,
	}

	useEffect(() => {
		if (ref.current) observer.observe(ref.current)
	}, [props.data])
	// Converts data to Sankey chart nodes & links
	const data = toSankeyData(mergedData, endBehaviorId, colors, stepsTotal)

	// Creates "Drop Off"-nodes
	for (let i = 2; i <= Object.keys(stepsTotal).length; i++) {
		data.nodes.push({ id: `Drop Off:${i}`, nodeColor: colors.disabled })
	}

	if (props.data.length < 2) {
		return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>no data</div>
	}
	// Corrects target-less-nodes linkss
	const sources = [...new Set(data.links.map((l) => l.source))]
	data.nodes.forEach((n) => {
		if (getCleanId(n.id) === endBehaviorId) return
		if (!sources.includes(n.id) && !n.id.includes("Drop Off") && getCleanStep(n.id) !== maxSteps) {
			const value = data.links.filter((l) => l.target === n.id).reduce((t, v) => t + v.value, 0)
			data.links.push({
				source: n.id,
				target: `Drop Off:${getCleanStep(n.id) + 1}`,
				value,
				startColor: colors.disabled,
				endColor: colors.disabled,
			})

			stepsTotal[getCleanStep(n.id) + 1] += value
		}
	})

	// Calculates & and creates "Drop-Off"-links
	data.links.forEach((link) => {
		if (getCleanId(link.source) === endBehaviorId) return
		const step = getCleanStep(link.target)
		const target = `Drop Off:${step}`
		const l = data.links.find((l) => l.target === target && l.source === link.source)
		if (l) return
		const valueFrom =
			getCleanStep(target) === 2
				? stepsTotal[getCleanStep(link.source)]
				: data.links.filter((l) => l.target === link.source && getCleanStep(l.source) === getCleanStep(link.source) - 1).reduce((t, v) => t + v.value, 0)
		const valueTo = data.links.filter((l) => l.source === link.source && getCleanStep(l.source) === getCleanStep(link.source)).reduce((t, v) => t + v.value, 0)
		const value = valueFrom - valueTo

		stepsTotal[step] = (stepsTotal[step] ?? 0) + value
		data.links.push({
			source: link.source,
			target,
			value,
			startColor: value > 0 ? colors.disabled : "#00000000",
			endColor: value > 0 ? colors.disabled : "#00000000",
		})
	})
	const prevValuesRecord: Record<string, number> = toPrevRecordData(prevData, prevStepsTotal, endBehaviorId, maxSteps, colors)
	return (
		<div style={wrapperStyle} ref={ref}>
			<ResponsiveSankey
				data={data}
				margin={{ top: 30, right: marginRecord[maxSteps], bottom: 90, left: 50 }}
				align="center"
				sort="input"
				colors={(n) => n.nodeColor ?? "#2cc392"}
				nodeOpacity={1}
				animate={true}
				motionConfig={"stiff"}
				theme={{ fontSize: 12, labels: { text: { fontWeight: 600 } } }}
				nodeHoverOthersOpacity={0.4}
				nodeThickness={40}
				nodeSpacing={40}
				nodeBorderWidth={0}
				nodeBorderRadius={5}
				enableLinkGradient
				linkContract={1}
				linkBlendMode="normal"
				labelOrientation="horizontal"
				labelPosition="inside"
				labelPadding={0}
				linkTooltip={(value) => (
					<div style={toolTipStyle()}>
						<b>{getValuePrefix(Math.round(value.link.value))}</b>
						{" - "}
						<b>{getPercentage(value.link.value, value.link.source.value)}</b>
					</div>
				)}
				label={(node) => {
					const top = node.y1 / 2 - node.y0 / 2
					const width = ref.current?.clientWidth ?? 0
					const x = node.x0 < width / 2 ? -40 : 0
					const step = getCleanStep(node.id)
					return (
						<>
							<tspan fill={colors.labelName} x={x} y={`-${top + 25}`} textAnchor="start">
								{titleRecord[node.id] ?? getCleanId(node.id)}
							</tspan>
							<tspan fill={colors.labelData} x={x} y={`-${top + 10}`} textAnchor="start">
								{step === 1
									? `${getValuePrefix(Math.round(stepsTotal[1]))}, 100%, `
									: `${getValuePrefix(Math.round(node.value))}, ${getPercentage(node.value, stepsTotal[getCleanStep(node.id)])}, `}

								{getCleanId(node.id) !== "Other" &&
									getValueChangeElement(
										node.value,
										prevValuesRecord[node.id] ?? 0,
										stepsTotal[getCleanStep(node.id)] ?? 0,
										step === 1 ? stepsTotal[getCleanStep(node.id)] : prevStepsTotal[getCleanStep(node.id)] ?? 0,
										colors,
									)}
							</tspan>
						</>
					) as unknown as string
				}}
				nodeTooltip={({ node }) => (
					<div style={toolTipStyle()}>
						<b>{`${titleRecord[node.id] ?? getCleanId(node.id)} - ${getStepName(node.id, maxSteps)}`}</b>
						<br />
						{getCleanStep(node.id) === 1 ? (
							<>
								<span>{`100%, `}</span>
								<span>{getValuePrefix(Math.round(stepsTotal[1]))}</span>
							</>
						) : (
							<>
								<span>{`${getPercentage(node.value, stepsTotal[getCleanStep(node.id)])} - `}</span>
								<span>{getValuePrefix(Math.round(node.value))}</span>
							</>
						)}
					</div>
				)}
			/>
		</div>
	)
}

const getPercentage = (value: number, users: number): string => {
	const val = Math.round((value / users) * 100 * 10) / 10
	return `${val}%`
}

const getCleanStep = (label: string): number => {
	return parseInt(label.split(":")[1])
}

const getCleanId = (label: string): string => {
	return label.split(":")[0]
}

const getStepName = (label: string, maxSteps: number): string => {
	const cleanStep = getCleanStep(label)
	return cleanStep === 1 ? "Start" : cleanStep === maxSteps ? "End" : `Step ${cleanStep - 1}`
}

const getValueChangeElement = (value: number, prevValue: number, users: number, prevUsers: number, colors: BehaviorFlowChartColors) => {
	if (prevValue > 0) {
		const current = (value / users) * 100
		const prev = (prevValue / prevUsers) * 100
		const change = Math.round(((current ?? 0) - (prev ?? 0)) * 10) / 10
		return (
			<tspan fill={change < 0 ? colors.labelDiffNeg : colors.labelDiffPos} textAnchor="start">
				{change < 1 ? "" : "+"}
				{change !== 0 && `${change}%`}
			</tspan>
		)
	}

	return (
		<tspan fill={colors.labelDiffPos} textAnchor="start">
			{"+100%"}
		</tspan>
	)
}

const getValuePrefix = (value: number) => {
	if (value > 200000 && value < 1000000) {
		value = value / 1000
		return `${value % 1 !== 0 ? value.toFixed(1) : value}K`
	} else if (value >= 1000000) {
		value = value / 1000000
		return `${value % 1 !== 0 ? value.toFixed(1) : value}M`
	} else {
		return value
	}
}

const mergeNodes = (data: Node[], endBehaviorId: string) => {
	const sorted: Node[] = data.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
	const topBehaviors: Record<number, string[]> = {}
	const lastStep = Object.keys(data.reduce((t, v) => ({ ...t, [v.step]: "" }), {})).length
	const stepNodesTotal: Record<number, number> = {}

	for (let i = 2; i <= lastStep; i++) {
		const nodeRecuction = i === 2 || i === lastStep - 1 ? 1 : 0
		const allStepNodes = sorted.filter((n) => n.step === i)
		stepNodesTotal[i] = allStepNodes.length
		topBehaviors[i] = allStepNodes.splice(0, NODE_LIMIT + nodeRecuction).map((n) => n.behaviorId)

		!topBehaviors[i].includes(endBehaviorId) && topBehaviors[i].push(endBehaviorId)
	}

	const nodes: Record<string, Node> = {}
	sorted.forEach((n) => {
		let behaviorId = n.behaviorId
		let prevBehaviorId = n.prevBehaviorId

		if (n.step !== 1) {
			if (n.step !== lastStep && !topBehaviors[n.step].includes(n.behaviorId) && stepNodesTotal[n.step] > NODES_PER_STEP) {
				behaviorId = "Other"
			}
			if (n.step !== 2 && !topBehaviors[n.step - 1].includes(n.prevBehaviorId ?? "") && stepNodesTotal[n.step - 1] > NODES_PER_STEP) {
				prevBehaviorId = "Other"
			}
		}
		const key = `${behaviorId}_${prevBehaviorId}_${n.step}`
		nodes[key]
			? (nodes[key].amount = (nodes[key].amount ?? 0) + (n.amount ?? 0))
			: (nodes[key] = {
					...n,
					behaviorId,
					prevBehaviorId,
			  })
	})
	const result = Object.values(nodes)
	result.forEach((n, index) => {
		if (n.behaviorId === endBehaviorId) {
			result.splice(index, 1)
			result.unshift(n)
		}
	})
	return result
}

const toSankeyData = (data: Node[], endBehaviorId: string, colors: BehaviorFlowChartColors, stepsTotal?: Record<number, number>) => {
	// Calculates step totals
	data
		.filter((link) => link.step !== 1)
		.forEach((link) => {
			if (stepsTotal) {
				stepsTotal[link.step] = (stepsTotal[link.step] ?? 0) + (link.amount ?? 0)
			}
		})

	// Removes links with same source and targets
	const temp = data.map((i) => `${i.behaviorId}:${i.step}`)
	data.forEach((i) => {
		if (i.prevBehaviorId) temp.push(`${i.prevBehaviorId}:${i.step - 1}`)
	})
	const uniqueNodeIds = [...new Set(temp)]

	return {
		nodes: uniqueNodeIds.map((i) => ({
			id: i,
			nodeColor: colors.primary,
		})),
		links: data
			.filter((link) => link.step !== 1)
			.map((link) => {
				const value = link.amount ?? 0
				return {
					source: `${link.prevBehaviorId}:${link.step - 1}`,
					target: `${link.behaviorId}:${link.step}`,
					value,
					startColor: (link.amount ?? 0) === 0 ? "#00000000" : "",
					endColor: (link.amount ?? 0) === 0 ? "#00000000" : "",
				}
			})
			.filter((i) => getCleanId(i.source) !== endBehaviorId && i.value > 0),
	}
}

// Creates links and calculates stepsTotals for previous data
const toPrevRecordData = (data: Node[], stepsTotal: Record<number, number>, endBehaviorId: string, maxSteps: number, colors: BehaviorFlowChartColors) => {
	const record: Record<string, number> = {}
	// Calculates step totals
	data
		.filter((link) => link.step !== 1)
		.forEach((link) => {
			if (stepsTotal) {
				stepsTotal[link.step] = (stepsTotal[link.step] ?? 0) + (link.amount ?? 0)
			}
		})
	const links = data
		.filter((link) => link.step !== 1 && link.prevBehaviorId !== endBehaviorId)
		.map((link) => {
			const value = link.amount ?? 0
			record[`${link.behaviorId}:${link.step}`] = (record[`${link.behaviorId}:${link.step}`] ?? 0) + value
			return {
				source: `${link.prevBehaviorId}:${link.step - 1}`,
				target: `${link.behaviorId}:${link.step}`,
				value: value,
				startColor: (link.amount ?? 0) === 0 ? "#00000000" : "",
				endColor: (link.amount ?? 0) === 0 ? "#00000000" : "",
			}
		})
		.filter((i) => getCleanId(i.source) !== endBehaviorId)

	// Corrects previous data first step stepTotal
	data
		.filter((n) => n.step === 1)
		.forEach((n) => {
			stepsTotal[1] += n.amount ?? 0
			record[`${n.behaviorId}:${n.step}`] = n.amount ?? 0
		})

	// Calculates & and creates "Drop-Off"-links for previous data
	links.forEach((link) => {
		if (getCleanId(link.source) === endBehaviorId) return
		const step = getCleanStep(link.target)
		const target = `Drop Off:${step}`
		const l = links.find((l) => l.target === target && l.source === link.source)

		if (l) return
		const valueFrom =
			getCleanStep(target) === 2
				? stepsTotal[getCleanStep(link.source)]
				: links.filter((l) => l.target === link.source && getCleanStep(l.source) === getCleanStep(link.source) - 1).reduce((t, v) => t + v.value, 0)

		const valueTo = links.filter((l) => l.source === link.source && getCleanStep(l.source) === getCleanStep(link.source)).reduce((t, v) => t + v.value, 0)
		const value = valueFrom - valueTo
		record[target] = (record[target] ?? 0) + value
		stepsTotal[step] = (stepsTotal[step] ?? 0) + value
		value > 0 &&
			links.push({
				source: link.source,
				target,
				value,
				startColor: value > 0 ? colors.disabled : "#00000000",
				endColor: value > 0 ? colors.disabled : "#00000000",
			})
	})
	return record
}
