import React from "react";

const COLORS: Record<string, { bg: string; fg: string; accent: string }> = {
    "ai.spec": { bg: "#FEF3C7", fg: "#92400E", accent: "#F59E0B" },
    "ai.api": { bg: "#DBEAFE", fg: "#1E40AF", accent: "#3B82F6" },
    "ai.contract": { bg: "#D1FAE5", fg: "#065F46", accent: "#10B981" },
    "ai.unit": { bg: "#E0E7FF", fg: "#3730A3", accent: "#6366F1" },
    "ai.coverage": { bg: "#FCE7F3", fg: "#9D174D", accent: "#EC4899" },
    "ai.e2e": { bg: "#FEE2E2", fg: "#991B1B", accent: "#EF4444" },
    "ai.runbook": { bg: "#CCFBF1", fg: "#134E4A", accent: "#14B8A6" },
    "ai.flow": { bg: "#E9D5FF", fg: "#6B21A8", accent: "#A855F7" },
    "ai.rca": { bg: "#FED7AA", fg: "#9A3412", accent: "#F97316" },
    "ai.gatekeeper": { bg: "#F3F4F6", fg: "#1F2937", accent: "#6B7280" },
    "ai.node-dev": { bg: "#CFFAFE", fg: "#155E75", accent: "#06B6D4" },
};

const ICONS: Record<string, string> = {
    "ai.spec": "📝",
    "ai.api": "🔌",
    "ai.contract": "🛡️",
    "ai.unit": "🧪",
    "ai.coverage": "🔍",
    "ai.e2e": "▶️",
    "ai.runbook": "📖",
    "ai.flow": "🔄",
    "ai.rca": "🕵️",
    "ai.gatekeeper": "🔒",
    "ai.node-dev": "⚙️",
};

interface AvatarProps {
    crewId: string;
    codename: string;
    size?: number;
}

export default function CrewAvatar({ crewId, codename, size = 120 }: AvatarProps) {
    const color = COLORS[crewId] ?? { bg: "#F3F4F6", fg: "#1F2937", accent: "#6B7280" };
    const icon = ICONS[crewId] ?? "🤖";
    const initial = codename.charAt(0).toUpperCase();

    return (
        <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            {/* Background circle */}
            <circle cx="60" cy="60" r="58" fill={color.bg} stroke={color.accent} strokeWidth="2" />
            {/* Inner pattern - tech grid */}
            <circle cx="60" cy="60" r="45" fill="none" stroke={color.accent} strokeWidth="0.5" opacity="0.3" />
            <circle cx="60" cy="60" r="30" fill="none" stroke={color.accent} strokeWidth="0.5" opacity="0.2" />
            {/* Icon */}
            <text x="60" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="36">
                {icon}
            </text>
            {/* Codename initial */}
            <text x="60" y="90" textAnchor="middle" dominantBaseline="middle"
                fontSize="14" fontWeight="bold" fill={color.fg} fontFamily="monospace">
                {codename}
            </text>
            {/* Accent dot */}
            <circle cx="95" cy="25" r="8" fill={color.accent} />
            <text x="95" y="28" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white" fontWeight="bold">
                {initial}
            </text>
        </svg>
    );
}
