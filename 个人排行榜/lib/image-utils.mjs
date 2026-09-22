export function nameFromFilename(filename) {
  const base = String(filename || "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+(?:cover|poster|final|thumb|image)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base || "未命名";
}

export async function createThumbnail(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("只支持常见图片格式");
  }

  const bitmap = await createImageBitmap(file);
  const width = 300;
  const height = 400;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理这张图片");

  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  context.drawImage(
    bitmap,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("图片压缩失败")),
      "image/webp",
      0.86,
    );
  });

  return {
    blob,
    name: nameFromFilename(file.name),
  };
}

