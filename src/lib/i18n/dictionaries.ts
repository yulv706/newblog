import type { AppLocale, NavLinkKey } from "./config";

export type AppDictionary = {
  shell: {
    siteTitle: string;
    navigation: {
      links: Record<NavLinkKey, string>;
      mainAriaLabel: string;
      mobileAriaLabel: string;
      searchAriaLabel: string;
      drawerAriaLabel: string;
      openMenuAriaLabel: string;
      closeMenuAriaLabel: string;
    };
    languageSwitcher: {
      ariaLabel: string;
      switchTo: Record<AppLocale, string>;
      pendingLabel: string;
    };
    themeToggle: {
      placeholderAriaLabel: string;
      switchToLightAriaLabel: string;
      switchToDarkAriaLabel: string;
    };
    footer: {
      copyrightTemplate: string;
      socialLinksAriaLabel: string;
    };
  };
  public: {
    common: {
      allLabel: string;
      uncategorizedLabel: string;
      noCoverImageLabel: string;
      dateFallbackLabel: string;
    };
    home: {
      featuredEyebrow: string;
      title: string;
      description: string;
      featuredEmpty: string;
      latestHeading: string;
      latestDescription: string;
      latestEmpty: string;
      categoriesHeading: string;
      categoriesEmpty: string;
    };
    blog: {
      title: string;
      description: string;
      categoriesHeading: string;
      tagsHeading: string;
      emptyTitle: string;
      emptyDescription: string;
      clearFiltersButton: string;
      previousPageLabel: string;
      nextPageLabel: string;
      pageIndicatorTemplate: string;
    };
    search: {
      title: string;
      description: string;
      inputLabel: string;
      inputPlaceholder: string;
      submitButton: string;
      emptyTitle: string;
      emptyDescription: string;
      enterKeywordPrompt: string;
      recentPostsHeading: string;
      resultSummarySingularTemplate: string;
      resultSummaryPluralTemplate: string;
    };
    about: {
      title: string;
      description: string;
    };
    post: {
      coverImageAltTemplate: string;
      commentsCountSingularTemplate: string;
      commentsCountPluralTemplate: string;
      tableOfContents: {
        title: string;
        ariaLabel: string;
        showButton: string;
        hideButton: string;
      };
      codeBlock: {
        copyButton: string;
        copiedButton: string;
        failedButton: string;
      };
      pagination: {
        ariaLabel: string;
        previousPostLabel: string;
        nextPostLabel: string;
      };
      comments: {
        heading: string;
        approvedSummarySingularTemplate: string;
        approvedSummaryPluralTemplate: string;
        moderationHint: string;
        emptyState: string;
        unknownDateLabel: string;
        form: {
          nicknameLabel: string;
          emailLabel: string;
          bodyLabel: string;
          submitButton: string;
          submittingButton: string;
          messages: {
            success: string;
            retry: string;
            invalidPost: string;
            onlyPublished: string;
            nicknameRequired: string;
            emailRequired: string;
            emailInvalid: string;
            bodyRequired: string;
            bodyTooLongTemplate: string;
          };
        };
      };
    };
  };
};

const dictionaries: Record<AppLocale, AppDictionary> = {
  "zh-CN": {
    shell: {
      siteTitle: "技术博客",
      navigation: {
        links: {
          home: "首页",
          blog: "博客",
          about: "关于",
        },
        mainAriaLabel: "主导航",
        mobileAriaLabel: "移动端导航",
        searchAriaLabel: "搜索",
        drawerAriaLabel: "导航菜单",
        openMenuAriaLabel: "打开菜单",
        closeMenuAriaLabel: "关闭菜单",
      },
      languageSwitcher: {
        ariaLabel: "切换语言",
        switchTo: {
          "zh-CN": "EN",
          en: "中文",
        },
        pendingLabel: "切换中",
      },
      themeToggle: {
        placeholderAriaLabel: "切换主题",
        switchToLightAriaLabel: "切换到浅色模式",
        switchToDarkAriaLabel: "切换到深色模式",
      },
      footer: {
        copyrightTemplate: "© {year} 技术博客。保留所有权利。",
        socialLinksAriaLabel: "社交链接",
      },
    },
    public: {
      common: {
        allLabel: "全部",
        uncategorizedLabel: "未分类",
        noCoverImageLabel: "暂无封面图",
        dateFallbackLabel: "—",
      },
      home: {
        featuredEyebrow: "精选文章",
        title: "现代 Web 工程洞察",
        description:
          "聚焦 Next.js、TypeScript、后端架构与生产级应用实践经验。",
        featuredEmpty: "暂无已发布文章。",
        latestHeading: "最新文章",
        latestDescription: "最新的实战技巧、深度解析与实现细节。",
        latestEmpty: "更多文章即将发布。",
        categoriesHeading: "浏览分类",
        categoriesEmpty: "暂无可用分类。",
      },
      blog: {
        title: "博客",
        description: "浏览所有已发布文章，并按分类或标签筛选。",
        categoriesHeading: "分类",
        tagsHeading: "标签",
        emptyTitle: "未找到文章。",
        emptyDescription: "尝试调整筛选条件查看更多内容。",
        clearFiltersButton: "清除所有筛选",
        previousPageLabel: "上一页",
        nextPageLabel: "下一页",
        pageIndicatorTemplate: "第 {current} / {total} 页",
      },
      search: {
        title: "搜索",
        description: "按标题或内容搜索已发布文章，支持中文和英文关键词。",
        inputLabel: "搜索文章",
        inputPlaceholder: "试试：Next.js、React、深入理解…",
        submitButton: "搜索",
        emptyTitle: "未找到文章。",
        emptyDescription: "试试其他关键词或检查拼写。",
        enterKeywordPrompt: "输入关键词以搜索文章标题和内容。",
        recentPostsHeading: "最新文章",
        resultSummarySingularTemplate: "找到 {count} 条与“{query}”相关的结果。",
        resultSummaryPluralTemplate: "找到 {count} 条与“{query}”相关的结果。",
      },
      about: {
        title: "关于",
        description: "了解作者背景、关注领域与写作方向。",
      },
      post: {
        coverImageAltTemplate: "{title} 封面图",
        commentsCountSingularTemplate: "{count} 条评论",
        commentsCountPluralTemplate: "{count} 条评论",
        tableOfContents: {
          title: "目录",
          ariaLabel: "文章目录",
          showButton: "显示",
          hideButton: "隐藏",
        },
        codeBlock: {
          copyButton: "复制",
          copiedButton: "已复制",
          failedButton: "失败",
        },
        pagination: {
          ariaLabel: "文章导航",
          previousPostLabel: "上一篇",
          nextPostLabel: "下一篇",
        },
        comments: {
          heading: "评论",
          approvedSummarySingularTemplate: "已有 {count} 条已审核评论",
          approvedSummaryPluralTemplate: "已有 {count} 条已审核评论",
          moderationHint: "评论经审核后公开显示。",
          emptyState: "暂无已审核评论，欢迎抢先留言。",
          unknownDateLabel: "未知时间",
          form: {
            nicknameLabel: "昵称",
            emailLabel: "邮箱",
            bodyLabel: "评论内容",
            submitButton: "提交评论",
            submittingButton: "提交中...",
            messages: {
              success: "感谢留言！评论审核后会显示。",
              retry: "请修正高亮字段后重试。",
              invalidPost: "无法为该文章提交评论。",
              onlyPublished: "仅已发布文章可评论。",
              nicknameRequired: "请输入昵称。",
              emailRequired: "请输入邮箱。",
              emailInvalid: "请输入有效的邮箱地址。",
              bodyRequired: "请输入评论内容。",
              bodyTooLongTemplate: "评论内容需不超过 {max} 个字符。",
            },
          },
        },
      },
    },
  },
  en: {
    shell: {
      siteTitle: "Tech Blog",
      navigation: {
        links: {
          home: "Home",
          blog: "Blog",
          about: "About",
        },
        mainAriaLabel: "Main navigation",
        mobileAriaLabel: "Mobile navigation",
        searchAriaLabel: "Search",
        drawerAriaLabel: "Navigation menu",
        openMenuAriaLabel: "Open menu",
        closeMenuAriaLabel: "Close menu",
      },
      languageSwitcher: {
        ariaLabel: "Switch language",
        switchTo: {
          "zh-CN": "EN",
          en: "中文",
        },
        pendingLabel: "Switching",
      },
      themeToggle: {
        placeholderAriaLabel: "Toggle theme",
        switchToLightAriaLabel: "Switch to light mode",
        switchToDarkAriaLabel: "Switch to dark mode",
      },
      footer: {
        copyrightTemplate: "© {year} Tech Blog. All rights reserved.",
        socialLinksAriaLabel: "Social links",
      },
    },
    public: {
      common: {
        allLabel: "All",
        uncategorizedLabel: "Uncategorized",
        noCoverImageLabel: "No Cover Image",
        dateFallbackLabel: "—",
      },
      home: {
        featuredEyebrow: "Featured",
        title: "Insights on modern web engineering",
        description:
          "Latest writing on Next.js, TypeScript, backend architecture, and practical lessons from building production apps.",
        featuredEmpty: "No published posts yet.",
        latestHeading: "Latest Posts",
        latestDescription:
          "Fresh articles with practical tips, deep dives, and implementation details.",
        latestEmpty: "More posts are coming soon.",
        categoriesHeading: "Browse Categories",
        categoriesEmpty: "No categories available yet.",
      },
      blog: {
        title: "Blog",
        description:
          "Browse all published posts, then narrow results by category or tag.",
        categoriesHeading: "Categories",
        tagsHeading: "Tags",
        emptyTitle: "No posts found.",
        emptyDescription: "Try adjusting filters to see more articles.",
        clearFiltersButton: "Clear all filters",
        previousPageLabel: "Previous",
        nextPageLabel: "Next",
        pageIndicatorTemplate: "Page {current} of {total}",
      },
      search: {
        title: "Search",
        description:
          "Search published posts by title or content. English and Chinese keywords are supported.",
        inputLabel: "Search posts",
        inputPlaceholder: "Try: Next.js, React, 深入理解...",
        submitButton: "Search",
        emptyTitle: "No posts found.",
        emptyDescription: "Try another keyword or check your spelling.",
        enterKeywordPrompt: "Enter a keyword to search post titles and content.",
        recentPostsHeading: "Recent Posts",
        resultSummarySingularTemplate:
          "Found {count} result for “{query}”.",
        resultSummaryPluralTemplate:
          "Found {count} results for “{query}”.",
      },
      about: {
        title: "About",
        description:
          "Learn more about the author behind this blog and current writing focus.",
      },
      post: {
        coverImageAltTemplate: "{title} cover image",
        commentsCountSingularTemplate: "{count} comment",
        commentsCountPluralTemplate: "{count} comments",
        tableOfContents: {
          title: "Table of Contents",
          ariaLabel: "Table of contents",
          showButton: "Show",
          hideButton: "Hide",
        },
        codeBlock: {
          copyButton: "Copy",
          copiedButton: "Copied",
          failedButton: "Failed",
        },
        pagination: {
          ariaLabel: "Post navigation",
          previousPostLabel: "Previous post",
          nextPostLabel: "Next post",
        },
        comments: {
          heading: "Comments",
          approvedSummarySingularTemplate: "{count} approved comment",
          approvedSummaryPluralTemplate: "{count} approved comments",
          moderationHint: "Comments are moderated before they appear publicly.",
          emptyState: "No approved comments yet. Be the first to share your thoughts.",
          unknownDateLabel: "Unknown date",
          form: {
            nicknameLabel: "Nickname",
            emailLabel: "Email",
            bodyLabel: "Comment",
            submitButton: "Submit comment",
            submittingButton: "Submitting...",
            messages: {
              success: "Thanks! Your comment is pending approval.",
              retry: "Please fix the highlighted fields.",
              invalidPost: "Unable to submit comment for this post.",
              onlyPublished: "Comments can only be submitted to published posts.",
              nicknameRequired: "Nickname is required.",
              emailRequired: "Email is required.",
              emailInvalid: "Please enter a valid email address.",
              bodyRequired: "Comment body is required.",
              bodyTooLongTemplate:
                "Comment must be {max} characters or fewer.",
            },
          },
        },
      },
    },
  },
};

export function getDictionary(locale: AppLocale) {
  return dictionaries[locale];
}
