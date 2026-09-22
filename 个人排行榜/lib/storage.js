"use client";

import { openDB } from "idb";

const DB_NAME = "personal-tier-list";
const DB_VERSION = 1;

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
  const db = await database();
  const boards = await db.getAll("boards");
  return boards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveBoard(board) {
  const db = await database();
  await db.put("boards", board);
  return board;
}

export async function removeBoard(id) {
  const db = await database();
  await db.delete("boards", id);
}

export async function putImage(id, blob) {
  const db = await database();
  await db.put("images", { id, blob, type: blob.type || "image/webp" });
}

export async function getImage(id) {
  const db = await database();
  return db.get("images", id);
}

export async function listImages() {
  const db = await database();
  return db.getAll("images");
}

export async function replaceEverything(boards, images) {
  const db = await database();
  const tx = db.transaction(["boards", "images"], "readwrite");
  await Promise.all([
    tx.objectStore("boards").clear(),
    tx.objectStore("images").clear(),
  ]);
  for (const board of boards) await tx.objectStore("boards").put(board);
  for (const image of images) await tx.objectStore("images").put(image);
  await tx.done;
}

