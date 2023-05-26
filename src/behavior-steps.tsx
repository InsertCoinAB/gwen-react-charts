import React from "react"
import { BehaviorFlowChartColors } from "."

type Props = {
	steps: { step: number; title: string }[]
	colors: BehaviorFlowChartColors
}

export const BehaviorSteps: React.FC<Props> = ({ steps, colors }: Props) => {
	return (
		<div style={rowStyle}>
			{steps.map((i, index) => (
				<div style={{ ...stepStyle, backgroundColor: colors.headerColor, color: colors.headerText }} key={i.step}>
					<div
						style={{ ...stepEnds, borderRight: "0px", borderColor: colors.headerColor, borderLeftColor: index === 0 ? colors.headerColor : colors.background }}
					/>
					<div style={titleStyle}>{i.title}</div>
					<div style={{ ...stepEnds, borderColor: colors.background, borderLeftColor: index === steps.length - 1 ? colors.background : colors.primary }} />
				</div>
			))}
		</div>
	)
}

const rowStyle = {
	display: "flex",
	width: "100%",
	height: "32px",
	paddingLeft: "50px",
	paddingRight: "30px",
}

const stepEnds = {
	width: "0px",
	height: "0px",
	border: "16px solid",
}
const titleStyle = {
	display: "flex",
	width: "100%",
	color: "white",
	fontWeight: 600,
	boxShadow: "2px 4px 6px -1px rgb(0 0 0 / 10%)",
	justifyContent: "center",
	alignItems: "center",
	textAlign: "center",
	userSelect: "none",
	webkitTouchCallout: "none",
	webkitUserSelect: "none",
	mozUserSelect: "none",
	msUserSelect: "none",
} as const

const stepStyle = {
	display: "flex",
	justifyContent: "space-between",
	width: "100%",
}
