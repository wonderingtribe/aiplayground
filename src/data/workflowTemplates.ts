export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  nodes: {
    id: string;
    type: string;
    label: string;
    category: string;
    x: number;
    y: number;
    config?: Record<string, any>;
  }[];
  connections: {
    id: string;
    fromId: string;
    toId: string;
    fromPort?: string;
  }[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    description: 'Manual trigger → Code node → Done',
    nodeCount: 2,
    nodes: [
      { id: 'tpl_trigger', type: 'manual', label: 'Manual Trigger', category: 'trigger', x: 100, y: 200 },
      { id: 'tpl_code', type: 'code', label: 'Log Hello', category: 'core', x: 400, y: 200, config: { code: 'return "Hello, World!";' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_code' }
    ]
  },
  {
    id: 'http-to-log',
    name: 'HTTP GET → Log',
    description: 'Manual trigger → HTTP GET request → Code node logs the response',
    nodeCount: 3,
    nodes: [
      { id: 'tpl_trigger', type: 'manual', label: 'Manual Trigger', category: 'trigger', x: 100, y: 200 },
      { id: 'tpl_http', type: 'http', label: 'Fetch Data', category: 'app', x: 350, y: 200, config: { httpUrl: 'https://jsonplaceholder.typicode.com/todos/1', httpMethod: 'GET' } },
      { id: 'tpl_code', type: 'code', label: 'Log Response', category: 'core', x: 600, y: 200, config: { code: 'const data = JSON.parse($input);\n$console.log("Title:", data.title);\nreturn `Fetched: ${data.title}`;' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_http' },
      { id: 'tpl_conn_2', fromId: 'tpl_http', toId: 'tpl_code' }
    ]
  },
  {
    id: 'ai-analyze',
    name: 'AI Analyze & Route',
    description: 'Trigger → AI agent analyzes input → IF route based on sentiment',
    nodeCount: 4,
    nodes: [
      { id: 'tpl_trigger', type: 'manual', label: 'Manual Trigger', category: 'trigger', x: 100, y: 200 },
      { id: 'tpl_ai', type: 'agent', label: 'AI Analyze', category: 'ai', x: 350, y: 200, config: { model: 'gemini-3-flash-preview', systemPrompt: 'Analyze the sentiment of the input text. Respond with only "positive" or "negative".', temperature: 0.3 } },
      { id: 'tpl_if', type: 'if', label: 'Sentiment Check', category: 'core', x: 600, y: 200, config: { conditionOperator: 'contains', conditionLeft: '$input', conditionRight: 'positive' } },
      { id: 'tpl_code_positive', type: 'code', label: 'Positive Path', category: 'core', x: 850, y: 150, config: { code: 'return "✅ Positive sentiment detected!\\nInput: " + $input;' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_ai' },
      { id: 'tpl_conn_2', fromId: 'tpl_ai', toId: 'tpl_if' },
      { id: 'tpl_conn_3', fromId: 'tpl_if', toId: 'tpl_code_positive', fromPort: 'true' }
    ]
  },
  {
    id: 'http-transform-post',
    name: 'HTTP Transform & Forward',
    description: 'Trigger → HTTP GET → Code transform → HTTP POST result',
    nodeCount: 4,
    nodes: [
      { id: 'tpl_trigger', type: 'manual', label: 'Manual Trigger', category: 'trigger', x: 100, y: 200 },
      { id: 'tpl_http_get', type: 'http', label: 'GET Data', category: 'app', x: 350, y: 200, config: { httpUrl: 'https://jsonplaceholder.typicode.com/posts/1', httpMethod: 'GET' } },
      { id: 'tpl_code_transform', type: 'code', label: 'Transform', category: 'core', x: 600, y: 200, config: { code: 'const data = JSON.parse($input);\nreturn JSON.stringify({\n  title: data.title?.toUpperCase(),\n  body: data.body,\n  transformed: true\n}, null, 2);' } },
      { id: 'tpl_http_post', type: 'http', label: 'POST Result', category: 'app', x: 850, y: 200, config: { httpUrl: 'https://jsonplaceholder.typicode.com/posts', httpMethod: 'POST', httpHeaders: '{"Content-Type": "application/json"}', httpBody: '{{ $input }}' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_http_get' },
      { id: 'tpl_conn_2', fromId: 'tpl_http_get', toId: 'tpl_code_transform' },
      { id: 'tpl_conn_3', fromId: 'tpl_code_transform', toId: 'tpl_http_post' }
    ]
  },
  {
    id: 'schedule-ai-summary',
    name: 'Schedule → AI → Notify',
    description: 'Schedule trigger → AI summarizes → HTTP POST notification',
    nodeCount: 3,
    nodes: [
      { id: 'tpl_trigger', type: 'schedule', label: 'Every Hour', category: 'trigger', x: 100, y: 200, config: { scheduleInterval: 'every_hour' } },
      { id: 'tpl_ai', type: 'agent', label: 'Generate Summary', category: 'ai', x: 350, y: 200, config: { model: 'gemini-3-flash-preview', systemPrompt: 'Generate a brief summary of current system status. Keep it under 50 words.', temperature: 0.7 } },
      { id: 'tpl_http', type: 'http', label: 'Post to Webhook', category: 'app', x: 600, y: 200, config: { httpUrl: 'https://hooks.example.com/notify', httpMethod: 'POST', httpHeaders: '{"Content-Type": "application/json"}' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_ai' },
      { id: 'tpl_conn_2', fromId: 'tpl_ai', toId: 'tpl_http' }
    ]
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline (Fan-out)',
    description: 'Trigger → Split array → HTTP per item → Merge results',
    nodeCount: 5,
    nodes: [
      { id: 'tpl_trigger', type: 'manual', label: 'Manual Trigger', category: 'trigger', x: 100, y: 200 },
      { id: 'tpl_code_gen', type: 'code', label: 'Generate IDs', category: 'core', x: 300, y: 200, config: { code: 'return JSON.stringify([1, 2, 3]);' } },
      { id: 'tpl_split', type: 'split', label: 'Split Items', category: 'core', x: 500, y: 200, config: { splitMode: 'first' } },
      { id: 'tpl_http_fetch', type: 'http', label: 'Fetch Each', category: 'app', x: 700, y: 200, config: { httpUrl: 'https://jsonplaceholder.typicode.com/todos/1', httpMethod: 'GET' } },
      { id: 'tpl_merge', type: 'merge', label: 'Merge Results', category: 'core', x: 900, y: 200, config: { mergeMode: 'array' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_code_gen' },
      { id: 'tpl_conn_2', fromId: 'tpl_code_gen', toId: 'tpl_split' },
      { id: 'tpl_conn_3', fromId: 'tpl_split', toId: 'tpl_http_fetch' },
      { id: 'tpl_conn_4', fromId: 'tpl_http_fetch', toId: 'tpl_merge' }
    ]
  },
  {
    id: 'loop-example',
    name: 'For Loop Example',
    description: 'Trigger → For loop that iterates 5 times → Code logs each item',
    nodeCount: 3,
    nodes: [
      { id: 'tpl_trigger', type: 'manual', label: 'Manual Trigger', category: 'trigger', x: 100, y: 200 },
      { id: 'tpl_loop', type: 'loop_for', label: 'Loop 1-5', category: 'core', x: 350, y: 200, config: { loopItems: '[1, 2, 3, 4, 5]', loopVarName: 'num' } },
      { id: 'tpl_code', type: 'code', label: 'Log Item', category: 'core', x: 600, y: 200, config: { code: 'const items = JSON.parse($input);\n$console.log("Processing", items.length, "items");\nreturn items.map(i => `Item: ${i}`).join("\\n");' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_loop' },
      { id: 'tpl_conn_2', fromId: 'tpl_loop', toId: 'tpl_code' }
    ]
  },
  {
    id: 'if-else-branch',
    name: 'IF/Else Branch Demo',
    description: 'Trigger → Code generates value → IF routes to different paths',
    nodeCount: 5,
    nodes: [
      { id: 'tpl_trigger', type: 'manual', label: 'Manual Trigger', category: 'trigger', x: 100, y: 200 },
      { id: 'tpl_code_gen', type: 'code', label: 'Random Value', category: 'core', x: 300, y: 200, config: { code: 'const val = Math.floor(Math.random() * 100);\nreturn JSON.stringify(val);' } },
      { id: 'tpl_if', type: 'if', label: 'Value > 50?', category: 'core', x: 500, y: 200, config: { conditionOperator: 'greater_than', conditionLeft: '$input', conditionRight: '50' } },
      { id: 'tpl_code_high', type: 'code', label: 'High Path', category: 'core', x: 720, y: 140, config: { code: 'return "🔺 High value: " + $input;' } },
      { id: 'tpl_code_low', type: 'code', label: 'Low Path', category: 'core', x: 720, y: 280, config: { code: 'return "🔻 Low value: " + $input;' } }
    ],
    connections: [
      { id: 'tpl_conn_1', fromId: 'tpl_trigger', toId: 'tpl_code_gen' },
      { id: 'tpl_conn_2', fromId: 'tpl_code_gen', toId: 'tpl_if' },
      { id: 'tpl_conn_3', fromId: 'tpl_if', toId: 'tpl_code_high', fromPort: 'true' },
      { id: 'tpl_conn_4', fromId: 'tpl_if', toId: 'tpl_code_low', fromPort: 'false' }
    ]
  }
];
