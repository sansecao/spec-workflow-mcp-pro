import { Prompt, PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { PromptDefinition } from './types.js';
import { ToolContext } from '../types.js';
import { PathUtils } from '../core/path-utils.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const prompt: Prompt = {
  name: 'create-spec',
  title: 'Create Specification Document',
  description: 'Guide for creating spec documents directly in the file system. Shows how to use templates and create requirements, design, or tasks documents at the correct paths.',
  arguments: [
    {
      name: 'specName',
      description: 'Feature name in kebab-case (e.g., user-authentication, data-export)',
      required: true
    },
    {
      name: 'documentType',
      description: 'Type of document to create: requirements, design, or tasks',
      required: true
    },
    {
      name: 'description',
      description: 'Brief description of what this spec should accomplish',
      required: false
    }
  ]
};

async function handler(args: Record<string, any>, context: ToolContext): Promise<PromptMessage[]> {
  const { specName, documentType, description } = args;

  if (!specName || !documentType) {
    throw new Error('specName and documentType are required arguments');
  }

  const validDocTypes = ['requirements', 'design', 'tasks'];
  if (!validDocTypes.includes(documentType)) {
    throw new Error(`documentType must be one of: ${validDocTypes.join(', ')}`);
  }

  // Read clarification results if available (for requirements documents)
  let clarificationSection = '';
  if (documentType === 'requirements') {
    const clarificationPath = PathUtils.getClarificationPath(context.projectPath, specName);
    if (existsSync(clarificationPath)) {
      try {
        const clarificationContent = await readFile(clarificationPath, 'utf-8');
        clarificationSection = `

## ⚠️ IMPORTANT: Clarification Results Available

The user has completed a detailed clarification process. The clarified details are in the document below.

**YOU MUST use these clarified details as the PRIMARY source of truth for generating the requirements document.**

Do NOT make assumptions beyond what the user has confirmed. If something is not addressed in the clarification, either:
1. Note it as "TBD - To be determined"
2. Use reasonable defaults based on project context
3. Mention it as a follow-up question

### Clarification Document
\`\`\`markdown
${clarificationContent}
\`\`\`

### How to Use This
1. Extract all confirmed features (checkbox marked with ✓ or x)
2. Extract all selected options (radio buttons)
3. Extract all filled numbers and text
4. Use these as the foundation for requirements
5. Don't add features user didn't confirm
6. Don't assume details user didn't provide

`;
      } catch {
        // Ignore read errors
      }
    }
  }

  // Build context-aware messages
  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Create a ${documentType} document for the "${specName}" feature using the spec-workflow methodology.
${clarificationSection}

**Context:**
- Project: ${context.projectPath}
- Feature: ${specName}
- Document type: ${documentType}
${description ? `- Description: ${description}` : ''}
${context.dashboardUrl ? `- Dashboard: ${context.dashboardUrl}` : ''}

**Instructions:**
1. First, read the template at: .spec-workflow/templates/${documentType}-template.md
2. Follow the template structure exactly - this ensures consistency across the project
3. Create comprehensive content that follows spec-driven development best practices
4. Include all required sections from the template
5. Use clear, actionable language
6. Create the document at: .spec-workflow/specs/${specName}/${documentType}.md
7. After creating, use approvals tool with action:'request' to get user approval

**File Paths:**
- Template location: .spec-workflow/templates/${documentType}-template.md
- Document destination: .spec-workflow/specs/${specName}/${documentType}.md

**Workflow Guidelines:**
- Requirements documents define WHAT needs to be built
- Design documents define HOW it will be built  
- Tasks documents break down implementation into actionable steps
- Each document builds upon the previous one in sequence
- Templates are automatically updated on server start

${documentType === 'tasks' ? `
**Special Instructions for Tasks Document:**
- For each task, generate a _Prompt field with structured AI guidance
- Format: _Prompt: Role: [role] | Task: [description] | Restrictions: [constraints] | Success: [criteria]
- Make prompts specific to the project context and requirements
- Include _Leverage fields pointing to existing code to reuse
- Include _Requirements fields showing which requirements each task implements
- Tasks should be atomic (1-3 files each) and in logical order
` : ''}

Please read the ${documentType} template and create the comprehensive document at the specified path.`
      }
    }
  ];

  return messages;
}

export const createSpecPrompt: PromptDefinition = {
  prompt,
  handler
};