"use client";

import { useRef } from "react";

const DRAG_DISTANCE = 6;
const EDGE_SCROLL_ZONE = 64;
const EDGE_SCROLL_MAX_SPEED = 14;

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

function createDropIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "rank-drop-indicator";
  document.body.appendChild(indicator);
  return indicator;
}

function updateDropIndicator(state, clientX, clientY) {
  const targetLane = getLaneAtPoint(clientX, clientY);
  if (state.activeLane && state.activeLane !== targetLane) {
    state.activeLane.classList.remove("item-lane--drag-target");
  }
  state.activeLane = targetLane || null;
  if (!targetLane || targetLane.hidden) {
    if (state.indicator) state.indicator.style.opacity = "0";
    return;
  }
  targetLane.classList.add("item-lane--drag-target");
  if (!state.indicator) state.indicator = createDropIndicator();

  const cards = Array.from(targetLane.querySelectorAll(".rank-card")).filter(
    (card) => card.dataset.itemId !== state.itemId,
  );
  const dropIndex = getDropIndex(targetLane, clientX, clientY, state.itemId);
  let x;
  let y;
  let height;

  if (!cards.length) {
    const laneRect = targetLane.getBoundingClientRect();
    x = laneRect.left + 10;
    y = laneRect.top + 8;
    height = Math.max(48, Math.min(116, laneRect.height - 16));
  } else if (dropIndex < cards.length) {
    const rect = cards[dropIndex].getBoundingClientRect();
    x = rect.left - 5;
    y = rect.top;
    height = rect.height;
  } else {
    const rect = cards[cards.length - 1].getBoundingClientRect();
    x = rect.right + 3;
    y = rect.top;
    height = rect.height;
  }

  state.indicator.style.opacity = "1";
  state.indicator.style.height = `${height}px`;
  state.indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

export function SortableLane({ containerId, children, onMove, className = "", disabled = false, id, hidden = false }) {
  const dragState = useRef(null);

  const stopAutoScroll = (state) => {
    if (state?.scrollRaf) {
      cancelAnimationFrame(state.scrollRaf);
      state.scrollRaf = 0;
    }
  };

  const clearDrag = () => {
    const state = dragState.current;
    stopAutoScroll(state);
    if (state?.card) {
      state.card.classList.remove("rank-card--dragging");
    }
    if (state?.activeLane) {
      state.activeLane.classList.remove("item-lane--drag-target");
    }
    state?.preview?.node.remove();
    state?.indicator?.remove();
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", clearDrag);
    dragState.current = null;
  };

  const runAutoScroll = () => {
    const state = dragState.current;
    if (!state?.dragging) {
      stopAutoScroll(state);
      return;
    }
    const scroller = document.querySelector(".board-scroll");
    if (scroller && scroller.scrollHeight > scroller.clientHeight) {
      const rect = scroller.getBoundingClientRect();
      let delta = 0;
      if (state.lastY < rect.top + EDGE_SCROLL_ZONE) {
        const ratio = Math.min(1, (rect.top + EDGE_SCROLL_ZONE - state.lastY) / EDGE_SCROLL_ZONE);
        delta = -Math.ceil(ratio * EDGE_SCROLL_MAX_SPEED);
      } else if (state.lastY > rect.bottom - EDGE_SCROLL_ZONE) {
        const ratio = Math.min(1, (state.lastY - (rect.bottom - EDGE_SCROLL_ZONE)) / EDGE_SCROLL_ZONE);
        delta = Math.ceil(ratio * EDGE_SCROLL_MAX_SPEED);
      }
      if (delta !== 0) {
        scroller.scrollTop += delta;
        updateDropIndicator(state, state.lastX, state.lastY);
      }
    }
    state.scrollRaf = requestAnimationFrame(runAutoScroll);
  };

  const handlePointerMove = (event) => {
    const state = dragState.current;
    if (!state) return;

    state.lastX = event.clientX;
    state.lastY = event.clientY;
    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (!state.dragging && distance >= DRAG_DISTANCE) {
      state.dragging = true;
      state.card.classList.add("rank-card--dragging");
      state.preview = createDragPreview(state.card, event.clientX, event.clientY);
      if (!state.scrollRaf) state.scrollRaf = requestAnimationFrame(runAutoScroll);
    }
    if (state.dragging) {
      event.preventDefault();
      moveDragPreview(state.preview, event.clientX, event.clientY);
      updateDropIndicator(state, event.clientX, event.clientY);
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
    if (disabled) return;
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
      lastX: event.clientX,
      lastY: event.clientY,
      activeLane: null,
      indicator: null,
      scrollRaf: 0,
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", clearDrag);
  };

  return (
    <div
      className={`item-lane ${className}`}
      id={id}
      hidden={hidden}
      data-container-id={containerId}
      onPointerDown={handlePointerDown}
    >
      {children}
    </div>
  );
}
