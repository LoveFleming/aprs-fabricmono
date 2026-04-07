// Constitution sections - loaded at runtime from public/data/constitution/
// To add/edit content, modify the .md files in public/data/constitution/
// No rebuild needed - just refresh the browser!

export interface ConstitutionSection {
  id: string;
  file: string;
  icon: string;
  title: string;
  content: string;
}

const SECTION_FILES = [
  '01-manifesto.md',
  '02-core-principles.md',
  '03-architecture-layering.md',
  '04-spec-driven.md',
  '05-node-design.md',
  '06-orchestrator.md',
  '07-error-code.md',
  '08-observability.md',
  '09-testing.md',
  '10-release-fail-fast.md',
  '11-ai-employee.md',
  '12-coding-guardrails.md',
  '13-prompt-memory.md',
];

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

let _cache: ConstitutionSection[] | null = null;

export async function loadConstitution(): Promise<ConstitutionSection[]> {
  if (_cache) return _cache;

  const base = '/data/constitution/';
  const sections: ConstitutionSection[] = [];

  for (const file of SECTION_FILES) {
    try {
      const res = await fetch(base + file);
      if (!res.ok) continue;
      const raw = await res.text();
      const { icon, title } = parseTitle(raw);
      const id = file.replace(/\.md$/, '');
      sections.push({ id, file, icon, title, content: raw });
    } catch {
      // skip missing files
    }
  }

  _cache = sections;
  return sections;
}

export function clearConstitutionCache() {
  _cache = null;
}
