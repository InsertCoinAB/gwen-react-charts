import React, { useEffect, useState } from "react";
import { BehaviorSteps } from "./behavior-steps";
import { Sankey } from "./sankey";

export interface BehaviorFlowChartColors {
  primary: string;
  background: string;
  dropOff: string;
  headerColor: string;
  headerText: string;
  labelName: string;
  labelData: string;
  labelDiffPos: string;
  labelDiffNeg: string;
}

export interface BehaviorFlowChartProps {
  behaviors: GetMetricBehaviorFlowQuery["behaviors"];
  behaviorFlow: GetMetricBehaviorFlowQuery["behaviorFlow"];
  prevBehaviorFlow: GetMetricBehaviorFlowQuery["prevBehaviorFlow"];
  header?: boolean;
  colors?: Partial<BehaviorFlowChartColors>;
  className?: string;
}

const BehaviorFlowChart: React.FC<BehaviorFlowChartProps> = ({
  behaviorFlow,
  prevBehaviorFlow,
  behaviors,
  header,
  colors,
  className,
}: BehaviorFlowChartProps) => {
  const [nodes, setNodes] = useState<BehaviorFlowNode[]>([]);
  const [prevNodes, setPrevNodes] = useState<BehaviorFlowNode[]>([]);

  useEffect(() => {
    const behaviorRecord = behaviors?.items.reduce(
      (prev, curr) => ({ ...prev, [curr.id]: curr.title }),
      {} as Record<string, string>
    );
    const nodesList = behaviorFlow.behaviorFlowNodes.map((i) => ({
      ...i,
      title: behaviorRecord ? behaviorRecord[i.behaviorId] ?? i.id : i.id,
    }));
    if (
      nodesList.length > 0 &&
      !nodesList.find((n) => n.step === behaviorFlow.steps)
    ) {
      const lastNode = nodesList.find((n) => n.step === behaviorFlow.steps - 1);
      nodesList.push({
        amount: 0,
        behaviorFlowId: behaviorFlow.id,
        step: behaviorFlow.steps,
        behaviorId: behaviorFlow.endBehaviorId,
        title: behaviorRecord
          ? behaviorRecord[behaviorFlow.endBehaviorId] ?? behaviorFlow.id
          : behaviorFlow.id,
        prevBehaviorId: lastNode?.behaviorId ?? "",
        id: behaviorFlow.id,
        productId: behaviorFlow.productId,
      });
    }

    setNodes(nodesList);
  }, [behaviorFlow, behaviors]);

  useEffect(() => {
    setPrevNodes(prevBehaviorFlow.behaviorFlowNodes);
  }, [prevBehaviorFlow]);

  const uniqueSteps = [...new Set(nodes?.map((i) => i.step))].sort(
    (a, b) => a - b
  );
  const steps = uniqueSteps.map((s, index) => ({
    step: s,
    title:
      index === 0
        ? "Start"
        : index === uniqueSteps.length - 1
        ? "End"
        : `Step ${s - 1}`,
  }));

  const c = { ...defaultColors, ...colors };

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
      {header && (
        <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
          {<BehaviorSteps steps={steps} colors={c} />}
        </div>
      )}
      <Sankey
        data={nodes.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))}
        prevData={prevNodes}
        colors={c}
      />
    </div>
  );
};

const defaultColors: BehaviorFlowChartColors = {
  primary: "#2cc392",
  background: "white",
  headerColor: "#2cc392",
  headerText: "black",
  dropOff: "grey",
  labelDiffNeg: "#f34d3a",
  labelDiffPos: "#21976f",
  labelName: "#202124",
  labelData: "grey",
};

export default BehaviorFlowChart;

export type BehaviorFlowNode = {
  __typename?: "BehaviorFlowNode";
  amount?: number | null;
  behaviorFlowId: string;
  behaviorId: string;
  id: string;
  prevBehaviorId?: string | null;
  productId: string;
  step: number;
};

export type GetMetricBehaviorFlowQuery = {
  __typename?: "Query";
  behaviorFlow: {
    __typename?: "BehaviorFlow";
    id: string;
    productId: string;
    startBehaviorId: string;
    endBehaviorId: string;
    steps: number;
    behaviorFlowNodes: Array<{
      __typename?: "BehaviorFlowNode";
      id: string;
      productId: string;
      behaviorFlowId: string;
      amount?: number | null;
      behaviorId: string;
      prevBehaviorId?: string | null;
      step: number;
    }>;
  };
  behaviors: {
    __typename?: "PaginatedBehaviorResponse";
    items: Array<{ __typename?: "Behavior"; id: string; title: string }>;
  };
  prevBehaviorFlow: {
    __typename?: "BehaviorFlow";
    id: string;
    productId: string;
    startBehaviorId: string;
    endBehaviorId: string;
    steps: number;
    behaviorFlowNodes: Array<{
      __typename?: "BehaviorFlowNode";
      id: string;
      productId: string;
      behaviorFlowId: string;
      amount?: number | null;
      behaviorId: string;
      prevBehaviorId?: string | null;
      step: number;
    }>;
  };
};
