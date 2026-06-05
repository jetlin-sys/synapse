import type { SkillInfo } from '../../../types';

export type MeetingSkillCatalogItem = {
  skillId: string;
  name: string;
  description?: string;
  enabled: boolean;
  label?: string | null;
  name_i18n?: Record<string, string> | null;
};

export type MeetingAgentProfile = {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  skills: string[];
  skills_mode: string;
};

export type RequiredSkillRule = {
  /** 展示用短名（与产品文档一致） */
  displayName: string;
  skillIds: string[];
};

export type SkillValidationIssue = {
  displayName: string;
  missingFromProfile: boolean;
  missingFromCatalog: boolean;
};

export type SkillValidationResult = {
  ok: boolean;
  issues: SkillValidationIssue[];
};

/** 主控（小鲸）必备技能 */
export const HOST_REQUIRED_SKILLS: RequiredSkillRule[] = [
  { displayName: '方案评审', skillIds: ['whalecloud-dev-tool-solution-review'] },
  { displayName: '人机问卷', skillIds: ['whalecloud-dev-tool-ask-user'] },
  { displayName: '文档生成', skillIds: ['whalecloud-dev-tool-doc-generate'] },
  { displayName: '研发工具共享脚本', skillIds: ['whalecloud-dev-tool-base-scripts'] },
];

/** 协作智能体 profile id → 必备技能 */
export const WORKER_REQUIRED_SKILLS_BY_PROFILE: Record<string, RequiredSkillRule[]> = {
  'whalecloud-requirement-expert': [
    { displayName: '需求澄清技能', skillIds: ['whalecloud-dev-tool-requirement-clarify'] },
    { displayName: '研发工具共享脚本', skillIds: ['whalecloud-dev-tool-base-scripts'] },
  ],
  'whalecloud-rd-expert': [
    { displayName: '模块功能技能', skillIds: ['whalecloud-dev-tool-module-function'] },
    { displayName: '研发工具共享脚本', skillIds: ['whalecloud-dev-tool-base-scripts'] },
    { displayName: 'C++代码阅读', skillIds: ['whalecloud-dev-tool-c-code-access'] },
  ],
  'whalecloud-design-expert': [
    { displayName: '函数级方案技能', skillIds: ['whalecloud-dev-tool-function-solution'] },
    { displayName: '文档生成', skillIds: ['whalecloud-dev-tool-doc-generate'] },
    { displayName: '研发工具共享脚本', skillIds: ['whalecloud-dev-tool-base-scripts'] },
    { displayName: 'C++代码阅读', skillIds: ['whalecloud-dev-tool-c-code-access'] },
  ],
};

function normalizeSkillKey(id: string): string {
  return id.trim().toLowerCase().replace(/_/g, '-');
}

function profileSkillSet(profile: MeetingAgentProfile): Set<string> {
  const out = new Set<string>();
  for (const raw of profile.skills ?? []) {
    const n = normalizeSkillKey(raw);
    if (n) out.add(n);
    const short = n.includes('@') ? n.split('@').pop()! : n;
    if (short) out.add(short);
  }
  return out;
}

function catalogById(catalog: MeetingSkillCatalogItem[]): Map<string, MeetingSkillCatalogItem> {
  const map = new Map<string, MeetingSkillCatalogItem>();
  for (const s of catalog) {
    map.set(normalizeSkillKey(s.skillId), s);
  }
  return map;
}

function profileHasSkill(profile: MeetingAgentProfile, skillId: string): boolean {
  if ((profile.skills_mode || 'inclusive').toLowerCase() === 'all') return true;
  const want = normalizeSkillKey(skillId);
  const set = profileSkillSet(profile);
  if (set.has(want)) return true;
  const short = want.includes('@') ? want.split('@').pop()! : want;
  return set.has(short);
}

export function skillDisplayLabel(skill: MeetingSkillCatalogItem, lang = 'zh'): string {
  const asInfo = skill as SkillInfo;
  if (skill.label?.trim()) return skill.label.trim();
  const key = lang.startsWith('zh') ? 'zh' : 'en';
  return skill.name_i18n?.[key] || skill.name_i18n?.en || skill.name || skill.skillId;
}

export function resolveSkillInCatalog(
  skillId: string,
  catalogMap: Map<string, MeetingSkillCatalogItem>,
): MeetingSkillCatalogItem | undefined {
  const key = normalizeSkillKey(skillId);
  return catalogMap.get(key);
}

/** 将 profile 上的 skill id 解析为目录项（保持 profile 顺序） */
export function resolveProfileSkillCards(
  profile: MeetingAgentProfile,
  catalog: MeetingSkillCatalogItem[],
  lang = 'zh',
): { skillId: string; label: string; description: string; enabled: boolean; inProfile: boolean }[] {
  const map = catalogById(catalog);
  const modeAll = (profile.skills_mode || '').toLowerCase() === 'all';
  const ids = modeAll
    ? catalog.map((s) => s.skillId)
    : [...(profile.skills ?? [])];
  const seen = new Set<string>();
  const cards: {
    skillId: string;
    label: string;
    description: string;
    enabled: boolean;
    inProfile: boolean;
  }[] = [];

  for (const rawId of ids) {
    const key = normalizeSkillKey(rawId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const item = map.get(key);
    if (!item) continue;
    cards.push({
      skillId: item.skillId,
      label: skillDisplayLabel(item, lang),
      description: (item.description || '').trim() || '暂无技能描述',
      enabled: item.enabled,
      inProfile: modeAll || profileHasSkill(profile, item.skillId),
    });
  }
  return cards;
}

export function validateRequiredSkills(
  profile: MeetingAgentProfile,
  catalog: MeetingSkillCatalogItem[],
  rules: RequiredSkillRule[],
): SkillValidationResult {
  const map = catalogById(catalog);
  const issues: SkillValidationIssue[] = [];

  for (const rule of rules) {
    const anyInCatalog = rule.skillIds.some((id) => map.has(normalizeSkillKey(id)));
    const anyOnProfile = rule.skillIds.some((id) => profileHasSkill(profile, id));
    if (!anyOnProfile || !anyInCatalog) {
      issues.push({
        displayName: rule.displayName,
        missingFromProfile: !anyOnProfile,
        missingFromCatalog: !anyInCatalog,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function workerRulesForProfile(profileId: string): RequiredSkillRule[] | null {
  return WORKER_REQUIRED_SKILLS_BY_PROFILE[profileId] ?? null;
}
