export interface WorkflowBinding {
  nodeId: string;
  input: string;
  value: unknown;
}

type WorkflowNode = {inputs?: Record<string, unknown>; [key: string]: unknown};

export function applyWorkflowBindings(
  workflow: Record<string, unknown>,
  bindings: WorkflowBinding[],
): Record<string, unknown> {
  const cloned = structuredClone(workflow) as Record<string, WorkflowNode>;

  for (const binding of bindings) {
    const node = cloned[binding.nodeId];
    if (!node) {
      throw new Error(`Workflow node ${binding.nodeId} does not exist.`);
    }
    if (!node.inputs || typeof node.inputs !== "object") {
      throw new Error(`Workflow node ${binding.nodeId} has no inputs object.`);
    }
    node.inputs[binding.input] = binding.value;
  }

  return cloned;
}

export function parseBinding(value: string): WorkflowBinding {
  const equals = value.indexOf("=");
  const dot = value.indexOf(".");
  if (equals <= 0 || dot <= 0 || dot > equals) {
    throw new Error(
      `Invalid binding "${value}". Expected NODE_ID.INPUT=VALUE.`,
    );
  }

  const nodeId = value.slice(0, dot);
  const input = value.slice(dot + 1, equals);
  const raw = value.slice(equals + 1);

  let parsed: unknown = raw;
  if (/^-?\d+(\.\d+)?$/.test(raw)) parsed = Number(raw);
  else if (raw === "true" || raw === "false") parsed = raw === "true";
  else {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  return {nodeId, input, value: parsed};
}
