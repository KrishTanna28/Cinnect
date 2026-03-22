import React from 'react';

export function MentionText({ text }) {
  if (!text) return null;

  // Split by @username (assuming letters, numbers, underscores)
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('@') && part.length > 1) {
          return (
            <span key={index} className="text-primary font-semibold">
              {part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
