import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolContext, ToolResponse } from '../types.js';

export const specWorkflowGuideTool: Tool = {
  name: 'spec-workflow-guide',
  description: `Load essential spec workflow instructions to guide feature development from idea to implementation.

# Instructions
Call this tool FIRST when users request spec creation, feature development, or mention specifications. This provides the complete workflow sequence (Requirements → Design → Tasks → Implementation) that must be followed. Always load before any other spec tools to ensure proper workflow understanding. Its important that you follow this workflow exactly to avoid errors.`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function specWorkflowGuideHandler(args: any, context: ToolContext): Promise<ToolResponse> {
  // Get dashboard URL from context or session
  let dashboardUrl = context.dashboardUrl;
  if (!dashboardUrl && context.sessionManager) {
    dashboardUrl = await context.sessionManager.getDashboardUrl();
  }

  const dashboardMessage = dashboardUrl ?
    `Monitor progress on dashboard: ${dashboardUrl}` :
    'Please start the dashboard or use VS Code extension "Spec Workflow MCP"';

  return {
    success: true,
    message: 'Complete spec workflow guide loaded - follow this workflow exactly',
    data: {
      guide: getSpecWorkflowGuide(),
      dashboardUrl: dashboardUrl,
      dashboardAvailable: !!dashboardUrl
    },
    nextSteps: [
      'Follow sequence: Clarification (optional) → Requirements → Design → Tasks → Implementation',
      'Auto-judge if clarification needed based on request length and detail',
      'Use Chinese templates with emoji icons - maintain exact format',
      'Request approval after each document via Dashboard/VSCode only',
      'Never skip phases or accept verbal approval',
      dashboardMessage
    ]
  };
}

function getSpecWorkflowGuide(): string {
  const currentYear = new Date().getFullYear();
  return `# Spec Development Workflow

## Overview

You guide users through spec-driven development using MCP tools. Transform rough ideas into detailed specifications through Requirements → Design → Tasks → Implementation phases. Use web search when available for current best practices (current year: ${currentYear}). Its important that you follow this workflow exactly to avoid errors.
Feature names use kebab-case (e.g., user-authentication). Create ONE spec at a time.

## Workflow Diagram
\`\`\`mermaid
flowchart TD
    Start([Start: User requests feature]) --> ParseRequest[Parse request and extract spec name]
    ParseRequest --> CheckSteering{Steering docs exist?}
    CheckSteering -->|Yes| ReadSteering[Read steering docs:<br/>.spec-workflow/steering/*.md]
    CheckSteering -->|No| CheckClarification
    ReadSteering --> CheckClarification{Need clarification?}

    %% Phase 0: Requirements Clarification (NEW)
    CheckClarification -->|Yes<br/>Brief/ambiguous request| P0_Generate[Call requirements-clarification<br/>action: generate]
    P0_Generate --> P0_Create[Create clarification.md<br/>with structured questions]
    P0_Create --> P0_Inform[Inform user: "Please answer<br/>clarification questions (2-5 min)"]
    P0_Inform --> P0_Wait[User fills clarification.md]
    P0_Wait --> P0_Check[Call requirements-clarification<br/>action: check]
    P0_Check --> P0_Complete{Completeness >= 80%?}
    P0_Complete -->|No| P0_Follow[Generate 3-5 follow-up questions]
    P0_Follow --> P0_Wait
    P0_Complete -->|Yes| P0_Finalize[Call action: complete]
    P0_Finalize --> P1_Template

    CheckClarification -->|No<br/>Detailed request| P1_Template

    %% Phase 1: Requirements (UPDATED)
    P1_Template[Check user-templates first,<br/>then read requirements-template.md]
    P1_Template --> P1_ReadClar{clarification.md exists?}
    P1_ReadClar -->|Yes| P1_UseClar[Use clarification results<br/>as PRIMARY source]
    P1_ReadClar -->|No| P1_Research[Web search if available]
    P1_UseClar --> P1_Research
    P1_Research --> P1_Create[Create requirements.md<br/>following template structure<br/>保持中文格式和emoji]
    P1_Create --> P1_Approve[approvals action: request<br/>filePath only]
    P1_Approve --> P1_Status[approvals action: status<br/>poll until approved/needs-revision]
    P1_Status --> P1_Check{Status?}
    P1_Check -->|needs-revision| P1_Update[Update document using<br/>user comments as guidance]
    P1_Update --> P1_Create
    P1_Check -->|approved| P1_Clean[approvals action: delete<br/>MUST succeed before proceeding]
    P1_Clean -->|failed| P1_Status

    %% Phase 2: Design (UPDATED)
    P1_Clean -->|success| P2_Template[Check user-templates first,<br/>then read design-template.md]
    P2_Template --> P2_ReadReq[Read approved requirements.md<br/>for context and constraints]
    P2_ReadReq --> P2_Analyze[Analyze codebase patterns]
    P2_Analyze --> P2_Create[Create design.md<br/>following template structure<br/>保持中文格式和emoji]
    P2_Create --> P2_Approve[approvals action: request<br/>filePath only]
    P2_Approve --> P2_Status[approvals action: status<br/>poll until approved/needs-revision]
    P2_Status --> P2_Check{Status?}
    P2_Check -->|needs-revision| P2_Update[Update document using<br/>user comments as guidance]
    P2_Update --> P2_Create
    P2_Check -->|approved| P2_Clean[approvals action: delete<br/>MUST succeed before proceeding]
    P2_Clean -->|failed| P2_Status

    %% Phase 3: Tasks (UPDATED)
    P2_Clean -->|success| P3_Template[Check user-templates first,<br/>then read tasks-template.md]
    P3_Template --> P3_ReadDocs[Read requirements.md and design.md<br/>for complete context]
    P3_ReadDocs --> P3_Break[Convert design to atomic tasks<br/>following template structure]
    P3_Break --> P3_Create[Create tasks.md with _Prompt fields<br/>保持中文格式和emoji]
    P3_Create --> P3_Approve[approvals action: request<br/>filePath only]
    P3_Approve --> P3_Status[approvals action: status<br/>poll until approved/needs-revision]
    P3_Status --> P3_Check{Status?}
    P3_Check -->|needs-revision| P3_Update[Update document using<br/>user comments as guidance]
    P3_Update --> P3_Create
    P3_Check -->|approved| P3_Clean[approvals action: delete<br/>MUST succeed before proceeding]
    P3_Clean -->|failed| P3_Status

    %% Phase 4: Implementation
    P3_Clean -->|success| P4_Ready[Spec complete.<br/>Ready to implement?]
    P4_Ready -->|Yes| P4_Status[spec-status]
    P4_Status --> P4_Task[Edit tasks.md:<br/>Change [ ] to [-]<br/>for in-progress]
    P4_Task --> P4_Code[Implement code]
    P4_Code --> P4_Complete[Edit tasks.md:<br/>Change [-] to [x]<br/>for completed]
    P4_Complete --> P4_More{More tasks?}
    P4_More -->|Yes| P4_Task
    P4_More -->|No| End([Implementation Complete])

    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style P0_Complete fill:#fff4e6
    style P1_Check fill:#ffe6e6
    style P2_Check fill:#ffe6e6
    style P3_Check fill:#ffe6e6
    style CheckSteering fill:#fff4e6
    style CheckClarification fill:#e6f3ff
    style P4_More fill:#fff4e6
\`\`\`

## Spec Workflow

### Phase 0: Requirements Clarification (智能判断是否需要)
**Purpose**: 通过结构化问答确保对需求的深入理解，避免后续返工。

**自动判断标准 - 需要澄清的情况**:
- 用户请求 < 50 个字符
- 缺少技术栈或架构信息
- 没有明确的功能边界或范围
- 包含模糊词汇："一些"、"大概"、"类似"、"简单的"
- 缺少用户角色或使用场景描述
- 没有提及数据结构或业务流程

**跳过澄清的情况**:
- 用户请求 > 200 字符且包含具体细节
- 明确提及技术栈、数据库、API 等
- 包含详细的功能列表或用户故事
- 用户明确说"详细的"、"完整的"、"按照XXX规范"
- 用户说"跳过澄清"或"直接创建需求文档"

**执行流程**:
1. **自动判断**: 分析用户请求，决定是否需要澄清
2. **如果需要澄清**:
   - 调用 \`requirements-clarification\` 工具，action: 'generate'
   - 基于用户请求和项目上下文生成 15-25 个结构化问题
   - 80% 以上使用复选框/单选框格式（便于快速回答）
   - 创建 \`.spec-workflow/specs/{spec-name}/clarification.md\`
   - 通知用户："我已生成澄清问题，请花 2-5 分钟填写以确保需求准确性"
3. **用户填写完成后**:
   - 调用 action: 'check' 检查完成度
   - 如果完成度 >= 80% 且关键问题已回答：调用 action: 'complete'
   - 如果完成度 < 80%：生成 3-5 个补充问题，追加到文档中
4. **如果跳过澄清**: 直接进入 Phase 1

**澄清问题类型示例**:
- 功能范围：☐ 用户注册 ☐ 用户登录 ☐ 密码重置 ☐ 社交登录
- 技术选型：○ React ○ Vue ○ Angular ○ 其他：_____
- 数据存储：☐ 用户信息 ☐ 操作日志 ☐ 文件上传 ☐ 缓存需求
- 性能要求：并发用户数：_____ 响应时间要求：_____ms

**关键原则**:
- 问题基于 AI 智能生成，非模板化
- 优先使用选择题，减少填空题
- 关注业务逻辑、技术约束、用户体验三个维度
- 澄清结果将作为 Phase 1 的主要信息源

### Phase 1: Requirements (需求文档 - 适配中文模板)
**Purpose**: 基于用户需求和澄清结果，定义要构建的功能。

**前置检查顺序**:
1. **澄清结果**: 检查 \`.spec-workflow/specs/{spec-name}/clarification.md\` 是否存在
2. **指导文档**: 检查 \`.spec-workflow/steering/\` 目录（product.md, tech.md, structure.md）
3. **自定义模板**: 检查 \`.spec-workflow/user-templates/requirements-template.md\`
4. **默认模板**: 读取 \`.spec-workflow/templates/requirements-template.md\`

**模板适配要点**:
- **保持中文格式**: 标题、章节名称使用中文
- **保留 emoji 图标**: 🎯 📊 🖱️ 🛡️ ✅ 等
- **遵循章节结构**: 功能概述 → 功能范围 → 视觉呈现 → 数据处理 → 交互操作 → 关键异常 → 验收标准
- **填写具体内容**: 不要保留模板中的占位符和示例文本

**执行步骤**:
1. **读取澄清结果** (如果存在):
   - 澄清结果作为 **主要信息源**
   - 提取已确认的功能点（✓ 标记的选项）
   - 提取技术选型和约束条件
   - 提取用户角色和使用场景

2. **读取模板并理解结构**:
   模板包含以下章节：
   - 需求文档标题和功能名称
   - 功能概述部分
   - 1. 功能范围 🎯
   - 2. 视觉呈现 🎨  
   - 3. 数据处理 📊
   - 4. 交互操作 🖱️
   - 5. 关键异常 🛡️
   - 验收标准 ✅

3. **按章节生成内容**:
   - **功能概述**: 从澄清结果或用户请求中提取核心功能描述
   - **功能范围**: 明确要做和不做的功能（基于澄清的功能选择）
   - **视觉呈现**: 根据 UI 相关澄清填写布局和组件信息
   - **数据处理**: 基于数据流澄清填写 API、字段、状态管理
   - **交互操作**: 根据用户体验澄清填写操作流程和反馈
   - **关键异常**: 基于边界情况澄清填写异常处理
   - **验收标准**: 转换为可测试的验收条件

4. **内容生成原则**:
   - **不添加未确认功能**: 严格基于澄清结果，不要自行扩展
   - **具体化描述**: 避免"等"、"相关"等模糊表述
   - **保持一致性**: 与澄清结果中的技术选型保持一致
   - **标记待确认项**: 对于澄清中未涉及的部分，标记为"待确认"

5. **创建文档**: 在 \`.spec-workflow/specs/{spec-name}/requirements.md\`

6. **请求审批**: 
   - 调用 approvals 工具，action: 'request'
   - 只提供 filePath，不要包含文档内容
   - 轮询审批状态直到 approved 或 needs-revision

7. **处理审批结果**:
   - 如果 needs-revision: 根据用户反馈更新文档，重新请求审批
   - 如果 approved: 调用 action: 'delete' 清理审批记录
   - 删除失败则停止，返回轮询状态

**关键注意事项**:
- **澄清结果优先**: 如果存在 clarification.md，以其为主要依据
- **模板格式严格**: 保持中文标题和 emoji，不要改为英文
- **审批必须**: 绝不接受口头审批，必须通过 Dashboard 或 VS Code 扩展
- **错误处理**: 审批删除失败时必须停止，不能继续下一阶段

### Phase 2: Design (设计文档 - 适配中文模板)
**Purpose**: 基于已审批的需求文档，创建详细的技术设计方案。

**前置依赖**:
- **必须**: requirements.md 已审批通过
- **读取**: 已审批的 requirements.md 获取功能需求和约束
- **模板**: 检查自定义模板或使用默认 design-template.md

**模板适配要点**:
- **保持中文格式**: 所有标题和章节使用中文
- **保留 emoji 图标**: 🏗️ 📱 🔧 📊 🔒 等设计相关图标
- **遵循章节结构**: 按照模板的技术架构、数据设计、接口设计等章节
- **技术选型一致**: 与 requirements.md 中确定的技术栈保持一致

**执行步骤**:
1. **读取需求文档**: 
   - 完整阅读 \`.spec-workflow/specs/{spec-name}/requirements.md\`
   - 提取功能需求、技术约束、性能要求
   - 识别关键的数据流和业务逻辑

2. **读取设计模板**:
   - 检查 \`.spec-workflow/user-templates/design-template.md\`
   - 如无自定义模板，读取 \`.spec-workflow/templates/design-template.md\`
   - 理解模板的章节结构和填写要求

3. **技术分析**:
   - 分析现有代码库的架构模式
   - 识别可复用的组件和工具类
   - 确定技术栈和开发框架

4. **设计内容生成**:
   - **系统架构**: 基于需求设计整体架构
   - **数据设计**: 设计数据库表结构、API 接口
   - **组件设计**: 前端组件结构和状态管理
   - **接口设计**: API 端点、请求响应格式
   - **安全设计**: 权限控制、数据验证
   - **性能设计**: 缓存策略、优化方案

5. **创建设计文档**: 在 \`.spec-workflow/specs/{spec-name}/design.md\`

6. **请求审批和处理**: 
   - 调用 approvals 工具请求审批
   - 轮询状态，处理修订意见
   - 审批通过后清理审批记录

**设计原则**:
- **需求驱动**: 严格基于 requirements.md 的内容进行设计
- **技术可行**: 确保设计方案在技术上可实现
- **扩展性**: 考虑未来功能扩展的可能性
- **一致性**: 与项目现有架构和代码风格保持一致

### Phase 3: Tasks (任务文档 - 适配中文模板)
**Purpose**: 将设计文档分解为可执行的原子化开发任务。

**前置依赖**:
- **必须**: design.md 已审批通过
- **读取**: requirements.md 和 design.md 获取完整上下文
- **模板**: 检查自定义模板或使用默认 tasks-template.md

**模板适配要点**:
- **保持中文格式**: 任务标题、描述使用中文
- **保留 emoji 图标**: 📋 🔧 🎨 📊 等任务相关图标
- **遵循章节结构**: 按照模板的任务分组和优先级结构
- **任务粒度**: 每个任务涉及 1-3 个文件，便于独立完成

**执行步骤**:
1. **读取完整上下文**:
   - 阅读 requirements.md 了解功能需求
   - 阅读 design.md 了解技术方案
   - 理解数据流、组件关系、接口定义

2. **读取任务模板**:
   - 检查 \`.spec-workflow/user-templates/tasks-template.md\`
   - 如无自定义模板，读取 \`.spec-workflow/templates/tasks-template.md\`
   - 理解任务组织结构和字段要求

3. **任务分解原则**:
   - **原子化**: 每个任务独立完成，不依赖其他任务的中间状态
   - **可测试**: 每个任务完成后可以独立验证
   - **有序性**: 按照开发的逻辑顺序排列任务
   - **平衡性**: 任务大小相对均衡，避免过大或过小

4. **任务内容生成**:
   - **任务标题**: 简洁明确的中文描述
   - **任务描述**: 详细说明要实现的功能
   - **文件路径**: 涉及的具体文件列表
   - **依赖关系**: 前置任务和后续任务
   - **验收标准**: 明确的完成标准

5. **重要: _Prompt 字段生成**:
   为每个任务生成结构化的 AI 指导提示，包含以下字段：
   - **_Prompt**: 
   - Role: [专业开发角色，如前端工程师、后端工程师]
   - Task: [清晰的任务描述，包含上下文引用]
   - Restrictions: [不要做什么，遵循什么约束]
   - _Leverage: [要使用的现有文件/工具类]
   - _Requirements: [该任务实现的具体需求点]
   - Success: [具体的完成标准]
   - Instructions: 首先在 tasks.md 中将此任务状态从 [ ] 改为 [-]，完成后改为 [x]
   - 开始提示: "为规格 {spec-name} 实现任务，首先运行 spec-workflow-guide 获取工作流程指导，然后实现任务："

6. **任务状态管理**:
   - \`- [ ]\` = 待开始
   - \`- [-]\` = 进行中  
   - \`- [x]\` = 已完成

7. **创建任务文档**: 在 \`.spec-workflow/specs/{spec-name}/tasks.md\`

8. **请求审批和处理**:
   - 调用 approvals 工具请求审批
   - 轮询状态，处理修订意见
   - 审批通过后清理审批记录
   - 成功后提示: "规格说明创建完成，准备开始实施？"

**任务分组建议**:
- **基础设施**: 项目配置、依赖安装、环境搭建
- **数据层**: 数据库设计、API 接口、数据模型
- **业务逻辑**: 核心功能实现、业务规则
- **用户界面**: 组件开发、页面布局、交互逻辑
- **测试验证**: 单元测试、集成测试、用户验收测试

### Phase 4: Implementation
**Purpose**: Execute tasks systematically.

**File Operations**:
- Read specs: \`.spec-workflow/specs/{spec-name}/*.md\` (if returning to work)
- Edit tasks.md to update status:
  - \`- [ ]\` = Pending task
  - \`- [-]\` = In-progress task
  - \`- [x]\` = Completed task

**Tools**:
- spec-status: Check overall progress
- implement-task prompt: Guide for implementing tasks
- Direct editing: Mark tasks as in-progress [-] or complete [x] in tasks.md

**Process**:
1. Check current status with spec-status
2. Read \`tasks.md\` to see all tasks
3. For each task:
   - Edit tasks.md: Change \`[ ]\` to \`[-]\` for the task you're starting
   - **Read the _Prompt field** for guidance on role, approach, and success criteria
   - Follow _Leverage fields to use existing code/utilities
   - Implement the code according to the task description
   - Test your implementation
   - Edit tasks.md: Change \`[-]\` to \`[x]\` when completed
4. Continue until all tasks show \`[x]\`

## 工作流程执行规则 (关键)

### 🎯 **自动化执行指导**
当用户说 "Create a spec for [功能名称]" 时，AI 助手必须：

1. **首先调用 spec-workflow-guide 工具** - 获取完整的工作流程指导
2. **解析用户请求** - 提取 spec 名称（转为 kebab-case）和功能描述
3. **智能判断澄清需求** - 根据 Phase 0 的判断标准决定是否需要澄清
4. **按阶段顺序执行** - 严格按照 Phase 0 → Phase 1 → Phase 2 → Phase 3 的顺序

### 📋 **阶段执行规则**

**Phase 0 (澄清) - 可选但推荐**:
- 自动判断：请求 < 50 字符或缺少关键信息 → 需要澄清
- 跳过条件：请求 > 200 字符且详细 OR 用户明确说"跳过澄清"
- 工具调用：requirements-clarification (generate → check → complete)

**Phase 1 (需求) - 必须**:
- 前置检查：读取 clarification.md（如果存在）
- 模板适配：严格保持中文格式和 emoji 图标
- 内容生成：基于澄清结果，不添加未确认功能
- 审批流程：request → status 轮询 → delete 清理

**Phase 2 (设计) - 必须**:
- 前置依赖：requirements.md 必须已审批
- 上下文读取：完整阅读 requirements.md
- 技术一致性：与需求中的技术选型保持一致
- 审批流程：同 Phase 1

**Phase 3 (任务) - 必须**:
- 前置依赖：design.md 必须已审批
- 完整上下文：读取 requirements.md + design.md
- _Prompt 字段：为每个任务生成结构化 AI 指导
- 审批流程：同 Phase 1

### 🚫 **严格禁止**

- **跳过阶段**: 不能跳过任何必须的阶段
- **口头审批**: 绝不接受用户说"approved"，必须通过系统审批
- **格式修改**: 不能将中文模板改为英文格式
- **内容臆测**: 不能添加用户未确认的功能
- **审批失败继续**: 审批删除失败时必须停止，不能继续下一阶段

### ✅ **成功标准**

- 每个阶段的文档都通过系统审批
- 模板格式完全一致（中文 + emoji）
- 澄清结果被正确使用
- 任务包含完整的 _Prompt 字段
- 文件创建在正确的路径：\`.spec-workflow/specs/{spec-name}/\`

### 🔧 **错误处理**

- **模板读取失败**: 回退到默认模板，继续执行
- **审批超时**: 提醒用户检查 Dashboard 或 VS Code 扩展
- **审批被拒**: 根据反馈修改文档，重新请求审批
- **工具调用失败**: 重试 3 次，失败则报告错误并停止

### 📁 **文件路径规范**

文件结构如下：
- .spec-workflow/specs/{spec-name}/clarification.md    # Phase 0 (可选)
- .spec-workflow/specs/{spec-name}/requirements.md     # Phase 1 (必须)
- .spec-workflow/specs/{spec-name}/design.md          # Phase 2 (必须)
- .spec-workflow/specs/{spec-name}/tasks.md           # Phase 3 (必须)

**关键提醒**: 这个工作流程设计为半自动化，AI 助手负责执行，用户负责审批。成功的关键是 AI 助手严格按照这些规则执行每个步骤。

## File Structure
\`\`\`
.spec-workflow/
├── templates/           # Auto-populated on server start
│   ├── requirements-template.md
│   ├── design-template.md
│   ├── tasks-template.md
│   ├── product-template.md
│   ├── tech-template.md
│   └── structure-template.md
├── specs/
│   └── {spec-name}/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── steering/
    ├── product.md
    ├── tech.md
    └── structure.md
\`\`\``;
}