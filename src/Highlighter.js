import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useHighlights } from './HighlightContext';

const COLORS = ['#ff6b6b', '#ffd166', '#6ee7b7', '#60a5fa', '#a78bfa', '#f472b6'];

export default function Highlighter() {
  const { addHighlight } = useHighlights();
  const [selectionData, setSelectionData] = useState(null);

  const toolbarStyle = useMemo(() => {
    if (!selectionData?.rect) return {};
    return {
      top: selectionData.rect.top + selectionData.rect.height + 8,
      left: selectionData.rect.left + selectionData.rect.width / 2
    };
  }, [selectionData]);

  const resetSelection = () => {
    setSelectionData(null);
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  };

  const applyUnderline = (range, color) => {
    try {
      const span = document.createElement('span');
      span.className = 'hl-underline';
      span.style.backgroundColor = `${color}33`; // ~20% opacity
      span.style.boxShadow = `0 -2px 0 ${color} inset`;
      span.style.borderRadius = '2px';
      span.style.padding = '0 1px';
      range.surroundContents(span);
    } catch (e) {
      // Se falhar (seleção cruzando blocos), ignoramos o underline visual imediato.
    }
  };

  const saveHighlight = (color) => {
    if (!selectionData) return;
    const { text, cardId, cardTitle, cardUrl, page, range } = selectionData;
    addHighlight({
      text,
      color,
      cardId,
      cardTitle,
      cardUrl,
      page,
      createdAt: new Date().toISOString()
    });
    if (range) applyUnderline(range, color);
    resetSelection();
  };

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionData(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text || text.length < 2) {
        setSelectionData(null);
        return;
      }
      let range = null;
      try {
        range = sel.getRangeAt(0).cloneRange();
      } catch (e) {
        setSelectionData(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const node = range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      const cardEl = node ? node.closest('[data-card-id], [data-context-id]') : null;
      const cardId = cardEl?.dataset.cardId || cardEl?.dataset.contextId || 'page';
      const cardTitle = cardEl?.dataset.cardTitle || cardEl?.dataset.contextTitle || '';
      const cardUrl = cardEl?.dataset.cardUrl || cardEl?.dataset.contextUrl || '';
      setSelectionData({
        text,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        cardId,
        cardTitle,
        cardUrl,
        page: window.location.pathname,
        range
      });
    };

    const onMouseUp = () => setTimeout(handleSelection, 10);
    const onKeyUp = () => setTimeout(handleSelection, 10);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  if (!selectionData) return null;

  return ReactDOM.createPortal(
    (
      <div
        className="hl-toolbar"
        style={{ top: toolbarStyle.top, left: toolbarStyle.left }}
        role="menu"
      >
        <div className="hl-toolbar-title">Sublinhar</div>
        <div className="hl-toolbar-colors">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="hl-color"
              style={{ backgroundColor: color }}
              onClick={() => saveHighlight(color)}
              aria-label={`Sublinhar em ${color}`}
            />
          ))}
        </div>
        <button type="button" className="hl-close" onClick={resetSelection} aria-label="Cancelar">
          ×
        </button>
      </div>
    ),
    document.body
  );
}
