"use client";

import { openDB } from "idb";
import { applyRequestedLegacyIcon } from "./board-icons.mjs";
import { createWriteQueue } from "./storage-write-queue.mjs";

const DB_NAME = "personal-tier-list";
const DB_VERSION = 1;
const writes = createWriteQueue();

export function flushWrites() { return writes.flush(); }

function database() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("boards")) {
        db.createObjectStore("boards", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id" });
      }
    },
  });
}

export async function listBoards() {
  await flushWrites();
  const db = await database();
  const boards = await db.getAll("boards");
  const migrated = boards.map(applyRequestedLegacyIcon);
  const changes = migrated.filter((board, index) => board !== boards[index]);
  if (changes.length) {
    await saveBoards(changes);
  }
  return migrated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveBoard(board) {
  return writes.enqueue(async () => {
    const db = await database();
    await db.put("boards", board);
    return board;
  });
}

export function saveBoards(boards) {
  return writes.enqueue(async () => {
    const db = await database();
    const tx = db.transaction("boards", "readwrite");
    await Promise.all(boards.map((board) => tx.store.put(board)));
    await tx.done;
  });
}

export async function removeBoard(id) {
  return writes.enqueue(async () => {
    const db = await database();
    await db.delete("boards", id);
  });
}

export async function putImage(id, blob) {
  return writes.enqueue(async () => {
    const db = await database();
    await db.put("images", { id, blob, type: blob.type || "image/webp" });
  });
}

export async function getImage(id) {
  const db = await database();
  return db.get("images", id);
}

export async function listImages() {
  await flushWrites();
  const db = await database();
  return db.getAll("images");
}

export async function replaceEverything(boards, images) {
  return writes.enqueue(async () => {
  const db = await database();
  const tx = db.transaction(["boards", "images"], "readwrite");
  await Promise.all([
    tx.objectStore("boards").clear(),
    tx.objectStore("images").clear(),
  ]);
  for (const board of boards) await tx.objectStore("boards").put(board);
  for (const image of images) await tx.objectStore("images").put(image);
  await tx.done;
  });
}
