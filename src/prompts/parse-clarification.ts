import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const prompt: Prompt = {
    name: 'parse-clarification',
    title: 'Parse Clarification Answers',
    description: 'Parse user answers from clarification document and generate structured summary',
    arguments: [
        {
            name: 'specName',
            description: 'Name of the specification',
            required: true
        }
    ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
    const { specName } = args;

    if (!specName) {
        throw new Error('specName is a required argument');
    }

    const clarificationPath = PathUtils.getClarificationPath(context.projectPath, specName);

    if (!existsSync(clarificationPath)) {
        throw new Error(`Clarification document not found for spec: ${specName}`);
    }

    const clarificationContent = await readFile(clarificationPath, 'utf-8');

    const promptMessage = `# Parse Clarification Answers

## Your Task
Parse the user's answers from the clarification document and generate a human-readable summary for requirements generation.

## Clarification Document
\`\`\`markdown
${clarificationContent}
\`\`\`

---

## Parsing Instructions

### 1. Extract Answers
- **Checkbox**: [x] or [✓] or [X] → YES, [ ] → NO/Unanswered
- **Radio**: [x] next to an option → Selected
- **Number**: Filled number after colon
- **Text**: Filled text (not "_____")

### 2. Calculate Completeness
- Count total questions
- Count answered questions
- Completeness = (answered / total) × 100%

### 3. Generate Summary
Create a clear, structured summary of what the user confirmed:

\`\`\`markdown
## Clarification Summary

### Confirmed Features
- [List all features user said YES to]

### User Roles
- [List confirmed user types]

### Technical Requirements
- Security Level: [Selected level]
- Platform Support: [List platforms]
- Expected Users: [Number]
- Response Time: [Requirement]

### UI/UX Preferences
- [List preferences]

### Integration Needs
- [List integrations if any]

### Out of Scope
- [List features user said NO to]

### Unanswered (if any)
- [List unanswered questions]
\`\`\`

---

## Output Format

Provide:
1. **Completeness percentage**
2. **Structured summary** (as shown above)
3. **Recommendation**: "Ready for requirements generation" or "Needs more clarification"

---

Now, parse the clarification document and generate the summary.`;

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

