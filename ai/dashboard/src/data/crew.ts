// AI Crew - loaded at runtime from public/data/crew/
// To add/edit crew members, add a JSON file in public/data/crew/
// No rebuild needed - just refresh the browser!

import { Risk } from "../types";

export interface CrewSkill {
  id: string;
  title?: string;
  codename?: string;
  description: string;
  tags: string[];
  risk: Risk;
  imageUrl?: string;
  [key: string]: any;
}

const CREW_FILES = [
  '01-ai.spec.json',
  '02-ai.api.json',
  '03-ai.contract.json',
  '04-ai.unit.json',
  '05-ai.coverage.json',
  '06-ai.e2e.json',
  '07-ai.runbook.json',
  '08-ai.flow.json',
  '09-ai.rca.json',
  '10-ai.gatekeeper.json',
  '11-ai.little-fleming.json',
  '12-ai.factory-guide.json',
];

let _cache: CrewSkill[] | null = null;

export async function loadCrew(): Promise<CrewSkill[]> {
  if (_cache) return _cache;

  const base = '/data/crew/';
  const skills: CrewSkill[] = [];

  for (const file of CREW_FILES) {
    try {
      const res = await fetch(base + file);
      if (!res.ok) continue;
      const json: CrewSkill = await res.json();
      if (json && json.id) skills.push(json);
    } catch {
      // skip missing files
    }
  }

  _cache = skills;
  return skills;
}

export function clearCrewCache() {
  _cache = null;
}
