import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PathUtils } from './path-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class WorkspaceInitializer {
  private projectPath: string;
  private version: string;

  constructor(projectPath: string, version: string) {
    this.projectPath = projectPath;
    this.version = version;
  }

  async initializeWorkspace(): Promise<void> {
    // Create all necessary directories
    await this.initializeDirectories();

    // Copy template files
    await this.initializeTemplates();

    // Create config example
    await this.createConfigExample();

    // Create user templates README
    await this.createUserTemplatesReadme();
  }

  private async initializeDirectories(): Promise<void> {
    const workflowRoot = PathUtils.getWorkflowRoot(this.projectPath);

    const directories = [
      'approvals',
      'archive',
      'specs',
      'steering',
      'templates',
      'user-templates'
    ];

    for (const dir of directories) {
      const dirPath = join(workflowRoot, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async initializeTemplates(): Promise<void> {
    const templatesDir = join(PathUtils.getWorkflowRoot(this.projectPath), 'templates');

    const templates = [
      'requirements-template',
      'design-template',
      'tasks-template',
      'product-template',
      'tech-template',
      'structure-template'
    ];

    for (const template of templates) {
      await this.copyTemplate(template, templatesDir);
    }

    // Create clarification template
    await this.createClarificationTemplate(templatesDir);
  }

  private async copyTemplate(templateName: string, targetDir: string): Promise<void> {
    // Use simple filename without version
    const targetFileName = `${templateName}.md`;
    const targetPath = join(targetDir, targetFileName);

    const sourcePath = join(__dirname, '..', 'markdown', 'templates', `${templateName}.md`);

    try {
      const content = await fs.readFile(sourcePath, 'utf-8');

      // Always overwrite to ensure latest template version is used
      await fs.writeFile(targetPath, content, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to copy template ${templateName}: ${errorMessage}`);
    }
  }

  private async createClarificationTemplate(targetDir: string): Promise<void> {
    const targetPath = join(targetDir, 'clarification-template.md');

    const templateContent = `# Requirements Clarification - {spec-name}

## Original Requirement
{user's requirement description}

## Quick Clarification (请用 ✓ 或 ✗ 标记，或简短回答)

### 🎯 Core Scope (必答)
- [ ] **[Feature 1]** - 需要吗？
- [ ] **[Feature 2]** - 需要吗？

### 👥 Users & Roles (必答)
- [ ] **[User type 1]** - 有这个角色吗？
- [ ] **[User type 2]** - 有这个角色吗？

### 📱 Platform & Performance (重要)
- [ ] **Web浏览器** - 支持吗？
- [ ] **移动端响应式** - 需要吗？
- **预期用户数量**: _____ (填写数字，如: 100, 1000, 10000)

### 🎨 User Experience (重要)
- [ ] **使用现有设计系统** - 与项目保持一致

---

## Status: ⏳ Waiting for answers (0/X answered)
**完成后请告诉AI: "澄清完成"**
`;

    try {
      // Always overwrite to ensure latest template version is used
      await fs.writeFile(targetPath, templateContent, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to create clarification template: ${errorMessage}`);
    }
  }

  private async createConfigExample(): Promise<void> {
    const configPath = join(PathUtils.getWorkflowRoot(this.projectPath), 'config.example.toml');

    const configContent = `# Spec Workflow MCP Server Configuration File
# ============================================
#
# This is an example configuration file for the Spec Workflow MCP Server.
# Copy this file to 'config.toml' in the same directory to use it.
#
# Configuration Precedence:
# 1. Command-line arguments (highest priority)
# 2. Config file settings
# 3. Built-in defaults (lowest priority)
#
# All settings are optional. Uncomment and modify as needed.
# Please note that not all MCP clients will support loading this config file due to the nature of where they are running from.

# Project directory path
# The root directory of your project where spec files are located.
# Note: You may have to use double slashes (\\\\) instead of single slashes (/) on Windows or for certain clients.
# Supports tilde (~) expansion for home directory.
# Default: current working directory
# projectDir = "."
# projectDir = "~/my-project"
# projectDir = "/absolute/path/to/project"

# Dashboard port
# The port number for the web dashboard.
# Must be between 1024 and 65535.
# Default: ephemeral port (automatically assigned)
# port = 3000

# Auto-start dashboard
# Automatically launch the dashboard when the MCP server starts.
# The dashboard will open in your default browser.
# Default: false
# autoStartDashboard = false

# Dashboard-only mode
# Run only the web dashboard without the MCP server.
# Useful for standalone dashboard usage.
# Default: false
# dashboardOnly = false

# Language
# Set the interface language for internationalization (i18n).
# Available languages depend on your installation.
# Common values: "en" (English), "ja" (Japanese), etc.
# Default: system language or "en"
# lang = "en"

# Example configurations:
# =====================

# Example 1: Development setup with auto-started dashboard
# ----------------------------------------------------------
# projectDir = "~/dev/my-project"
# autoStartDashboard = true
# port = 3456

# Example 2: Production MCP server without dashboard
# ---------------------------------------------------
# projectDir = "/var/projects/production"
# autoStartDashboard = false

# Example 3: Dashboard-only mode for viewing specs
# -------------------------------------------------
# projectDir = "."
# dashboardOnly = true
# port = 8080

# Example 4: Japanese language interface
# ---------------------------------------
# lang = "ja"
# autoStartDashboard = true`;

    try {
      // Only create if it doesn't exist to avoid overwriting user's example
      await fs.access(configPath);
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(configPath, configContent, 'utf-8');
    }
  }

  private async createUserTemplatesReadme(): Promise<void> {
    const readmePath = join(PathUtils.getWorkflowRoot(this.projectPath), 'user-templates', 'README.md');

    const readmeContent = `# User Templates

This directory allows you to create custom templates that override the default Spec Workflow templates.

## How to Use Custom Templates

1. **Create your custom template file** in this directory with the exact same name as the default template you want to override:
   - \`clarification-template.md\` - Override clarification questions template
   - \`requirements-template.md\` - Override requirements document template
   - \`design-template.md\` - Override design document template  
   - \`tasks-template.md\` - Override tasks document template
   - \`product-template.md\` - Override product steering template
   - \`tech-template.md\` - Override tech steering template
   - \`structure-template.md\` - Override structure steering template

2. **Template Loading Priority**:
   - The system first checks this \`user-templates/\` directory
   - If a matching template is found here, it will be used
   - Otherwise, the default template from \`templates/\` will be used

## Example Custom Template

To create a custom requirements template:

1. Create a file named \`requirements-template.md\` in this directory
2. Add your custom structure, for example:

\`\`\`markdown
# Requirements Document

## Executive Summary
[Your custom section]

## Business Requirements
[Your custom structure]

## Technical Requirements
[Your custom fields]

## Custom Sections
[Add any sections specific to your workflow]
\`\`\`

## Template Variables

Templates can include placeholders that will be replaced when documents are created:
- \`{{projectName}}\` - The name of your project
- \`{{featureName}}\` - The name of the feature being specified
- \`{{date}}\` - The current date
- \`{{author}}\` - The document author

## Best Practices

1. **Start from defaults**: Copy a default template from \`../templates/\` as a starting point
2. **Keep structure consistent**: Maintain similar section headers for tool compatibility
3. **Document changes**: Add comments explaining why sections were added/modified
4. **Version control**: Track your custom templates in version control
5. **Test thoroughly**: Ensure custom templates work with the spec workflow tools

## Notes

- Custom templates are project-specific and not included in the package distribution
- The \`templates/\` directory contains the default templates which are updated with each version
- Your custom templates in this directory are preserved during updates
- If a custom template has errors, the system will fall back to the default template
`;

    try {
      // Only create if it doesn't exist to avoid overwriting user's README
      await fs.access(readmePath);
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(readmePath, readmeContent, 'utf-8');
    }
  }
}