---
name: remote-code
description: Managing remote Blackbox AI agent tasks via API - creating single or multi-agent tasks, monitoring status, streaming logs, and canceling tasks. Use when users request task creation, status checks, log streaming, or task management operations on the Blackbox cloud platform.
homepage: https://blackbox.ai
metadata:
        {
           "openclaw":
                   {
                      "emoji": "⬛",
                      "requires": { "bins": ["curl", "jq"] },
                      "env": ["BLACKBOX_API_KEY"]
                   },
        }
---

# Remote Task Management

Manage Blackbox AI agent tasks remotely via the cloud API. This skill provides comprehensive task lifecycle management including creation, monitoring, log streaming, and cancellation.

## When to Use

Use this skill when users request:

- **Task Creation**: Creating single-agent or multi-agent tasks on remote repositories
- **Task Monitoring**: Checking task status, progress, or completion
- **Log Streaming**: Real-time monitoring of task execution logs
- **Task Management**: Listing, filtering, or canceling tasks
- **Batch Operations**: Managing multiple tasks or comparing agent approaches
- **Keywords**: "create remote task", "check task status", "stream logs", "cancel task", "multi-agent task", "list my tasks"

## Prerequisites

1. **API Key**: Set `BLACKBOX_API_KEY` environment variable with your Blackbox API token
   - Get from: cloud.blackbox.ai → Profile → BLACKBOX API Token
   - Format: `bb_xxxxxxxxxxxxxxxxxxxxxx`

2. **Dependencies**: `curl` and `jq` must be installed

3. **GitHub Connection** (optional): For repository-based tasks, connect GitHub at cloud.blackbox.ai

## Instructions

### 1. Creating a Single Agent Task

Use the `create-task` script to create a task with one AI agent:

```bash
./scripts/create-task <prompt> [repo_url] [branch] [agent] [model]
```

**Parameters:**
- `prompt` (required): Task description
- `repo_url` (optional): GitHub repository URL
- `branch` (optional): Branch name (default: main)
- `agent` (optional): Agent type - `blackbox`, `claude`, `codex`, `gemini` (default: blackbox)
- `model` (optional): Specific model (default: blackbox-pro)

**Available Models (as of Feb 2026):**

**Blackbox Agent:**
- `blackbox-pro` (default)
- `claude-sonnet-4.5`
- `gpt-5.2-codex`
- `claude-opus-4.5`
- `grok-code-fast-1:free`
- `gemini-2.5-pro`

**Claude Agent:**
- `blackboxai/anthropic/claude-sonnet-4.5` (default)
- `blackboxai/anthropic/claude-sonnet-4`
- `blackboxai/anthropic/claude-opus-4.5`

**Codex Agent:**
- `gpt-5.2-codex` (default)
- `gpt-5-codex`
- `gpt-5-mini`
- `gpt-5-nano`
- `gpt-4.1`

**Gemini Agent:**
- `gemini-2.0-flash-exp` (default)
- `gemini-2.5-pro`
- `gemini-2.5-flash`

**Example:**
```bash
export BLACKBOX_API_KEY="bb_your_api_key"
./scripts/create-task "Add Stripe payment integration" \
  "https://github.com/user/repo.git" \
  "main" \
  "claude" \
  "blackboxai/anthropic/claude-sonnet-4.5"
```

### 2. Creating a Multi-Agent Task

Use the `create-multi-agent-task` script to run multiple agents simultaneously:

```bash
./scripts/create-multi-agent-task <prompt> <agents_json> [repo_url] [branch]
```

**Parameters:**
- `prompt` (required): Task description
- `agents_json` (required): JSON array of agent configurations (2-5 agents)
- `repo_url` (optional): GitHub repository URL
- `branch` (optional): Branch name (default: main)

**Example:**
```bash
./scripts/create-multi-agent-task "Add README in French" \
  '[{"agent":"claude","model":"blackboxai/anthropic/claude-sonnet-4.5"},{"agent":"blackbox","model":"blackboxai/blackbox-pro"}]' \
  "https://github.com/user/repo.git" \
  "main"
```

### 3. Listing Tasks

Use the `list-tasks` script to retrieve tasks with filtering:

```bash
./scripts/list-tasks [limit] [offset] [filter] [status]
```

**Parameters:**
- `limit` (optional): Tasks per page, 1-100 (default: 50)
- `offset` (optional): Skip N tasks for pagination (default: 0)
- `filter` (optional): `all`, `tasks`, `batch` (default: all)
- `status` (optional): `active`, `completed`, `failed`, `stopped`

**Examples:**
```bash
# Get first 10 tasks
./scripts/list-tasks 10

# Get active tasks only
./scripts/list-tasks 50 0 all active

# Get second page of completed tasks
./scripts/list-tasks 50 50 all completed
```

### 4. Checking Task Status

Use the `get-task-status` script to check a specific task:

```bash
./scripts/get-task-status <task_id>
```

**Example:**
```bash
./scripts/get-task-status 9qQe2F8Z_nXx9-eJA0BD6
```

**Status Values:**
- `pending`: Queued, waiting to start
- `processing`: Currently executing
- `saving`: Saving changes
- `completed`: Finished successfully
- `error`: Failed with error
- `stopped`: Manually stopped
- `timeout`: Exceeded maximum duration

### 5. Streaming Task Logs

Use the `stream-logs` script for real-time log monitoring:

```bash
./scripts/stream-logs <task_id> [from_index] [include_status]
```

**Parameters:**
- `task_id` (required): Task identifier
- `from_index` (optional): Start from log index (default: 0)
- `include_status` (optional): Include status updates every 2s (default: true)

**Example:**
```bash
./scripts/stream-logs 9qQe2F8Z_nXx9-eJA0BD6 0 true
```

### 6. Waiting for Task Completion

Use the `wait-for-task` script to poll until completion:

```bash
./scripts/wait-for-task <task_id> [poll_interval]
```

**Parameters:**
- `task_id` (required): Task identifier
- `poll_interval` (optional): Seconds between polls (default: 2)

**Example:**
```bash
./scripts/wait-for-task 9qQe2F8Z_nXx9-eJA0BD6 3
```

### 7. Canceling a Task

Use the `cancel-task` script to stop a running task:

```bash
./scripts/cancel-task <task_id>
```

**Example:**
```bash
./scripts/cancel-task 9qQe2F8Z_nXx9-eJA0BD6
```

**Note:** Only tasks in `processing` or `saving` status can be canceled.

## Output Format

All scripts output JSON responses. Key fields include:

**Task Creation Response:**
```json
{
  "task": {
    "id": "task_id",
    "status": "pending",
    "progress": 0,
    "taskUrl": "https://cloud.blackbox.ai/tasks/task_id"
  }
}
```

**Task Status Response:**
```json
{
  "taskId": "task_id",
  "status": "processing",
  "progress": 45,
  "inProgress": true,
  "isDone": false,
  "error": null
}
```

**Task List Response:**
```json
{
  "tasks": [...],
  "hasMore": true,
  "offset": 0,
  "limit": 50
}
```

## Examples

### Example 1: Create and Monitor Task

```bash
# Create task
RESPONSE=$(./scripts/create-task "Add unit tests" "https://github.com/user/repo.git")
TASK_ID=$(echo "$RESPONSE" | jq -r '.task.id')

# Wait for completion
./scripts/wait-for-task "$TASK_ID"
```

### Example 2: Multi-Agent Comparison

```bash
# Create multi-agent task
./scripts/create-multi-agent-task "Optimize database queries" \
  '[{"agent":"claude","model":"blackboxai/anthropic/claude-opus-4.5"},{"agent":"codex","model":"gpt-5.2-codex"},{"agent":"gemini","model":"gemini-2.5-pro"}]' \
  "https://github.com/user/repo.git"
```

### Example 3: Monitor Active Tasks

```bash
# List all active tasks
./scripts/list-tasks 100 0 all active

# Stream logs for specific task
./scripts/stream-logs 9qQe2F8Z_nXx9-eJA0BD6
```

### Example 4: Task Management Workflow

```bash
# Create task
TASK_ID=$(./scripts/create-task "Add feature X" | jq -r '.task.id')

# Check status periodically
./scripts/get-task-status "$TASK_ID"

# Cancel if needed
./scripts/cancel-task "$TASK_ID"
```

## Notes

### Best Practices

1. **Polling Intervals**: Use 2-5 second intervals to avoid rate limiting
2. **Multi-Agent Tasks**: Use 2-3 agents for most tasks, up to 5 for critical comparisons
3. **Error Handling**: Always check response status codes and error fields
4. **API Key Security**: Never commit API keys; use environment variables
5. **Task URLs**: Save task URLs from creation response for web dashboard access

### Error Handling

Common error codes:
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid API key)
- `402`: Payment Required (insufficient credits)
- `403`: Forbidden (not a team member)
- `404`: Not Found (task or GitHub token not found)
- `500`: Internal Server Error
- `502`: Bad Gateway (GitHub API error)

### Limitations

- Multi-agent tasks require 2-5 agents minimum
- Only active tasks (`processing`, `saving`) can be canceled
- Stopped tasks cannot be resumed
- Repository tasks require GitHub connection at cloud.blackbox.ai

### Performance Tips

- Use `wait-for-task` for automated workflows instead of manual polling
- Stream logs only when debugging; use status checks for monitoring
- Filter task lists by status to reduce response size
- Use exponential backoff for production polling implementations

## Related Documentation

- API Reference: https://docs.blackbox.ai/api-reference
- Task Dashboard: https://cloud.blackbox.ai/tasks
- API Token Management: https://cloud.blackbox.ai (Profile → BLACKBOX API Token)
