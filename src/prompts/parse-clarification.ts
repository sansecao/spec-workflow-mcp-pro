import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const prompt: Prompt = {
    name: 'parse-clarification',
    title: '解析澄清回答',
    description: '解析用户的澄清回答并生成结构化摘要',
    arguments: [
        {
            name: 'specName',
            description: '规格名称',
            required: true
        }
    ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
    const { specName } = args;

    if (!specName) {
        throw new Error('specName 是必需参数');
    }

    const clarificationPath = PathUtils.getClarificationPath(context.projectPath, specName);

    if (!existsSync(clarificationPath)) {
        throw new Error(`未找到规格 ${specName} 的澄清文档`);
    }

    const clarificationContent = await readFile(clarificationPath, 'utf-8');

    // 读取需求理解规则文件以了解维度
    let ruleContent = '';
    const rulePath = join(context.projectPath, '.cursor', 'rules', '1-requirement-understanding.mdc');

    if (existsSync(rulePath)) {
        try {
            ruleContent = await readFile(rulePath, 'utf-8');
            ruleContent = ruleContent.replace(/^---[\s\S]*?---\n/, '');
        } catch {
            // 忽略
        }
    }

    const promptMessage = `# 解析澄清回答

## 你的任务
解析用户的澄清回答，生成结构化的摘要，用于需求文档生成。

## 澄清文档
\`\`\`markdown
${clarificationContent}
\`\`\`

${ruleContent ? `## 需求理解规则\n${ruleContent}\n\n---\n` : ''}

## 解析说明

### 1. 提取回答
- **Checkbox**: [x] 或 [✓] 或 [X] → 是，[ ] → 否/未回答
- **Radio**: [x] 在某个选项旁边 → 已选择
- **Number**: 冒号后有数字
- **Text**: 填写了文本（不是"_____"）

### 2. 计算完成度
- 统计总问题数
- 统计已回答问题数
- 完成度 = (已回答 / 总数) × 100%

### 3. 生成摘要
创建清晰的结构化摘要：

\`\`\`markdown
## 澄清摘要

### ✅ 功能范围
- [列出确认的功能]
- [列出不做的功能]

### 🎨 视觉呈现
- 设计资源: [有设计稿/参考XX页面/自己设计]
- 布局方式: [列表/表格/卡片/表单]

### 📊 数据处理
- 数据来源: [API路径/Mock]
- 显示字段: [列出字段]

### 🖱️ 交互操作
**操作流程**:
1. 用户XX → 系统XX
2. ...

**反馈方式**: [Toast/跳转/刷新]

### 🛡️ 关键异常
- 无数据: [处理方式]
- 失败: [处理方式]

### ❌ 不做的功能
- [列出用户明确说不需要的]

### ⚠️ 未回答（如有）
- [列出未回答的问题]
- [优先级: 高/中/低]

---

## 完成度: XX% (XX/XX 已回答)

## 建议
[准备生成需求文档 / 需要补充澄清]

**下一步**:
1. [具体的下一步操作]
2. [如：开始生成需求文档 / 补充设计稿信息]
\`\`\`

---

现在，解析澄清文档并生成摘要。`;

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

export const parseClarificationPrompt: PromptDefinition = {
    prompt,
    handler
};

