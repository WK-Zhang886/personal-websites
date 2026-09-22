const BACKUP_KIND = "personal-tier-list-backup";
const BACKUP_VERSION = 1;

export function createBackupEnvelope(boards, images, now = () =>
  new Date().toISOString()) {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: now(),
    boards,
    images,
  };
}

export function validateBackupEnvelope(value) {
  if (!value || value.kind !== BACKUP_KIND) {
    throw new Error("这不是有效的个人评分备份。");
  }
  if (value.version !== BACKUP_VERSION) {
    throw new Error("暂不支持这个备份版本。");
  }
  if (!Array.isArray(value.boards) || !Array.isArray(value.images)) {
    throw new Error("备份内容不完整。");
  }
  return value;
}

