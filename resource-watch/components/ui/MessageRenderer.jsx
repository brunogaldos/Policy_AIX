import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MessageRenderer = ({ message, sender = 'bot', className = '' }) => {
  console.log('🔍 MessageRenderer: Component rendered with message length:', message?.length);
  console.log('🔍 MessageRenderer: Message preview:', message?.substring(0, 200) + '...');

    return (
    <div className={`message-renderer ${className}`}>
      {/* Render all content as markdown */}
      <div className="message-renderer-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message}
        </ReactMarkdown>
      </div>

      <style jsx>{`
        .message-renderer {
          width: 100%;
        }

        .message-renderer-markdown {
          margin-bottom: 0;
        }

        /* Ensure markdown content inherits the parent's color scheme */
        .message-renderer-markdown :global(*) {
          color: inherit;
        }

        .message-renderer-markdown :global(h1),
        .message-renderer-markdown :global(h2),
        .message-renderer-markdown :global(h3),
        .message-renderer-markdown :global(h4),
        .message-renderer-markdown :global(h5),
        .message-renderer-markdown :global(h6) {
          margin: 1.5rem 0 0.5rem 0;
          font-weight: 600;
          color: inherit;
        }

        .message-renderer-markdown :global(h1) { font-size: 1.875rem; }
        .message-renderer-markdown :global(h2) { font-size: 1.5rem; }
        .message-renderer-markdown :global(h3) { font-size: 1.25rem; }
        .message-renderer-markdown :global(h4) { font-size: 1.125rem; }
        .message-renderer-markdown :global(h5) { font-size: 1rem; }
        .message-renderer-markdown :global(h6) { font-size: 0.875rem; }

        .message-renderer-markdown :global(p) {
          margin: 0.75rem 0;
        }

        .message-renderer-markdown :global(ul),
        .message-renderer-markdown :global(ol) {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .message-renderer-markdown :global(li) {
          margin: 0.25rem 0;
        }

        .message-renderer-markdown :global(blockquote) {
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          border-left: 4px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.05);
          font-style: italic;
        }

        .message-renderer-markdown :global(code) {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.125rem 0.25rem;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
        }

        .message-renderer-markdown :global(pre) {
          background: rgba(0, 0, 0, 0.8);
          color: #f9fafb;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .message-renderer-markdown :global(pre code) {
          background: none;
          padding: 0;
          color: inherit;
        }

        .message-renderer-markdown :global(a) {
          color: #3b82f6;
          text-decoration: none;
        }

        .message-renderer-markdown :global(a:hover) {
          text-decoration: underline;
        }

        .message-renderer-markdown :global(table) {
          border-collapse: collapse;
          width: auto;
          min-width: 100%;
          max-width: 100%;
          margin: 1rem 0;
          font-size: 0.875rem;
          overflow-x: auto;
          display: block;
        }

        /* Add a wrapper for table scrolling */
        .message-renderer-markdown :global(.table-wrapper) {
          overflow-x: auto;
          max-width: 100%;
          margin: 1rem 0;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .message-renderer-markdown :global(th),
        .message-renderer-markdown :global(td) {
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.375rem 0.5rem;
          text-align: left;
          white-space: nowrap;
          min-width: 80px;
        }

        .message-renderer-markdown :global(th) {
          background: rgba(255, 255, 255, 0.1);
          font-weight: 600;
        }

        .message-renderer-markdown :global(tr:nth-child(even)) {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

MessageRenderer.propTypes = {
  message: PropTypes.string.isRequired,
  sender: PropTypes.oneOf(['user', 'assistant', 'system', 'bot']),
  className: PropTypes.string
};

export default MessageRenderer;
