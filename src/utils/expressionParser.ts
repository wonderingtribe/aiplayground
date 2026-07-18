export interface ExpressionContext {
  $node: Record<string, { data: any; output: string }>;
  $json: any;
  $items: any[];
  $index: number;
  $now: string;
  $today: string;
}

export function resolveExpressions(template: string, ctx: ExpressionContext): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expr: string) => {
    try {
      return evaluateExpression(expr.trim(), ctx);
    } catch (e) {
      return `{{ERROR: ${expr} (${e})}}`;
    }
  });
}

export function resolveConfig(config: Record<string, any>, ctx: ExpressionContext): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      result[key] = resolveExpressions(value, ctx);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = resolveConfig(value, ctx);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function evaluateExpression(expr: string, ctx: ExpressionContext): string {
  // Handle simple variable references
  if (expr === '$now') return ctx.$now;
  if (expr === '$today') return ctx.$today;
  if (expr === '$json') return typeof ctx.$json === 'string' ? ctx.$json : JSON.stringify(ctx.$json);
  if (expr === '$items') return JSON.stringify(ctx.$items);
  if (expr === '$index') return String(ctx.$index);

  // Handle $node references: $node["Name"].data or $node["Name"].data.property
  const nodeMatch = expr.match(/^\$node\["([^"]+)"\]\.data(?:\s*\.\s*(.+))?$/);
  if (nodeMatch) {
    const nodeName = nodeMatch[1];
    const propPath = nodeMatch[2];
    const nodeCtx = ctx.$node[nodeName];
    if (!nodeCtx) return `[node "${nodeName}" not found]`;

    let value: any;
    try { value = JSON.parse(nodeCtx.output); } catch { value = nodeCtx.output; }

    if (propPath) {
      const parts = propPath.split('.').map(p => p.trim());
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          return `[property "${part}" not found]`;
        }
      }
    }

    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  // Try evaluating as JS expression with context variables
  try {
    const result = new Function(
      '$json', '$items', '$index', '$now', '$today',
      `return (${expr});`
    )(ctx.$json, ctx.$items, ctx.$index, ctx.$now, ctx.$today);
    return result === undefined || result === null ? '' : String(result);
  } catch (e) {
    return `[invalid expression: ${expr} (${e})]`;
  }
}
