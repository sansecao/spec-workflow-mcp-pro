import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';

export const requirementsClarificationTool: Tool = {
    name: 'requirements-clarification',
    description: `Manage requirements clarification process through structured Q&A.

This tool helps generate simple yes/no questions to quickly clarify user requirements,
reducing clarification time from 15-30 minutes to 2-5 minutes.

Actions:
- 'generate': Create clarification.md with AI-generated questions
- 'check': Parse user answers and calculate completeness
- 'validate': Check if clarification is sufficient to proceed
- 'complete': Mark clarification as complete

The tool does NOT use predefined templates. Instead, it leverages AI to dynamically
generate context-aware questions based on the user's specific requirement and project context.`,

    inputSchema: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['generate', 'check', 'validate', 'complete'],
                description: 'The action to perform'
            },
            specName: {
                type: 'string',
                description: 'Name of the specification (kebab-case format)'
            },
            userRequirement: {
                type: 'string',
                description: 'User\'s original requirement description (required for generate action)'
            },
            clarificationContent: {
                type: 'string',
                description: 'Generated clarification questions (required for generate action)'
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
            message: `Clarification document created at .spec-workflow/specs/${specName}/clarification.md with ${totalQuestions} questions`,
            data: {
                path: `.spec-workflow/specs/${specName}/clarification.md`,
                totalQuestions
            }
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to create clarification document: ${error instanceof Error ? error.message : String(error)}`
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
                message: `Clarification document not found for spec: ${specName}`
            };
        }

        const content = await readFile(clarificationPath, 'utf-8');
        const result = parseClarificationAnswers(content);

        return {
            success: true,
            message: `Clarification status: ${result.completeness}% complete (${result.answeredQuestions}/${result.totalQuestions} answered)`,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to check clarification status: ${error instanceof Error ? error.message : String(error)}`
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
                message: `Clarification document not found for spec: ${specName}`
            };
        }

        const content = await readFile(clarificationPath, 'utf-8');
        const result = parseClarificationAnswers(content);

        const isValid = result.completeness >= 80;
        const missingRequired = findMissingRequiredQuestions(content);

        return {
            success: true,
            message: isValid
                ? 'Clarification is sufficient to proceed'
                : `More clarification needed (${result.completeness}% complete)`,
            data: {
                isValid,
                completeness: result.completeness,
                missingRequired,
                suggestion: isValid
                    ? 'Ready to generate requirements document'
                    : 'Please answer remaining questions or generate follow-up questions'
            }
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to validate clarification: ${error instanceof Error ? error.message : String(error)}`
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
                message: `Clarification document not found for spec: ${specName}`
            };
        }

        let content = await readFile(clarificationPath, 'utf-8');

        // Update status line
        content = content.replace(
            /## Status: ⏳ Waiting for answers.*$/m,
            '## Status: ✅ Completed'
        );

        await writeFile(clarificationPath, content, 'utf-8');

        return {
            success: true,
            message: 'Clarification marked as complete'
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to complete clarification: ${error instanceof Error ? error.message : String(error)}`
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

