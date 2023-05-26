import { useEffect, useState } from "react"
import { BehaviorSteps } from "./behavior-steps"
import { Sankey } from "./sankey"

export interface BehaviorFlowChartColors {
	primary: string
	dropOff: string
	headerColor: string
	headerText: string
	labelName: string
	labelData: string
	labelDiffPos: string
	labelDiffNeg: string
}

export interface BehaviorFlowChartProps {
	behaviors: GetMetricBehaviorFlowQuery["behaviors"]
	behaviorFlow: GetMetricBehaviorFlowQuery["behaviorFlow"]
	prevBehaviorFlow: GetMetricBehaviorFlowQuery["prevBehaviorFlow"]
	header?: boolean
	colors?: Partial<BehaviorFlowChartColors>
	className?: string
}

const BehaviorFlowChart = ({ behaviorFlow, prevBehaviorFlow, behaviors, header, colors, className }: BehaviorFlowChartProps) => {
	const [nodes, setNodes] = useState<BehaviorFlowNode[]>([])
	const [prevNodes, setPrevNodes] = useState<BehaviorFlowNode[]>([])
	const [endBehaviorId, setEndBehaviorId] = useState<string>()
	const [incompleteSteps, setIncompleteSteps] = useState<number[]>([])
	const [maxSteps, setMaxSteps] = useState<number>(0)

	useEffect(() => {
		const behaviorRecord = behaviors?.items.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.title }), {} as Record<string, string>)
		const nodesList = behaviorFlow.behaviorFlowNodes.map((i) => ({
			...i,
			title: behaviorRecord ? behaviorRecord[i.behaviorId] ?? i.id : i.id,
		}))
		if (nodesList.length > 0 && !nodesList.find((n) => n.step === behaviorFlow.steps)) {
			const lastNode = nodesList.find((n) => n.step === behaviorFlow.steps - 1)
			nodesList.push({
				amount: 0,
				behaviorFlowId: behaviorFlow.id,
				step: behaviorFlow.steps,
				behaviorId: behaviorFlow.endBehaviorId,
				title: behaviorRecord ? behaviorRecord[behaviorFlow.endBehaviorId] ?? behaviorFlow.id : behaviorFlow.id,
				prevBehaviorId: lastNode?.behaviorId ?? "",
				id: behaviorFlow.id,
				productId: behaviorFlow.productId,
			})
		}
		const _incompleteSteps: number[] = []
		for (let i = 1; i <= behaviorFlow.steps; i++) {
			const res = nodesList.find((n) => n.step === i && (n.amount ?? 0) > 0)
			if (!res) {
				_incompleteSteps.push(i)
			}
		}

		setMaxSteps(behaviorFlow.steps)
		setEndBehaviorId(behaviorFlow.endBehaviorId)
		setIncompleteSteps(_incompleteSteps.length === 1 && _incompleteSteps[0] === behaviorFlow.steps ? [] : _incompleteSteps)

		setNodes(nodesList)
	}, [behaviorFlow, behaviors])

	useEffect(() => {
		setPrevNodes(prevBehaviorFlow.behaviorFlowNodes)
	}, [prevBehaviorFlow])

	const steps: Array<{ step: number; title: string }> = []
	for (let i = 0; i < maxSteps - incompleteSteps.length; i++) {
		steps.push({ step: i + 1, title: i === 0 ? "Start" : i === maxSteps - 1 ? "End" : `Step ${i}` })
	}

	const c = { ...defaultColors, ...colors }

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				background: "transparent",
				paddingTop: "20px",
			}}
			className={className}
		>
			{header && <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>{<BehaviorSteps maxSteps={maxSteps} steps={steps} colors={c} />}</div>}
			<Sankey
				maxSteps={maxSteps - incompleteSteps.length}
				endBehaviorId={endBehaviorId ?? ""}
				data={nodes.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))}
				prevData={prevNodes}
				colors={c}
			/>
		</div>
	)
}

const defaultColors: BehaviorFlowChartColors = {
	primary: "#2cc392",
	headerColor: "#2cc392",
	headerText: "black",
	dropOff: "grey",
	labelDiffNeg: "#f34d3a",
	labelDiffPos: "#21976f",
	labelName: "#202124",
	labelData: "grey",
}

export default BehaviorFlowChart

export type BehaviorFlowNode = {
	__typename?: "BehaviorFlowNode"
	amount?: number | null
	behaviorFlowId: string
	behaviorId: string
	id: string
	prevBehaviorId?: string | null
	productId: string
	step: number
}

export type GetMetricBehaviorFlowQuery = {
	__typename?: "Query"
	behaviorFlow: {
		__typename?: "BehaviorFlow"
		id: string
		productId: string
		startBehaviorId: string
		endBehaviorId: string
		steps: number
		behaviorFlowNodes: Array<{
			__typename?: "BehaviorFlowNode"
			id: string
			productId: string
			behaviorFlowId: string
			amount?: number | null
			behaviorId: string
			prevBehaviorId?: string | null
			step: number
		}>
	}
	behaviors: {
		__typename?: "PaginatedBehaviorResponse"
		items: Array<{ __typename?: "Behavior"; id: string; title: string }>
	}
	prevBehaviorFlow: {
		__typename?: "BehaviorFlow"
		id: string
		productId: string
		startBehaviorId: string
		endBehaviorId: string
		steps: number
		behaviorFlowNodes: Array<{
			__typename?: "BehaviorFlowNode"
			id: string
			productId: string
			behaviorFlowId: string
			amount?: number | null
			behaviorId: string
			prevBehaviorId?: string | null
			step: number
		}>
	}
}
