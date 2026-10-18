import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { buildMessageDocument } from './tempEmailUtils';

const MESSAGE_MIN_HEIGHT = 56;
const MESSAGE_MAX_HEIGHT = 640;

// The email on a white "paper" card. The iframe has no scripts; the page reads #mp-root to fit its height.
// Used by the Temp .edu Email page and the admin Temp Emails page
const MessageFrame: React.FC<{ body: string }> = ({ body }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MESSAGE_MIN_HEIGHT);
  const [isMeasured, setIsMeasured] = useState(false);
  const srcDoc = useMemo(() => buildMessageDocument(body), [body]);

  const measure = useCallback(() => {
    try {
      const doc = frameRef.current?.contentDocument;
      const root = doc?.getElementById('mp-root');
      if (!doc || !root) return;
      // Wide newsletters get a horizontal scrollbar at the bottom
      const scrollbar = doc.documentElement.scrollWidth > doc.documentElement.clientWidth ? 16 : 0;
      const contentHeight = Math.ceil(root.getBoundingClientRect().height) + scrollbar;
      setHeight(Math.min(Math.max(contentHeight, MESSAGE_MIN_HEIGHT), MESSAGE_MAX_HEIGHT));
      setIsMeasured(true);
    } catch {
      // A link opened inside the frame: it is another origin now, keep the current height
      setIsMeasured(true);
    }
  }, []);

  useEffect(() => {
    setIsMeasured(false);
    // In case the load event fired before React attached the handler
    const timer = window.setTimeout(measure, 300);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [srcDoc, measure]);

  return (
    <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/30 ring-1 ring-black/5 overflow-hidden">
      {!isMeasured && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
      <iframe
        ref={frameRef}
        title="Message content"
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={measure}
        style={{ height }}
        className="block w-full border-0 bg-white"
      />
    </div>
  );
};

export default MessageFrame;
