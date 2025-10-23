import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { SpecParser } from '../core/parser.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const prompt: Prompt = {
    name: 'generate-clarification',
    title: 'Generate Requirements Clarification Questions',
    description: 'Generate context-aware clarification questions using AI reasoning, not templates',
    arguments: [
        {
            name: 'specName',
            description: 'Name of the specification',
            required: true
        },
        {
            name: 'userRequirement',
            description: 'User\'s original requirement description',
            required: true
        }
    ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
    const { specName, userRequirement } = args;

    if (!specName || !userRequirement) {
        throw new Error('specName and userRequirement are required arguments');
    }

    const projectPath = context.projectPath;

    // Read project context
    let steeringContext = '';
    const steeringPath = PathUtils.getSteeringPath(projectPath);

    // Read product.md
    const productPath = join(steeringPath, 'product.md');
    if (existsSync(productPath)) {
        try {
            const productContent = await readFile(productPath, 'utf-8');
            steeringContext += `\n### product.md\n${productContent}\n`;
        } catch {
            // Ignore read errors
        }
    }

    // Read tech.md
    const techPath = join(steeringPath, 'tech.md');
    if (existsSync(techPath)) {
        try {
            const techContent = await readFile(techPath, 'utf-8');
            steeringContext += `\n### tech.md\n${techContent}\n`;
        } catch {
            // Ignore read errors
        }
    }

    // Read existing specs
    const parser = new SpecParser(projectPath);
    const existingSpecs = await parser.getAllSpecs();
    const existingSpecsList = existingSpecs.length > 0
        ? existingSpecs.map(s => `- ${s.name}`).join('\n')
        : 'No existing specs.';

    const promptMessage = `# Generate Requirements Clarification Questions

## Your Mission
You are an expert requirements analyst. Generate a **smart, minimal, easy-to-answer** clarification checklist that helps you deeply understand the user's requirement.

## User's Requirement
${userRequirement}

## Project Context

### Steering Documents
${steeringContext || 'No steering documents found.'}

### Existing Specifications
${existingSpecsList}

---

## Question Generation Methodology

### Core Principles
1. **Eliminate Ambiguity**: Ask only what is unclear or missing
2. **Easy to Answer**: 80%+ checkbox/radio, <5% open text
3. **Context-Aware**: Use project info to avoid redundant questions
4. **Minimal but Sufficient**: 15-25 questions total

### Analysis Framework

#### Step 1: What is CLEAR? (Don't ask)
- Explicitly stated features
- Obvious implications
- Standard practices
- Already defined in steering docs

#### Step 2: What is AMBIGUOUS? (Must ask)
- Vague terms needing definition
- Unclear scope boundaries
- Missing priorities
- Conflicting interpretations

#### Step 3: What is MISSING? (Must ask)
- User roles and permissions
- Non-functional requirements
- Integration points
- Data handling specifics

#### Step 4: What CONFLICTS? (Must clarify)
- Overlaps with existing specs
- Inconsistencies with tech stack
- Contradictions with product vision

### Question Format Priority
1. **Checkbox (80%+)**: - [ ] **Question** - 需要吗？
2. **Radio (10-15%)**: 选择一个: [ ] **Option1** [ ] **Option2**
3. **Number (5-10%)**: **Question**: _____ (提示)
4. **Short Text (<5%)**: **Question**: _____ (only when critical)

### Question Categories (Use these emoji icons)
- 🎯 **Core Scope** (必答): Feature boundaries, main functionality
- 👥 **Users & Roles** (必答): Who uses it, permissions
- 🔒 **Security & Compliance** (如适用): Security requirements
- 📱 **Platform & Performance** (重要): Where it runs, performance needs
- 🎨 **User Experience** (重要): UI/UX preferences
- 🔗 **Integration** (如适用): External system connections
- 💡 **Additional** (可选): Edge cases, future considerations

---

## Output Format

Generate the complete clarification document in this EXACT format:

\`\`\`markdown
# Requirements Clarification - ${specName}

## Original Requirement
${userRequirement}

## Quick Clarification (请用 ✓ 或 ✗ 标记，或简短回答)

### 🎯 Core Scope (必答)
- [ ] **[Question 1]** - 需要吗？
- [ ] **[Question 2]** - 需要吗？
[3-5 critical questions about feature boundaries]

### 👥 Users & Roles (必答)
- [ ] **[User type 1]** - 有这个角色吗？
- [ ] **[User type 2]** - 有这个角色吗？
[2-4 questions about user types and permissions]

### 🔒 Security & Compliance (如适用)
选择一个: [ ] **基础** [ ] **标准** [ ] **高级**
- [ ] **[Security feature]** - 需要吗？
[1-3 questions if security is relevant]

### 📱 Platform & Performance (重要)
- [ ] **Web浏览器** - 支持吗？
- [ ] **移动端响应式** - 需要吗？
- **预期用户数量**: _____ (填写数字，如: 100, 1000, 10000)
[2-4 questions about platform and performance]

### 🎨 User Experience (重要)
- [ ] **使用现有设计系统** - 与项目保持一致
- [ ] **简洁风格** - 最小化设计
[1-3 questions about UI/UX preferences]

### 🔗 Integration (如适用)
- [ ] **[External system]** - 需要集成吗？
[1-3 questions if integration is needed]

### 💡 Additional Considerations (可选)
- [ ] **[Edge case or future feature]** - 考虑吗？
[1-2 questions about edge cases]

---

## Status: ⏳ Waiting for answers (0/X answered)
**完成后请告诉AI: "澄清完成"**
\`\`\`

---

## Quality Checklist

Before finalizing, verify:
- [ ] Total questions: 15-25 (not too many)
- [ ] Checkbox/Radio: 80%+ (easy to answer)
- [ ] Every question has clear purpose (no filler)
- [ ] No obvious questions (e.g., "需要数据库吗？")
- [ ] No redundant questions (check steering docs)
- [ ] Questions grouped logically by category
- [ ] Critical questions marked as "必答"
- [ ] Simple, clear language (avoid jargon)

---

## Examples

### Good Questions ✅
- "需要用户注册功能吗？（还是只有管理员创建账号？）"
- "预期同时在线用户数？[ ] <100 [ ] 100-1000 [ ] >1000"
${existingSpecs.length > 0 ? `- "需要与现有的${existingSpecs[0].name}集成吗？"` : ''}

### Bad Questions ❌
- "请详细描述认证流程" (太开放，难回答)
- "需要使用数据库吗？" (显而易见)
- "你想要什么样的UI？" (太模糊)

---

Now, analyze the requirement and generate the clarification document.`;

    return [
        {
            role: 'user',
            content: {
                type: 'text',
                text: promptMessage
            }
        }
    ];
}

export const generateClarificationPrompt: PromptDefinition = {
    prompt,
    handler
};

