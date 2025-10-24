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
    title: '生成需求澄清问题',
    description: '基于需求理解规则生成澄清问题',
    arguments: [
        {
            name: 'specName',
            description: '规格名称',
            required: true
        },
        {
            name: 'userRequirement',
            description: '用户的原始需求描述',
            required: true
        }
    ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
    const { specName, userRequirement } = args;

    if (!specName || !userRequirement) {
        throw new Error('specName 和 userRequirement 是必需参数');
    }

    const projectPath = context.projectPath;

    // 1. 读取需求理解规则文件
    let ruleContent = '';
    const rulePath = join(projectPath, '.cursor', 'rules', '1-requirement-understanding.mdc');

    if (existsSync(rulePath)) {
        try {
            ruleContent = await readFile(rulePath, 'utf-8');
            // 移除 frontmatter
            ruleContent = ruleContent.replace(/^---[\s\S]*?---\n/, '');
        } catch (error) {
            console.error('读取规则文件失败:', error);
        }
    }

    // 如果没有规则文件，使用默认的前端理解维度
    if (!ruleContent) {
        ruleContent = `# 前端需求理解的5个维度

## 1. 功能范围 🎯
- 要实现哪些具体功能？
- 哪些功能明确不需要？

## 2. 视觉呈现 🎨
- 是否有设计稿？
- 用什么布局？（列表/表格/卡片/表单）

## 3. 数据处理 📊
- 数据从哪里来？（API/Mock）
- 需要显示哪些字段？

## 4. 交互操作 🖱️
- 用户主要操作是什么？
- 成功/失败后如何反馈？

## 5. 关键异常 🛡️
- 无数据时显示什么？
- 失败时如何提示？`;
    }

    // 2. 读取项目上下文
    let projectContext = '';
    const steeringPath = PathUtils.getSteeringPath(projectPath);

    // 读取 product.md
    const productPath = join(steeringPath, 'product.md');
    if (existsSync(productPath)) {
        try {
            const productContent = await readFile(productPath, 'utf-8');
            projectContext += `\n### 产品背景\n${productContent}\n`;
        } catch {
            // 忽略
        }
    }

    // 读取 tech.md
    const techPath = join(steeringPath, 'tech.md');
    if (existsSync(techPath)) {
        try {
            const techContent = await readFile(techPath, 'utf-8');
            projectContext += `\n### 技术栈\n${techContent}\n`;
        } catch {
            // 忽略
        }
    }

    // 读取现有 specs
    const parser = new SpecParser(projectPath);
    const existingSpecs = await parser.getAllSpecs();
    const existingSpecsList = existingSpecs.length > 0
        ? existingSpecs.map(s => `- ${s.name}`).join('\n')
        : '暂无现有规格。';

    projectContext += `\n### 现有规格\n${existingSpecsList}\n`;

    // 3. 生成提示词
    const promptMessage = `# 生成需求澄清问题

## 你的任务
你是一个前端开发需求分析师。基于需求理解规则，生成简洁的澄清问题清单。

## 用户的需求
${userRequirement}

## 项目上下文
${projectContext}

## 需求理解规则
以下规则定义了如何理解和澄清前端需求：

${ruleContent}

---

## 你的使命

基于上面的规则，生成一份澄清文档，要求：

1. **遵循规则的维度**：覆盖规则中定义的所有关键维度
2. **使用规则的模板**：应用规则中的问题模板
3. **保持简洁**：总共10-15个问题，80%+使用checkbox/radio
4. **只问不清楚的**：只针对用户需求中模糊的部分提问

---

## 输出格式

生成完整的澄清文档：

\`\`\`markdown
# 需求澄清 - ${specName}

## 原始需求
${userRequirement}

## 快速澄清（请用 ✓ 标记选择的选项）

[基于规则的维度和模板生成问题]
[使用规则中的emoji图标和结构]
[每个维度2-3个问题]
[总共：10-15个问题]

---

## 状态: ⏳ 等待回答 (0/X 已回答)
**完成后请告诉AI: "澄清完成"**
\`\`\`

---

## 质量检查

生成前确认：
- [ ] 总问题数：10-15个
- [ ] Checkbox/Radio：80%+
- [ ] 每个问题都有明确目的
- [ ] 没有显而易见的问题
- [ ] 问题按维度逻辑分组
- [ ] 关键问题标记为"必答"
- [ ] 语言简单清晰

---

现在，分析需求并基于规则生成澄清文档。`;

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

