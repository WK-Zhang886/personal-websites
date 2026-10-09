export function createWriteQueue() {
  let pending = Promise.resolve();
  return {
    enqueue(write) {
      const result = pending.then(write);
      pending = result.catch(() => {});
      return result;
    },
    flush() { return pending; },
  };
}
