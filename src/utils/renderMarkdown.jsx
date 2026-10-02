export function processBold(text) {
  if (typeof text !== 'string') return text;
  const parts = text.split(/\*\*(.*?)\*\*/);
  if (parts.length === 1) return text;
  return parts.map((part, index) => (
    index % 2 === 1
      ? <strong key={index} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part}</strong>
      : part
  ));
}

export function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let keyCounter = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`ul-${keyCounter++}`} style={{ margin: '6px 0 8px 0', paddingLeft: '18px' }}>
        {listItems.map((item, index) => (
          <li
            key={index}
            style={{
              marginBottom: '3px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const bulletMatch = line.match(/^\s*[\*-]\s+(.*)/);
    if (bulletMatch) {
      listItems.push(processBold(bulletMatch[1]));
      return;
    }

    flushList();
    if (line.trim()) {
      elements.push(
        <p
          key={`p-${keyCounter++}`}
          style={{
            margin: '0 0 8px 0',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          {processBold(line)}
        </p>
      );
    }
  });

  flushList();
  return <>{elements}</>;
}
