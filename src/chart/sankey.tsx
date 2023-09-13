import { ResponsiveSankey } from "@nivo/sankey"
import React, { useEffect, useRef, useState } from "react"
import { BehaviorFlowChartColors } from "."
import { useDimensions } from "./use-dimensions"
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
	endBehaviorId: string
	maxSteps: number
	colors: BehaviorFlowChartColors
}

function toolTipStyle() {
	return {
		padding: "10px",
		background: "#fff",
		boxShadow: "0 0 5px rgba(0, 0, 0, 0.3)",
	}
}
const wrapperStyle = {
	display: "flex",
	height: "calc(100% - 72px)",
	width: "100%",
}

export const Sankey: React.FC<Props> = (props: Props) => {
	const { colors } = props
	const { ref, width } = useDimensions()
	const titleRecord: Record<string, string> = props.data.reduce(
		(prev, curr) => ({
			...prev,
			[`${curr.behaviorId}:${curr.step}`]: curr.title,
		}),
		{},
	)
	const stepsTotal: Record<number, number> = props.data.reduce((prev, curr) => ({ ...prev, [curr.step]: 0 }), {})
	const prevStepsTotal: Record<number, number> =
		props.prevData?.reduce((prev, curr) => ({ ...prev, [curr.step]: 0 }), {}) ?? props.data.reduce((prev, curr) => ({ ...prev, [curr.step]: 0 }), {})
	const mergedData = mergeNodes(props.data, props.endBehaviorId)
	const prevData = props.prevData ? mergeNodes(props.prevData, props.endBehaviorId) : mergedData
	// Corrects first step total
	mergedData.filter((n) => n.step === 1).forEach((n) => (stepsTotal[1] += n.amount ?? 0))

	// Converts data to Sankey chart nodes & links
	const data = toSankeyData(mergedData, props.endBehaviorId, colors, stepsTotal)

	// Creates "Drop Off"-nodes
	for (let i = 2; i <= Object.keys(stepsTotal).length; i++) {
		data.nodes.push({ id: `Drop Off:${i}`, nodeColor: colors.dropOff })
	}

	// Early return if flow is not complete
	let stepCount = 0
	for (let i = 1; i < props.maxSteps; i++) {
		if (!props.data.find((n) => n.step === i)) return <NoData />
		stepCount = i
	}
	if (stepCount < 1) return <NoData />

	// Corrects target-less-nodes links
	const sources = [...new Set(data.links.map((l) => l.source))]
	data.nodes.forEach((n) => {
		if (getCleanId(n.id) === props.endBehaviorId) return
		if (!sources.includes(n.id) && !n.id.includes("Drop Off") && getCleanStep(n.id) !== props.maxSteps) {
			const value = data.links.filter((l) => l.target === n.id).reduce((t, v) => t + v.value, 0)
			data.links.push({
				source: n.id,
				target: `Drop Off:${getCleanStep(n.id) + 1}`,
				value,
				startColor: colors.dropOff,
				endColor: colors.dropOff,
			})

			stepsTotal[getCleanStep(n.id) + 1] += value
		}
	})

	// Calculates & and creates "Drop-Off"-links
	data.links.forEach((link) => {
		if (getCleanId(link.source) === props.endBehaviorId) return
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
			startColor: value > 0 ? colors.dropOff : "#00000000",
			endColor: value > 0 ? colors.dropOff : "#00000000",
		})
	})

	// Corrects order of last behaviorNodes without value by adding hidden/transparent links
	const lastNode = data.nodes.find((n) => getCleanStep(n.id) === props.maxSteps && !n.id.includes("Drop Off"))
	if (!data.links.find((l) => l.target === lastNode?.id && l.source.includes((props.maxSteps - 1).toString()))) {
		data.links.push({
			source: data.nodes.find((l) => getCleanStep(l.id) === props.maxSteps - 1)?.id ?? "",
			target: lastNode?.id ?? "",
			value: 0,
			startColor: "#00000000",
			endColor: "#00000000",
		})
	}
	for (let i = 1; i <= props.maxSteps; i++) {
		if (stepsTotal[i] === 0) {
			data.links.push({
				source: `Drop Off:${i - 1}`,
				target: `${props.endBehaviorId}:${i}`,
				value: 0,
				startColor: "#00000000",
				endColor: "#00000000",
			})

			data.links.push({
				source: `Drop Off:${i - 1}`,
				target: `Drop Off:${i}`,
				value: 0,
				startColor: "#00000000",
				endColor: "#00000000",
			})
		}
	}

	const prevValuesRecord: Record<string, number> = toPrevRecordData(prevData, prevStepsTotal, props.endBehaviorId, props.maxSteps, colors)
	const headerSize = 52
	const labelSpacerSize = (props.maxSteps - 1) * 20
	const labelSize = (width - labelSpacerSize) / props.maxSteps

	return (
		<div style={wrapperStyle} ref={ref}>
			<ResponsiveSankey
				data={data}
				margin={{
					top: 35,
					right: labelSize - 40,
					bottom: headerSize + 20,
					left: 0,
				}}
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
						<b>{`${titleRecord[node.id] ?? getCleanId(node.id)} - ${getStepName(node.id, props.maxSteps)}`}</b>
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
	if (value > 0) {
		const val = Math.round((value / users) * 100 * 10) / 10
		return `${val}%`
	}
	return "0%"
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

	if (value > 0) {
		return (
			<tspan fill={colors.labelDiffPos} textAnchor="start">
				{"+100%"}
			</tspan>
		)
	}
	return
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
				const value = link.prevBehaviorId === endBehaviorId ? 0 : link.amount ?? 0
				return {
					source: `${link.prevBehaviorId}:${link.step - 1}`,
					target: `${link.behaviorId}:${link.step}`,
					value,
					startColor: (link.amount ?? 0) === 0 ? "#00000000" : "",
					endColor: (link.amount ?? 0) === 0 ? "#00000000" : "",
				}
			})
			.filter((i) => getCleanId(i.source) !== endBehaviorId || (getCleanId(i.source) === endBehaviorId && getCleanId(i.target) === endBehaviorId)),
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
				startColor: value > 0 ? colors.dropOff : "#00000000",
				endColor: value > 0 ? colors.dropOff : "#00000000",
			})
	})
	return record
}

const NoData = () => {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				height: "100%",
			}}
		>
			No data
		</div>
	)
}
