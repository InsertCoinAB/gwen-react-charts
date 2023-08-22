import React from "react";
import { BehaviorFlowChartColors } from ".";
import "./behavior-steps.css";

type Props = {
  steps: { step: number; title: string }[];
  colors: BehaviorFlowChartColors;
};

export const BehaviorSteps: React.FC<Props> = ({ steps, colors }: Props) => {
  return (
    <div style={rowStyle}>
      {steps.map((i, index) => (
        <div
          className={
            (index !== 0 ? "step-start " : "") +
            (index !== steps.length - 1 ? "step-end" : "")
          }
          style={
            {
              ...stepStyle,
              "--pseudo-color": colors.headerColor,
              color: colors.headerText,
            } as React.CSSProperties
          }
          data-pseudocolor={colors.headerColor}
          key={i.step}
        >
          <div
            style={{
              ...titleStyle,
              backgroundColor: colors.headerColor,
              color: colors.headerText,
            }}
          >
            {i.title}
          </div>
        </div>
      ))}
    </div>
  );
};

const rowStyle = {
  display: "flex",
  width: "100%",
  height: "32px",
  paddingLeft: "50px",
  paddingRight: "30px",
};

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
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
} as const;

const stepStyle = {
  display: "flex",
  justifyContent: "space-between",
  width: "100%",
};
