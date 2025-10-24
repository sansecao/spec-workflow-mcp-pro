import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';

export const requirementsClarificationTool: Tool = {
    name: 'requirements-clarification',
    description: `通过结构化问答管理需求澄清流程。

此工具帮助生成简单的问题来快速澄清用户需求。

操作：
- 'generate': 创建 clarification.md 并生成澄清问题
- 'check': 解析用户回答并计算完成度
- 'validate': 检查澄清是否足够开始开发
- 'complete': 标记澄清为已完成

工具会读取项目中的 .cursor/rules/1-requirement-understanding.mdc 文件作为需求理解规则，
基于该规则动态生成针对用户具体需求和项目上下文的澄清问题。`,

    inputSchema: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['generate', 'check', 'validate', 'complete'],
                description: '要执行的操作'
            },
            specName: {
                type: 'string',
                description: '规格名称（kebab-case 格式）'
            },
            userRequirement: {
                type: 'string',
                description: '用户的原始需求描述（generate 操作必需）'
            },
            clarificationContent: {
                type: 'string',
                description: '生成的澄清问题内容（generate 操作必需）'
            }
        },
        required: ['action', 'specName']
    }
};

// Type definitions
type GenerateArgs = {
    action: 'generate';
    specName: string;
    userRequirement: string;
    clarificationContent: string;
};

type CheckArgs = {
    action: 'check';
    specName: string;
};

type ValidateArgs = {
    action: 'validate';
    specName: string;
};

type CompleteArgs = {
    action: 'complete';
    specName: string;
};

type ClarificationArgs = GenerateArgs | CheckArgs | ValidateArgs | CompleteArgs;

// Type guards
function isGenerateAction(args: ClarificationArgs): args is GenerateArgs {
    return args.action === 'generate';
}

function isCheckAction(args: ClarificationArgs): args is CheckArgs {
    return args.action === 'check';
}

function isValidateAction(args: ClarificationArgs): args is ValidateArgs {
    return args.action === 'validate';
}

function isCompleteAction(args: ClarificationArgs): args is CompleteArgs {
    return args.action === 'complete';
}

export async function requirementsClarificationHandler(
    args: ClarificationArgs,
    context: ToolContext
): Promise<ToolResponse> {
    const { action, specName } = args;

    if (isGenerateAction(args)) {
        return handleGenerate(args, context);
    } else if (isCheckAction(args)) {
        return handleCheck(args, context);
    } else if (isValidateAction(args)) {
        return handleValidate(args, context);
    } else if (isCompleteAction(args)) {
        return handleComplete(args, context);
    }

    throw new Error(`Unknown action: ${action}`);
}

async function handleGenerate(
    args: GenerateArgs,
    context: ToolContext
): Promise<ToolResponse> {
    const { specName, clarificationContent } = args;
    const clarificationPath = PathUtils.getClarificationPath(context.projectPath, specName);

    try {
        // Ensure spec directory exists
        const specDir = dirname(clarificationPath);
        if (!existsSync(specDir)) {
            await mkdir(specDir, { recursive: true });
        }

        // Write clarification content
        await writeFile(clarificationPath, clarificationContent, 'utf-8');

        // Count total questions
        const totalQuestions = countTotalQuestions(clarificationContent);

        return {
            success: true,
            message: `澄清文档已创建：.spec-workflow/specs/${specName}/clarification.md，共 ${totalQuestions} 个问题`,
            data: {
                path: `.spec-workflow/specs/${specName}/clarification.md`,
                totalQuestions
            }
        };
    } catch (error) {
        return {
            success: false,
            message: `创建澄清文档失败：${error instanceof Error ? error.message : String(error)}`
        };
    }
}

async function handleCheck(
    args: CheckArgs,
    context: ToolContext
): Promise<ToolResponse> {
    const { specName } = args;
    const clarificationPath = PathUtils.getClarificationPath(context.projectPath, specName);

    try {
        if (!existsSync(clarificationPath)) {
            return {
                success: false,
                message: `未找到规格 ${specName} 的澄清文档`
            };
        }

        const content = await readFile(clarificationPath, 'utf-8');
        const result = parseClarificationAnswers(content);

        return {
            success: true,
            message: `澄清状态：${result.completeness}% 完成（${result.answeredQuestions}/${result.totalQuestions} 已回答）`,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            message: `检查澄清状态失败：${error instanceof Error ? error.message : String(error)}`
        };
    }
}

async function handleValidate(
    args: ValidateArgs,
    context: ToolContext
): Promise<ToolResponse> {
    const { specName } = args;
    const clarificationPath = PathUtils.getClarificationPath(context.projectPath, specName);

    try {
        if (!existsSync(clarificationPath)) {
            return {
                success: false,
                message: `未找到规格 ${specName} 的澄清文档`
            };
        }

        const content = await readFile(clarificationPath, 'utf-8');
        const result = parseClarificationAnswers(content);

        const isValid = result.completeness >= 80;
        const missingRequired = findMissingRequiredQuestions(content);

        return {
            success: true,
            message: isValid
                ? '澄清已足够，可以开始开发'
                : `需要更多澄清（${result.completeness}% 完成）`,
            data: {
                isValid,
                completeness: result.completeness,
                missingRequired,
                suggestion: isValid
                    ? '准备生成需求文档'
                    : '请回答剩余问题或生成后续澄清问题'
            }
        };
    } catch (error) {
        return {
            success: false,
            message: `验证澄清失败：${error instanceof Error ? error.message : String(error)}`
        };
    }
}

async function handleComplete(
    args: CompleteArgs,
    context: ToolContext
): Promise<ToolResponse> {
    const { specName } = args;
    const clarificationPath = PathUtils.getClarificationPath(context.projectPath, specName);

    try {
        if (!existsSync(clarificationPath)) {
            return {
                success: false,
                message: `未找到规格 ${specName} 的澄清文档`
            };
        }

        let content = await readFile(clarificationPath, 'utf-8');

        // Update status line
        content = content.replace(
            /## 状态: ⏳ 等待回答.*$/m,
            '## 状态: ✅ 已完成'
        );

        await writeFile(clarificationPath, content, 'utf-8');

        return {
            success: true,
            message: '澄清已标记为完成'
        };
    } catch (error) {
        return {
            success: false,
            message: `完成澄清失败：${error instanceof Error ? error.message : String(error)}`
        };
    }
}

// Helper functions
function countTotalQuestions(content: string): number {
    const checkboxCount = (content.match(/- \[[ x✓X]\]/g) || []).length;
    const radioCount = (content.match(/选择一个:/g) || []).length;
    const numberCount = (content.match(/\*\*.*?\*\*:\s*_+/g) || []).length;
    return checkboxCount + radioCount + numberCount;
}

function parseClarificationAnswers(content: string): {
    completeness: number;
    totalQuestions: number;
    answeredQuestions: number;
    answers: {
        checkboxes: Record<string, boolean>;
        numbers: Record<string, number>;
        radios: Record<string, string>;
    };
} {
    // Count total questions
    const totalQuestions = countTotalQuestions(content);

    // Parse checkbox answers
    const checkboxAnswers: Record<string, boolean> = {};
    const checkboxMatches = content.matchAll(/- \[(x|✓|X)\] \*\*(.*?)\*\*/g);
    for (const match of checkboxMatches) {
        checkboxAnswers[match[2]] = true;
    }

    // Parse number answers
    const numberAnswers: Record<string, number> = {};
    const numberMatches = content.matchAll(/\*\*(.*?)\*\*:\s*(\d+)/g);
    for (const match of numberMatches) {
        const question = match[1];
        const value = parseInt(match[2]);
        if (!isNaN(value)) {
            numberAnswers[question] = value;
        }
    }

    // Parse radio answers
    const radioAnswers: Record<string, string> = {};
    const radioSections = content.split('选择一个:');
    for (let i = 1; i < radioSections.length; i++) {
        const section = radioSections[i];
        const selectedMatch = section.match(/\[(x|✓|X)\] \*\*(.*?)\*\*/);
        if (selectedMatch) {
            // Use section index as key since we don't have explicit question text
            radioAnswers[`radio_${i}`] = selectedMatch[2];
        }
    }

    // Calculate answered questions
    const answeredQuestions =
        Object.keys(checkboxAnswers).length +
        Object.keys(numberAnswers).length +
        Object.keys(radioAnswers).length;

    // Calculate completeness
    const completeness = totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0;

    return {
        completeness,
        totalQuestions,
        answeredQuestions,
        answers: {
            checkboxes: checkboxAnswers,
            numbers: numberAnswers,
            radios: radioAnswers
        }
    };
}

function findMissingRequiredQuestions(content: string): string[] {
    const missing: string[] = [];

    // Find sections marked as "必答"
    const requiredSections = content.match(/###.*?\(必答\)[\s\S]*?(?=###|---)/g) || [];

    for (const section of requiredSections) {
        // Find unanswered checkboxes in required sections
        const unansweredMatches = section.matchAll(/- \[ \] \*\*(.*?)\*\*/g);
        for (const match of unansweredMatches) {
            missing.push(match[1]);
        }
    }

    return missing;
}

