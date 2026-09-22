"use client";

import { useRef } from "react";

const DRAG_DISTANCE = 6;

function getDropIndex(lane, clientX, clientY, draggedId) {
  const cards = Array.from(lane.querySelectorAll(".rank-card")).filter(
    (card) => card.dataset.itemId !== draggedId,
  );

  for (let index = 0; index < cards.length; index += 1) {
    const rect = cards[index].getBoundingClientRect();
    const isSameRow = clientY >= rect.top && clientY <= rect.bottom;
    const beforeRow = clientY < rect.top + rect.height / 2;
    const beforeCard = isSameRow && clientX < rect.left + rect.width / 2;
    if (beforeRow || beforeCard) return index;
  }

  return cards.length;
}

function getLaneAtPoint(clientX, clientY) {
  return document.elementFromPoint(clientX, clientY)?.closest(".item-lane");
}

function createDragPreview(card, clientX, clientY) {
  const rect = card.getBoundingClientRect();
  const preview = card.cloneNode(true);

  preview.classList.add("rank-card-drag-preview");
  preview.style.width = `${rect.width}px`;
  preview.style.height = `${rect.height}px`;
  preview.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
  document.body.appendChild(preview);

  return {
    node: preview,
    offsetX: clientX - rect.left,
    offsetY: clientY - rect.top,
  };
}

function moveDragPreview(preview, clientX, clientY) {
  if (!preview?.node) return;
  preview.node.style.transform = `translate3d(${clientX - preview.offsetX}px, ${clientY - preview.offsetY}px, 0)`;
}

export function SortableLane({ containerId, children, onMove, className = "" }) {
  const dragState = useRef(null);

  const clearDrag = () => {
    if (dragState.current?.card) {
      dragState.current.card.classList.remove("rank-card--dragging");
    }
    dragState.current?.preview?.node.remove();
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", clearDrag);
    dragState.current = null;
  };

  const handlePointerMove = (event) => {
    const state = dragState.current;
    if (!state) return;

    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (!state.dragging && distance >= DRAG_DISTANCE) {
      state.dragging = true;
      state.card.classList.add("rank-card--dragging");
      state.preview = createDragPreview(state.card, event.clientX, event.clientY);
    }
    if (state.dragging) {
      event.preventDefault();
      moveDragPreview(state.preview, event.clientX, event.clientY);
    }
  };

  const handlePointerUp = (event) => {
    const state = dragState.current;
    if (!state) return;

    if (state.dragging) {
      event.preventDefault();
      const targetLane = getLaneAtPoint(event.clientX, event.clientY);
      const targetId = targetLane?.dataset.containerId;
      if (targetLane && targetId) {
        onMove(
          state.itemId,
          state.fromId,
          targetId,
          getDropIndex(targetLane, event.clientX, event.clientY, state.itemId),
        );
      }
    }

    clearDrag();
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".card-action, input, button, select, textarea")) return;

    const card = event.target.closest(".rank-card");
    const itemId = card?.dataset.itemId;
    if (!card || !itemId) return;

    dragState.current = {
      card,
      dragging: false,
      fromId: containerId,
      itemId,
      startX: event.clientX,
      startY: event.clientY,
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", clearDrag);
  };

  return (
    <div
      className={`item-lane ${className}`}
      data-container-id={containerId}
      onPointerDown={handlePointerDown}
    >
      {children}
    </div>
  );
}
