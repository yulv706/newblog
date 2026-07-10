import type { AppLocale } from "@/lib/i18n/config";

export type ReadingStatus = "reading" | "finished" | "queued";

type LocalizedText = Record<AppLocale, string>;

export type ReadingBookAnnotation = {
  id: string;
  type: "highlight" | "review";
  content: LocalizedText;
  thought?: LocalizedText;
  chapterTitle?: string;
  createdAt?: string;
};

export type ReadingBook = {
  id: string;
  title: string;
  author: string;
  year: number;
  pages: number;
  wordCount?: number;
  coverUrl?: string;
  category: LocalizedText;
  status: ReadingStatus;
  progress: number;
  rating?: number;
  finishedAt?: string;
  readUpdatedAt?: string;
  syncedAt?: string;
  noteCount?: number;
  readingSeconds?: number;
  deepLink?: string;
  note: LocalizedText;
  takeaway: LocalizedText;
  quote: LocalizedText;
  annotations?: ReadingBookAnnotation[];
  cover: {
    background: string;
    spine: string;
    foreground: string;
    label: string;
  };
};

export const READING_BOOKS: ReadingBook[] = [
  {
    id: "ddia",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    year: 2017,
    pages: 616,
    category: {
      "zh-CN": "系统设计",
      en: "Systems",
    },
    status: "reading",
    progress: 62,
    note: {
      "zh-CN": "适合反复读。它把存储、复制、流处理这些工程问题放回可靠性和演化能力里讨论。",
      en: "Worth rereading. It connects storage, replication, and streaming back to reliability and evolvability.",
    },
    takeaway: {
      "zh-CN": "好的系统不是堆功能，而是明确接受哪些失败模式。",
      en: "Good systems are defined by the failure modes they consciously accept.",
    },
    quote: {
      "zh-CN": "数据系统的价值，往往藏在边界条件和恢复路径里。",
      en: "A data system's value often sits in its edge cases and recovery paths.",
    },
    cover: {
      background: "linear-gradient(140deg, #eaf2f1 0%, #9fb8b4 52%, #23424a 100%)",
      spine: "#17353d",
      foreground: "#10242a",
      label: "DATA",
    },
  },
  {
    id: "zhishen-shinei",
    title: "置身事内",
    author: "兰小欢",
    year: 2021,
    pages: 340,
    category: {
      "zh-CN": "经济与社会",
      en: "Economy",
    },
    status: "reading",
    progress: 38,
    note: {
      "zh-CN": "用清楚的财政和地方政府视角解释很多宏观现象，读起来不虚。",
      en: "Explains macro patterns through fiscal and local-government incentives without becoming abstract.",
    },
    takeaway: {
      "zh-CN": "理解现实，要先理解约束、激励和可执行路径。",
      en: "To understand reality, start with constraints, incentives, and executable paths.",
    },
    quote: {
      "zh-CN": "看见制度如何落到具体人和具体账本上，很多判断会变得冷静。",
      en: "Judgment gets calmer when institutions are traced down to people and ledgers.",
    },
    cover: {
      background: "linear-gradient(140deg, #f5ead9 0%, #d4a86f 48%, #733f26 100%)",
      spine: "#65361e",
      foreground: "#2f2118",
      label: "FIELD",
    },
  },
  {
    id: "systems-thinking",
    title: "系统之美",
    author: "Donella H. Meadows",
    year: 2008,
    pages: 290,
    category: {
      "zh-CN": "思维模型",
      en: "Models",
    },
    status: "queued",
    progress: 0,
    note: {
      "zh-CN": "准备作为系统设计之外的补充阅读，重点看反馈、延迟和杠杆点。",
      en: "Queued as a complement to software systems, especially feedback, delay, and leverage points.",
    },
    takeaway: {
      "zh-CN": "复杂问题通常不能只靠局部优化解决。",
      en: "Complex problems rarely yield to local optimization alone.",
    },
    quote: {
      "zh-CN": "系统的行为，常常比系统里的单个角色更诚实。",
      en: "A system's behavior is often more honest than any single actor inside it.",
    },
    cover: {
      background: "linear-gradient(140deg, #eef0e3 0%, #a8b86f 45%, #35513b 100%)",
      spine: "#284331",
      foreground: "#1f3025",
      label: "LOOPS",
    },
  },
  {
    id: "the-mom-test",
    title: "The Mom Test",
    author: "Rob Fitzpatrick",
    year: 2013,
    pages: 136,
    category: {
      "zh-CN": "产品判断",
      en: "Product",
    },
    status: "finished",
    progress: 100,
    rating: 4.5,
    finishedAt: "2026-04-18",
    note: {
      "zh-CN": "短小但密度很高。它提醒人不要问会得到客套答案的问题。",
      en: "Short and dense. It keeps you from asking questions that only invite polite answers.",
    },
    takeaway: {
      "zh-CN": "验证需求时，问过去事实，不问未来承诺。",
      en: "Validate demand by asking about past facts, not future promises.",
    },
    quote: {
      "zh-CN": "真正有用的访谈，会让对方讲最近一次具体经历。",
      en: "Useful interviews pull out the last concrete instance.",
    },
    cover: {
      background: "linear-gradient(140deg, #f8ecec 0%, #de8f8b 48%, #7b3144 100%)",
      spine: "#69273a",
      foreground: "#351620",
      label: "ASK",
    },
  },
  {
    id: "navalmanack",
    title: "纳瓦尔宝典",
    author: "Eric Jorgenson",
    year: 2020,
    pages: 242,
    category: {
      "zh-CN": "人生策略",
      en: "Strategy",
    },
    status: "finished",
    progress: 100,
    rating: 4,
    finishedAt: "2026-03-02",
    note: {
      "zh-CN": "观点很锋利，适合摘句子，但更需要拿自己的生活经验过滤。",
      en: "Sharp and quotable, but best filtered through your own lived experience.",
    },
    takeaway: {
      "zh-CN": "复利不只属于钱，也属于能力、信誉和关系。",
      en: "Compounding applies to skill, reputation, and relationships, not only money.",
    },
    quote: {
      "zh-CN": "把判断力、杠杆和长期主义放在一起看，很多选择会变简单。",
      en: "Choices simplify when judgment, leverage, and long horizons are considered together.",
    },
    cover: {
      background: "linear-gradient(140deg, #efeaf7 0%, #b5a0d6 48%, #3d2b63 100%)",
      spine: "#312252",
      foreground: "#211739",
      label: "NAVAL",
    },
  },
  {
    id: "courage-to-be-disliked",
    title: "被讨厌的勇气",
    author: "岸见一郎、古贺史健",
    year: 2013,
    pages: 272,
    category: {
      "zh-CN": "心理与关系",
      en: "Psychology",
    },
    status: "finished",
    progress: 100,
    rating: 4,
    finishedAt: "2026-01-21",
    note: {
      "zh-CN": "对课题分离的讨论很有用，适合作为处理评价焦虑的提醒。",
      en: "The separation-of-tasks framing is a useful reminder when dealing with evaluation anxiety.",
    },
    takeaway: {
      "zh-CN": "不把别人的课题背到自己身上，是一种边界能力。",
      en: "Not carrying another person's task is a boundary skill.",
    },
    quote: {
      "zh-CN": "自由不是被所有人认可，而是能承受不被认可。",
      en: "Freedom is not universal approval; it is the capacity to live without it.",
    },
    cover: {
      background: "linear-gradient(140deg, #e8eef8 0%, #8fa7d8 50%, #25476c 100%)",
      spine: "#1f3b5b",
      foreground: "#172a42",
      label: "SELF",
    },
  },
];

export function getReadingStats(books: ReadingBook[] = READING_BOOKS) {
  return {
    total: books.length,
    reading: books.filter((book) => book.status === "reading").length,
    finished: books.filter((book) => book.status === "finished").length,
    queued: books.filter((book) => book.status === "queued").length,
    notes: books.filter(
      (book) => book.quote["zh-CN"].trim() || (book.noteCount ?? 0) > 0
    ).length,
  };
}

export function getBooksByStatus(
  status: ReadingStatus,
  books: ReadingBook[] = READING_BOOKS
) {
  return books.filter((book) => book.status === status);
}

export function getBookCategories(locale: AppLocale, books: ReadingBook[] = READING_BOOKS) {
  return Array.from(new Set(books.map((book) => book.category[locale]))).sort((left, right) =>
    left.localeCompare(right)
  );
}

export function getRecentBookNotes(books: ReadingBook[] = READING_BOOKS, limit = 3) {
  return books
    .filter((book) => book.quote["zh-CN"].trim())
    .slice(0, Math.max(1, limit));
}
