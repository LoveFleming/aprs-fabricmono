export type AppCategory = "Assets" | "Execution" | "Monitoring" | "Investigation" | "Standards" | "Settings";
export type Risk = "safe" | "guarded" | "external";

export type PortalApp = {
    id: string;
    title: string;
    category: AppCategory;
    description: string;
    tags: string[];
    risk: Risk;
};

export type SkillEngine = "deterministic" | "cline" | "opencode";

export type Skill = {
    id: string;
    title: string;
    codename: string;
    imageUrl: string;
    skills: string[];
    outputs: string[];
    engine: SkillEngine;
    risk: Risk;
    description: string;
};

export type RunStatus = "queued" | "running" | "success" | "failed";

export type Run = {
    id: string;
    title: string;
    createdAt: string;
    status: RunStatus;
    risk: Risk;
    engine: SkillEngine;
    logs: string[];
    aiJsonLines?: unknown[];
};

export type FlowSpec = {
    id: string;
    name: string;
    description: string;
    dsl: string;
    nodes: Array<{ id: string; kind: "node" | "gate"; title: string; notes?: string }>;
};

export type Runbook = {
    id: string;
    title: string;
    errorCodePrefix: string;
    updatedAt: string;
    summary: string;
};

export type NodeConfig = {
    id: string;
    nodeType: string;
    owner: string;
    version: string;
    schemaSnippet: string;
};

export type IncidentBundle = {
    id: string;
    createdAt: string;
    source: string;
    severity: "P1" | "P2" | "P3";
    summary: string;
};

export type DataContract = {
    id: string;
    service: string;
    consumer: string;
    schema: string;
    sla: string;
    status: "active" | "deprecated" | "draft";
};

// Orchestrator Types
export interface FlowStep {
    stepId: string;
    nodeId: string;
    purpose: string;
    input: string;
    output: string;
    onError: string;
}

export interface DecisionRule {
    ruleId: string;
    description: string;
    when: string;
    then: string;
    errorCode?: string;
}

export interface ErrorPolicy {
    kind: string;
    policy: string;
}

export interface ErrorCodeDef {
    code: string;
    category: "BIZ" | "EXT" | "SYS";
    description: string;
}

export interface MetricDef {
    name: string;
    description: string;
    type: string;
}

export interface EventDef {
    name: string;
    trigger: string;
}

export interface NodeContract {
    nodeId: string;
    description: string;
    inputSchema: any;
    outputSchema: any;
}

export interface TestTargets {
    happyPath: string[];
    rejectCases: string[];
    errorCases: string[];
    contractValidation: string[];
}

export interface Orchestrator {
    id: string;
    name: string;
    domain: string;
    apiPath: string;
    apiId: string;
    version: string;
    status: "active" | "draft" | "deprecated";
    owner: string;
    lastUpdated: string;
    tags: string[];

    summary: string;
    userStoryMarkdown: string;

    apiSpec: {
        endpoint: string;
        purpose: string;
        requestSchema: any;
        responseSchema: any;
        requestExample: any;
        responseExample: any;
    };

    orchestratorSpecMarkdown: string;
    flowSteps: FlowStep[];
    decisionRules: DecisionRule[];
    
    errorPolicy: ErrorPolicy[];
    errorCodes: ErrorCodeDef[];
    
    observability: {
        metrics: MetricDef[];
        logFields: string[];
        events: EventDef[];
    };
    
    nodeContracts: NodeContract[];
    runbookMarkdown: string;
    testTargets: TestTargets;
}
