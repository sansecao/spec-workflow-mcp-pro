/**
 * Unified Task Parser Module
 * Provides consistent task parsing across all components
 */

/**
 * Parse a prompt string into structured sections if it contains pipe separators
 * @param promptText The raw prompt text
 * @returns Array of prompt sections or undefined if not structured
 */
function parseStructuredPrompt(promptText: string): PromptSection[] | undefined {
  // Validate input
  if (!promptText || typeof promptText !== 'string') {
    return undefined;
  }
  
  // Check if the prompt contains pipe separators (indicating structured format)
  if (!promptText.includes('|')) {
    return undefined;
  }

  const sections: PromptSection[] = [];
  
  // Split by pipe and process each section
  const parts = promptText.split('|').map(part => part.trim()).filter(part => part.length > 0);
  
  // Return early if no valid parts after filtering
  if (parts.length === 0) {
    return undefined;
  }
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Part is guaranteed to be non-empty due to filter above
    
    // Special handling for the first part - it might contain preamble text before the first key
    if (i === 0) {
      // Look for the last occurrence of a known key pattern in the first part
      const knownKeys = ['Role', 'Task', 'Context', 'Instructions', 'Requirements', 'Leverage', 'Success', 'Restrictions'];
      let lastKeyIndex = -1;
      
      for (const key of knownKeys) {
        const keyPattern = new RegExp(`\\b${key}:`, 'i');
        const match = part.match(keyPattern);
        if (match && match.index !== undefined && match.index > lastKeyIndex) {
          lastKeyIndex = match.index;
        }
      }
      
      if (lastKeyIndex > -1 && lastKeyIndex < part.length) {
        // Extract the key-value pair starting from the found key
        const keyValuePart = part.substring(lastKeyIndex);
        const colonIndex = keyValuePart.indexOf(':');
        if (colonIndex > 0 && colonIndex < keyValuePart.length - 1) {
          const key = keyValuePart.substring(0, colonIndex).trim();
          const value = keyValuePart.substring(colonIndex + 1).trim();
          
          // Validate key and value are non-empty after cleaning
          if (key && value) {
            const cleanKey = key.replace(/^_+|_+$/g, '');
            const cleanValue = value.replace(/^_+|_+$/g, '');
            
            // Only add if both cleaned values are non-empty
            if (cleanKey && cleanValue) {
              sections.push({ key: cleanKey, value: cleanValue });
            }
          }
        }
      }
      continue;
    }
    
    // For other parts, look for "Key: Value" pattern
    const colonIndex = part.indexOf(':');
    if (colonIndex > 0 && colonIndex < part.length - 1) {
      const key = part.substring(0, colonIndex).trim();
      const value = part.substring(colonIndex + 1).trim();
      
      // Validate key and value exist
      if (key && value) {
        // Clean up any markdown formatting (underscores for italics, etc.)
        const cleanKey = key.replace(/^_+|_+$/g, '');
        const cleanValue = value.replace(/^_+|_+$/g, '');
        
        // Only add if both cleaned values are non-empty
        if (cleanKey && cleanValue) {
          sections.push({ key: cleanKey, value: cleanValue });
        }
      }
    } else if (colonIndex <= 0 || colonIndex >= part.length - 1) {
      // If no valid colon position, treat as continuation only if previous section exists
      if (sections.length > 0) {
        const cleanedPart = part.replace(/^_+|_+$/g, '').trim();
        if (cleanedPart) {
          sections[sections.length - 1].value += ' | ' + cleanedPart;
        }
      }
    }
  }
  
  return sections.length > 0 ? sections : undefined;
}
export interface PromptSection {
  key: string;                         // Section name (e.g., "Role", "Task", "Restrictions")
  value: string;                       // Section content
}

export interface ParsedTask {
  id: string;                          // Task ID (e.g., "1", "1.1", "2.3")
  description: string;                 // Task description
  status: 'pending' | 'in-progress' | 'completed';
  lineNumber: number;                  // Line number in the file (0-based)
  indentLevel: number;                 // Indentation level (for hierarchy)
  isHeader: boolean;                   // Whether this is a header task (no implementation details)
  
  // Optional metadata
  requirements?: string[];              // Referenced requirements
  leverage?: string;                   // Code to leverage
  files?: string[];                    // Files to modify/create
  purposes?: string[];                 // Purpose statements
  implementationDetails?: string[];    // Implementation bullet points
  prompt?: string;                     // AI prompt for this task (full text)
  promptStructured?: PromptSection[];  // Structured prompt sections (if prompt contains pipe separators)
  
  // For backward compatibility
  completed: boolean;                  // true if status === 'completed'
  inProgress: boolean;                 // true if status === 'in-progress'
}
export interface TaskParserResult {
  tasks: ParsedTask[];
  inProgressTask: string | null;       // ID of current in-progress task (e.g., "1.1")
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    headers: number;
  };
}

/**
 * Parse tasks from markdown content
 * Handles any checkbox format at any indentation level
 */
export function parseTasksFromMarkdown(content: string): TaskParserResult {
  const lines = content.split('\n');
  const tasks: ParsedTask[] = [];
  let inProgressTask: string | null = null;
  
  // Find all lines with checkboxes
  const checkboxIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*-\s+\[([ x\-])\]/)) {
      checkboxIndices.push(i);
    }
  }
  
  // Process each checkbox task
  for (let idx = 0; idx < checkboxIndices.length; idx++) {
    const lineNumber = checkboxIndices[idx];
    const endLine = idx < checkboxIndices.length - 1 ? checkboxIndices[idx + 1] : lines.length;
    
    const line = lines[lineNumber];
    const checkboxMatch = line.match(/^(\s*)-\s+\[([ x\-])\]\s+(.+)/);
    
    if (!checkboxMatch) continue;
    
    const indent = checkboxMatch[1];
    const statusChar = checkboxMatch[2];
    const taskText = checkboxMatch[3];
    
    // Determine status
    let status: 'pending' | 'in-progress' | 'completed';
    if (statusChar === 'x') {
      status = 'completed';
    } else if (statusChar === '-') {
      status = 'in-progress';
    } else {
      status = 'pending';
    }
    
    // Extract task ID and description
    // Match patterns like "1. Description", "1.1 Description", "2.1. Description" etc
    const taskMatch = taskText.match(/^(\d+(?:\.\d+)*)\s*\.?\s+(.+)/);
    
    let taskId: string;
    let description: string;
    
    if (taskMatch) {
      taskId = taskMatch[1];
      description = taskMatch[2];
    } else {
      // No task number found, skip this task
      continue;
    }
    
    // Parse metadata from content between this task and the next
    const requirements: string[] = [];
    const leverage: string[] = [];
    const files: string[] = [];
    const purposes: string[] = [];
    const implementationDetails: string[] = [];
    let prompt: string | undefined;
    
    for (let lineIdx = lineNumber + 1; lineIdx < endLine; lineIdx++) {
      const contentLine = lines[lineIdx].trim();
      
      // Skip empty lines
      if (!contentLine) continue;
      // Check for metadata patterns
      // IMPORTANT: Check for _Prompt: first since it can contain nested _Requirements: and _Leverage:
      if (contentLine.includes('_Prompt:')) {
        // Capture everything after _Prompt: until the final closing underscore
        const promptMatch = contentLine.match(/_Prompt:\s*(.+)_$/);
        if (promptMatch) {
          prompt = promptMatch[1].trim();
        } else {
          // If no closing underscore on same line, capture multi-line
          const afterPrompt = contentLine.match(/_Prompt:\s*(.+)$/);
          let promptText = afterPrompt ? afterPrompt[1] : '';
          promptText = promptText.replace(/_$/, '').trim();

          // Accumulate continuation lines that are not new bullets/metadata
          let j = lineIdx + 1;
          while (j < endLine) {
            const nextTrim = lines[j].trim();
            if (!nextTrim) break; // stop at blank line
            // Stop if we hit another bullet/metadata marker or files/purpose sections
            if (
              /^-\s/.test(nextTrim) ||
              /^Files?:/i.test(nextTrim) ||
              /^Purpose:/i.test(nextTrim)
            ) {
              break;
            }
            promptText += ' ' + nextTrim.replace(/_$/, '').trim();
            j++;
          }
          prompt = promptText;
          // Skip consumed continuation lines
          lineIdx = j - 1;
        }
      } else if (contentLine.includes('_Requirements:') && !contentLine.includes('_Prompt:')) {
        // Only process if not inside a prompt
        const reqMatch = contentLine.match(/_Requirements:\s*([^_]+?)_/);
        if (reqMatch) {
          const reqText = reqMatch[1].trim();
          // Split by comma and filter out empty/NFR
          requirements.push(...reqText.split(',').map(r => r.trim()).filter(r => r && r !== 'NFR'));
        }
      } else if (contentLine.includes('_Leverage:') && !contentLine.includes('_Prompt:')) {
        // Only process if not inside a prompt
        const levMatch = contentLine.match(/_Leverage:\s*([^_]+?)_/);
        if (levMatch) {
          const levText = levMatch[1].trim();
          leverage.push(...levText.split(',').map(l => l.trim()).filter(l => l));
        }
      } else if (contentLine.match(/Files?:/)) {
        const fileMatch = contentLine.match(/Files?:\s*(.+)$/);
        if (fileMatch) {
          // Split by comma and clean up each file path
          const filePaths = fileMatch[1]
            .split(',')
            .map(f => f.trim().replace(/\(.*?\)/, '').trim())
            .filter(f => f.length > 0);
          files.push(...filePaths);
        }
      } else if (contentLine.startsWith('- ') && !contentLine.match(/^-\s+\[/)) {
        // Regular bullet point - could be implementation detail or purpose
        const bulletContent = contentLine.substring(2).trim();
        if (bulletContent.startsWith('Purpose:')) {
          purposes.push(bulletContent.substring(8).trim());
        } else if (!bulletContent.match(/^Files?:/) && !bulletContent.match(/^Purpose:/)) {
          implementationDetails.push(bulletContent);
        }
      }
    }
    
    // Determine if this is a header task (has no implementation details)
    const hasDetails = requirements.length > 0 || 
                      leverage.length > 0 || 
                      files.length > 0 || 
                      purposes.length > 0 || 
                      implementationDetails.length > 0 ||
                      !!prompt;
    
    // Parse structured prompt if applicable
    let promptStructured: PromptSection[] | undefined;
    if (prompt) {
      promptStructured = parseStructuredPrompt(prompt);
    }
    
    const task: ParsedTask = {
      id: taskId,
      description,
      status,
      lineNumber,
      indentLevel: indent.length / 2, // Assuming 2 spaces per indent level
      isHeader: !hasDetails,
      completed: status === 'completed',
      inProgress: status === 'in-progress',
      
      // Add metadata if present
      ...(requirements.length > 0 && { requirements }),
      ...(leverage.length > 0 && { leverage: leverage.join(', ') }),
      ...(files.length > 0 && { files }),
      ...(purposes.length > 0 && { purposes }),
      ...(implementationDetails.length > 0 && { implementationDetails }),
      ...(prompt && { prompt }),
      ...(promptStructured && { promptStructured })
    };    
    tasks.push(task);
    
    // Track first in-progress task (for UI highlighting)
    if (status === 'in-progress' && !inProgressTask) {
      inProgressTask = taskId;  // Just store the task ID for UI comparison
    }
  }
  
  // Calculate summary
  const summary = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    headers: tasks.filter(t => t.isHeader).length
  };
  
  return {
    tasks,
    inProgressTask,
    summary
  };
}

/**
 * Update task status in markdown content
 * Handles any indentation level and task numbering format
 */
export function updateTaskStatus(
  content: string, 
  taskId: string, 
  newStatus: 'pending' | 'in-progress' | 'completed'
): string {
  const lines = content.split('\n');
  const statusMarker = newStatus === 'completed' ? 'x' : 
                       newStatus === 'in-progress' ? '-' : 
                       ' ';
  
  // Find and update the task line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match checkbox line with task ID in the description
    // Pattern: - [x] 1.1 Task description
    const checkboxMatch = line.match(/^(\s*)-\s+\[([ x\-])\]\s+(.+)/);

    if (checkboxMatch) {
      const taskText = checkboxMatch[3];

      // Check if this line contains our target task ID
      // Match patterns like "1. Description", "1.1 Description", "2.1. Description" etc
      const taskMatch = taskText.match(/^(\d+(?:\.\d+)*)\s*\.?\s+(.+)/);

      if (taskMatch && taskMatch[1] === taskId) {
        // Reconstruct the line with new status
        const prefix = checkboxMatch[1];
        const statusPart = `- [${statusMarker}] `;
        lines[i] = prefix + statusPart + taskText;
        return lines.join('\n');
      }
    }
  }
  
  // Task not found
  return content;
}

/**
 * Find the next pending task that is not a header
 */
export function findNextPendingTask(tasks: ParsedTask[]): ParsedTask | null {
  return tasks.find(t => t.status === 'pending' && !t.isHeader) || null;
}

/**
 * Get task by ID
 */
export function getTaskById(tasks: ParsedTask[], taskId: string): ParsedTask | undefined {
  return tasks.find(t => t.id === taskId);
}

/**
 * Export for backward compatibility with existing code
 */
export function parseTaskProgress(content: string): { 
  total: number; 
  completed: number; 
  pending: number;
} {
  const result = parseTasksFromMarkdown(content);
  return {
    total: result.summary.total,
    completed: result.summary.completed,
    pending: result.summary.pending
  };
}
