export type ReadingMetrics = {
  minutes: number;
  cjkCharacters: number;
  words: number;
};

function markdownToReadableText(markdown: string) {
  return markdown
    .replace(/^---[\s\S]*?---\s*/u, " ")
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/<[^>]+>/gu, " ")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gmu, "")
    .replace(/[|*_~]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function getReadingMetrics(markdown: string): ReadingMetrics {
  const readableText = markdownToReadableText(markdown);
  const cjkCharacters = readableText.match(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
  )?.length ?? 0;
  const nonCjkText = readableText.replace(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    " "
  );
  const words = nonCjkText.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  const minutes = Math.max(1, Math.ceil(cjkCharacters / 400 + words / 220));

  return {
    minutes,
    cjkCharacters,
    words,
  };
}
