// Constitution sections - driven by markdown files
// To add/edit content, modify the .md files in this directory

import manifesto from './01-manifesto.md?raw';
import corePrinciples from './02-core-principles.md?raw';
import architectureLayering from './03-architecture-layering.md?raw';
import specDriven from './04-spec-driven.md?raw';
import nodeDesign from './05-node-design.md?raw';
import orchestrator from './06-orchestrator.md?raw';
import errorCode from './07-error-code.md?raw';
import observability from './08-observability.md?raw';
import testing from './09-testing.md?raw';
import releaseFailFast from './10-release-fail-fast.md?raw';
import aiEmployee from './11-ai-employee.md?raw';
import codingGuardrails from './12-coding-guardrails.md?raw';
import promptMemory from './13-prompt-memory.md?raw';

export interface ConstitutionSection {
  id: string;
  file: string;
  icon: string;
  title: string;
  content: string;
}

function parseTitle(content: string): { icon: string; title: string } {
  const firstLine = content.split('\n')[0] || '';
  const match = firstLine.match(/^#\s+(.*)/);
  if (match) {
    const text = match[1].trim();
    const emojiMatch = text.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u);
    const icon = emojiMatch ? emojiMatch[1] : '📄';
    const title = text.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '').trim();
    return { icon, title };
  }
  return { icon: '📄', title: 'Untitled' };
}

function section(raw: string, file: string): ConstitutionSection {
  const { icon, title } = parseTitle(raw);
  const id = file.replace(/\.md$/, '');
  return { id, file, icon, title, content: raw };
}

export const CONSTITUTION_SECTIONS: ConstitutionSection[] = [
  section(manifesto, '01-manifesto'),
  section(corePrinciples, '02-core-principles'),
  section(architectureLayering, '03-architecture-layering'),
  section(specDriven, '04-spec-driven'),
  section(nodeDesign, '05-node-design'),
  section(orchestrator, '06-orchestrator'),
  section(errorCode, '07-error-code'),
  section(observability, '08-observability'),
  section(testing, '09-testing'),
  section(releaseFailFast, '10-release-fail-fast'),
  section(aiEmployee, '11-ai-employee'),
  section(codingGuardrails, '12-coding-guardrails'),
  section(promptMemory, '13-prompt-memory'),
];
