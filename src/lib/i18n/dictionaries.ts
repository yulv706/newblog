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
  admin: {
    login: {
      title: string;
      description: string;
      usernameLabel: string;
      passwordLabel: string;
      submitButton: string;
      submittingButton: string;
      errors: {
        requiredCredentials: string;
        usernameRequired: string;
        passwordRequired: string;
        invalidCredentials: string;
      };
    };
    sidebar: {
      title: string;
      logoutButton: string;
    };
    dashboard: {
      title: string;
      description: string;
      stats: {
        totalPostsLabel: string;
        totalPostsHelper: string;
        publishedPostsLabel: string;
        publishedPostsHelper: string;
        totalCommentsLabel: string;
        totalCommentsHelper: string;
        pendingCommentsLabel: string;
        pendingCommentsHelper: string;
      };
      emptyStateTitle: string;
      emptyStateDescription: string;
      quickActionsHeading: string;
      quickActions: {
        newPostLabel: string;
        newPostDescription: string;
        viewBlogLabel: string;
        viewBlogDescription: string;
        manageCommentsLabel: string;
        manageCommentsDescription: string;
      };
    };
    posts: {
      title: string;
      description: string;
      sortNewest: string;
      sortOldest: string;
      sortButtonTemplate: string;
      newPostButton: string;
      emptyTitle: string;
      emptyDescription: string;
      table: {
        titleColumn: string;
        statusColumn: string;
        categoryColumn: string;
        dateColumn: string;
        actionsColumn: string;
      };
      status: {
        draft: string;
        published: string;
      };
      uncategorizedLabel: string;
      actions: {
        edit: string;
        moveToDraft: string;
        publish: string;
        delete: string;
        deleteConfirmTemplate: string;
      };
      editor: {
        newTitle: string;
        editTitle: string;
        newDescription: string;
        editDescription: string;
        markdownUploadHeading: string;
        markdownUploadDescription: string;
        parsingLabel: string;
        onlyMarkdownFiles: string;
        unableToReadFile: string;
        loadedMarkdownTemplate: string;
        detectedLocalImageReferencesTemplate: string;
        noLocalImageReferencesDetected: string;
        titleLabel: string;
        slugLabel: string;
        categoryLabel: string;
        statusLabel: string;
        dateLabel: string;
        datePlaceholder: string;
        tagsLabel: string;
        tagsHelper: string;
        noTagsLabel: string;
        tagsPlaceholder: string;
        addTagButton: string;
        removeTagAriaTemplate: string;
        coverImageLabel: string;
        coverImagePlaceholder: string;
        excerptLabel: string;
        localImagesHeading: string;
        noImageFilesSelected: string;
        selectedImageFilesTemplate: string;
        uploadImagesButton: string;
        uploadingImagesButton: string;
        selectImagesFirst: string;
        uploadMarkdownFirst: string;
        noImageReferencesDetected: string;
        noReferencesRewritten: string;
        rewroteAllReferencesTemplate: string;
        rewrotePartialReferencesTemplate: string;
        contentLabel: string;
        previewHeading: string;
        previewError: string;
        createButton: string;
        creatingButton: string;
        saveButton: string;
        savingButton: string;
      };
    };
    categories: {
      title: string;
      description: string;
      createHeading: string;
      createForm: {
        nameLabel: string;
        namePlaceholder: string;
        autoSlugLabel: string;
        createButton: string;
        creatingButton: string;
        errors: {
          nameRequired: string;
          createFailed: string;
        };
        successTemplate: string;
      };
      categoriesHeading: string;
      categoriesDescription: string;
      tagsHeading: string;
      tagsDescription: string;
      emptyCategories: string;
      emptyTags: string;
      table: {
        nameColumn: string;
        slugColumn: string;
        postsColumn: string;
        actionsColumn: string;
      };
      actions: {
        delete: string;
        inUse: string;
      };
    };
    comments: {
      title: string;
      description: string;
      pendingQueueTemplate: string;
      emptyPendingTitle: string;
      emptyPendingDescription: string;
      onPostLabel: string;
      submittedTemplate: string;
      approveButton: string;
      deleteButton: string;
      approvedHeading: string;
      approvedDescription: string;
      emptyApproved: string;
      approvedCommentTemplate: string;
    };
    about: {
      title: string;
      description: string;
      contentLabel: string;
      previewHeading: string;
      previewError: string;
      saveButton: string;
      savingButton: string;
      messages: {
        invalidPayload: string;
        saveSuccess: string;
      };
    };
    messages: {
      titleRequired: string;
      slugRequired: string;
      contentRequired: string;
      invalidPostId: string;
      postNotFound: string;
      uploadMarkdownFirst: string;
      noImageReferencesDetected: string;
      selectImagesFirst: string;
      parseFrontmatterFailed: string;
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
    admin: {
      login: {
        title: "后台登录",
        description: "登录以访问管理后台。",
        usernameLabel: "用户名",
        passwordLabel: "密码",
        submitButton: "登录",
        submittingButton: "登录中...",
        errors: {
          requiredCredentials: "请输入用户名和密码。",
          usernameRequired: "请输入用户名。",
          passwordRequired: "请输入密码。",
          invalidCredentials: "用户名或密码错误。",
        },
      },
      sidebar: {
        title: "后台",
        logoutButton: "退出登录",
      },
      dashboard: {
        title: "仪表盘",
        description: "快速查看博客内容与待审核事项。",
        stats: {
          totalPostsLabel: "文章总数",
          totalPostsHelper: "草稿与已发布",
          publishedPostsLabel: "已发布文章",
          publishedPostsHelper: "前台可见",
          totalCommentsLabel: "评论总数",
          totalCommentsHelper: "待审核与已审核",
          pendingCommentsLabel: "待审核评论",
          pendingCommentsHelper: "等待处理",
        },
        emptyStateTitle: "暂无数据",
        emptyStateDescription: "创建第一篇文章后，这里会显示最新统计。",
        quickActionsHeading: "快捷操作",
        quickActions: {
          newPostLabel: "新建文章",
          newPostDescription: "进入文章编辑区并开始写作。",
          viewBlogLabel: "查看博客",
          viewBlogDescription: "打开前台博客并预览已发布内容。",
          manageCommentsLabel: "管理评论",
          manageCommentsDescription: "审核并处理新的评论。",
        },
      },
      posts: {
        title: "文章管理",
        description: "管理文章元数据、发布状态与删除操作。",
        sortNewest: "最新优先",
        sortOldest: "最旧优先",
        sortButtonTemplate: "按日期排序：{label}",
        newPostButton: "新建文章",
        emptyTitle: "还没有文章",
        emptyDescription: "创建第一篇文章后即可开始发布内容。",
        table: {
          titleColumn: "标题",
          statusColumn: "状态",
          categoryColumn: "分类",
          dateColumn: "日期",
          actionsColumn: "操作",
        },
        status: {
          draft: "草稿",
          published: "已发布",
        },
        uncategorizedLabel: "未分类",
        actions: {
          edit: "编辑",
          moveToDraft: "转为草稿",
          publish: "发布",
          delete: "删除",
          deleteConfirmTemplate: "确定删除“{title}”吗？此操作无法撤销。",
        },
        editor: {
          newTitle: "新建文章",
          editTitle: "编辑文章",
          newDescription: "在发布前编写并预览 Markdown 内容。",
          editDescription: "更新文章并保存你的修改。",
          markdownUploadHeading: "Markdown 上传",
          markdownUploadDescription: "将 `.md` 文件拖放到这里，或手动选择文件。",
          parsingLabel: "正在解析 Markdown…",
          onlyMarkdownFiles: "仅支持 .md 文件。",
          unableToReadFile: "无法读取 Markdown 文件。",
          loadedMarkdownTemplate: "已从 {fileName} 载入 Markdown。",
          detectedLocalImageReferencesTemplate: "检测到 {count} 个本地图片引用。",
          noLocalImageReferencesDetected: "未检测到本地图片引用。",
          titleLabel: "标题",
          slugLabel: "Slug",
          categoryLabel: "分类",
          statusLabel: "状态",
          dateLabel: "日期",
          datePlaceholder: "2026-03-30",
          tagsLabel: "标签",
          tagsHelper: "输入后按 Enter 添加",
          noTagsLabel: "暂未添加标签。",
          tagsPlaceholder: "react, typescript, nextjs",
          addTagButton: "添加标签",
          removeTagAriaTemplate: "移除标签 {tag}",
          coverImageLabel: "封面图 URL",
          coverImagePlaceholder: "https://example.com/cover.jpg",
          excerptLabel: "摘要",
          localImagesHeading: "检测到的本地图片",
          noImageFilesSelected: "尚未选择图片文件",
          selectedImageFilesTemplate: "已选择 {count} 个图片文件",
          uploadImagesButton: "上传图片并重写路径",
          uploadingImagesButton: "上传中...",
          selectImagesFirst: "请先选择要上传的图片文件。",
          uploadMarkdownFirst: "请先上传 Markdown 文件。",
          noImageReferencesDetected: "当前 Markdown 内容中未检测到本地图片引用。",
          noReferencesRewritten: "没有匹配到可重写的本地图片引用。",
          rewroteAllReferencesTemplate: "已上传并重写 {count} 个图片引用。",
          rewrotePartialReferencesTemplate: "已上传并重写 {replaced} 个图片引用，仍有 {unmatched} 个引用未匹配。",
          contentLabel: "内容（Markdown）",
          previewHeading: "预览",
          previewError: "无法渲染 Markdown 预览。",
          createButton: "创建文章",
          creatingButton: "创建中...",
          saveButton: "保存修改",
          savingButton: "保存中...",
        },
      },
      categories: {
        title: "分类与标签",
        description: "创建分类、查看使用情况，并清理未使用的标签。",
        createHeading: "创建分类",
        createForm: {
          nameLabel: "分类名称",
          namePlaceholder: "前端开发",
          autoSlugLabel: "自动生成的 Slug",
          createButton: "创建分类",
          creatingButton: "创建中...",
          errors: {
            nameRequired: "请输入分类名称。",
            createFailed: "无法创建分类。",
          },
          successTemplate: "已创建分类“{name}”（{slug}）。",
        },
        categoriesHeading: "分类",
        categoriesDescription: "删除分类不会删除文章，只会将文章标记为未分类。",
        tagsHeading: "标签",
        tagsDescription: "标签会在文章编辑器中创建。这里只能删除未被使用的标签。",
        emptyCategories: "还没有分类。",
        emptyTags: "还没有标签。",
        table: {
          nameColumn: "名称",
          slugColumn: "Slug",
          postsColumn: "文章数",
          actionsColumn: "操作",
        },
        actions: {
          delete: "删除",
          inUse: "使用中",
        },
      },
      comments: {
        title: "评论管理",
        description: "审核待处理评论，并决定哪些内容会显示在前台文章页。",
        pendingQueueTemplate: "待审核队列：{count}",
        emptyPendingTitle: "已全部处理完成",
        emptyPendingDescription: "当前没有待审核评论。",
        onPostLabel: "文章",
        submittedTemplate: "提交于 {date}",
        approveButton: "通过",
        deleteButton: "删除",
        approvedHeading: "已审核评论",
        approvedDescription: "删除已审核评论会将其从前台文章页移除。",
        emptyApproved: "暂无已审核评论。",
        approvedCommentTemplate: "已审核评论 · {date}",
      },
      about: {
        title: "关于页",
        description: "使用 Markdown 编辑公开的关于页内容。",
        contentLabel: "内容（Markdown）",
        previewHeading: "预览",
        previewError: "无法渲染 Markdown 预览。",
        saveButton: "保存关于页内容",
        savingButton: "保存中...",
        messages: {
          invalidPayload: "内容数据无效。",
          saveSuccess: "关于页内容已保存。",
        },
      },
      messages: {
        titleRequired: "标题不能为空。",
        slugRequired: "Slug 不能为空。",
        contentRequired: "内容不能为空。",
        invalidPostId: "无效的文章 ID。",
        postNotFound: "未找到文章。",
        uploadMarkdownFirst: "请先上传 Markdown 文件。",
        noImageReferencesDetected: "当前 Markdown 内容中未检测到本地图片引用。",
        selectImagesFirst: "请选择要上传的图片文件。",
        parseFrontmatterFailed: "无法解析 Markdown Frontmatter。",
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
    admin: {
      login: {
        title: "Admin Login",
        description: "Sign in to access your admin dashboard.",
        usernameLabel: "Username",
        passwordLabel: "Password",
        submitButton: "Sign in",
        submittingButton: "Signing in...",
        errors: {
          requiredCredentials: "Username and password are required.",
          usernameRequired: "Username is required.",
          passwordRequired: "Password is required.",
          invalidCredentials: "Invalid credentials",
        },
      },
      sidebar: {
        title: "Admin",
        logoutButton: "Logout",
      },
      dashboard: {
        title: "Dashboard",
        description: "A quick snapshot of your blog content and moderation queue.",
        stats: {
          totalPostsLabel: "Total Posts",
          totalPostsHelper: "Draft + published",
          publishedPostsLabel: "Published Posts",
          publishedPostsHelper: "Live on the public site",
          totalCommentsLabel: "Total Comments",
          totalCommentsHelper: "Pending + approved",
          pendingCommentsLabel: "Pending Comments",
          pendingCommentsHelper: "Awaiting moderation",
        },
        emptyStateTitle: "No data yet",
        emptyStateDescription:
          "Your dashboard is ready. Create your first post to start seeing activity.",
        quickActionsHeading: "Quick Actions",
        quickActions: {
          newPostLabel: "New Post",
          newPostDescription: "Jump into the post workspace and start writing.",
          viewBlogLabel: "View Blog",
          viewBlogDescription: "Open the public blog and preview published content.",
          manageCommentsLabel: "Manage Comments",
          manageCommentsDescription: "Review and moderate incoming comments.",
        },
      },
      posts: {
        title: "Posts",
        description: "Manage post metadata, publication state, and deletion.",
        sortNewest: "Newest",
        sortOldest: "Oldest",
        sortButtonTemplate: "Sort by date: {label}",
        newPostButton: "New Post",
        emptyTitle: "No posts yet",
        emptyDescription: "Create your first post to start publishing content.",
        table: {
          titleColumn: "Title",
          statusColumn: "Status",
          categoryColumn: "Category",
          dateColumn: "Date",
          actionsColumn: "Actions",
        },
        status: {
          draft: "Draft",
          published: "Published",
        },
        uncategorizedLabel: "Uncategorized",
        actions: {
          edit: "Edit",
          moveToDraft: "Move to draft",
          publish: "Publish",
          delete: "Delete",
          deleteConfirmTemplate: "Delete “{title}”? This action cannot be undone.",
        },
        editor: {
          newTitle: "New Post",
          editTitle: "Edit Post",
          newDescription: "Write and preview your markdown before publishing.",
          editDescription: "Update this post and save your changes.",
          markdownUploadHeading: "Markdown Upload",
          markdownUploadDescription:
            "Drag and drop a `.md` file here, or choose one manually.",
          parsingLabel: "Parsing markdown…",
          onlyMarkdownFiles: "Only .md files are supported.",
          unableToReadFile: "Unable to read markdown file.",
          loadedMarkdownTemplate: "Loaded markdown from {fileName}.",
          detectedLocalImageReferencesTemplate:
            "Detected {count} local image reference(s).",
          noLocalImageReferencesDetected:
            "No local image references were detected.",
          titleLabel: "Title",
          slugLabel: "Slug",
          categoryLabel: "Category",
          statusLabel: "Status",
          dateLabel: "Date",
          datePlaceholder: "2026-03-30",
          tagsLabel: "Tags",
          tagsHelper: "Type and press Enter to add",
          noTagsLabel: "No tags added yet.",
          tagsPlaceholder: "react, typescript, nextjs",
          addTagButton: "Add tag",
          removeTagAriaTemplate: "Remove tag {tag}",
          coverImageLabel: "Cover Image URL",
          coverImagePlaceholder: "https://example.com/cover.jpg",
          excerptLabel: "Excerpt",
          localImagesHeading: "Detected local images",
          noImageFilesSelected: "No image files selected",
          selectedImageFilesTemplate: "{count} image file(s) selected",
          uploadImagesButton: "Upload images and rewrite paths",
          uploadingImagesButton: "Uploading...",
          selectImagesFirst: "Select image files before uploading.",
          uploadMarkdownFirst: "Please upload a markdown file first.",
          noImageReferencesDetected:
            "No local image references were detected in this markdown content.",
          noReferencesRewritten:
            "No matching local image references were rewritten.",
          rewroteAllReferencesTemplate:
            "Uploaded and rewrote {count} image reference(s).",
          rewrotePartialReferencesTemplate:
            "Uploaded and rewrote {replaced} image reference(s). {unmatched} reference(s) still unmatched.",
          contentLabel: "Content (Markdown)",
          previewHeading: "Preview",
          previewError: "Unable to render markdown preview.",
          createButton: "Create post",
          creatingButton: "Creating...",
          saveButton: "Save changes",
          savingButton: "Saving...",
        },
      },
      categories: {
        title: "Categories & Tags",
        description: "Create categories, inspect usage, and clean up unused tags.",
        createHeading: "Create Category",
        createForm: {
          nameLabel: "Category name",
          namePlaceholder: "Frontend Development",
          autoSlugLabel: "Auto slug",
          createButton: "Create category",
          creatingButton: "Creating...",
          errors: {
            nameRequired: "Category name is required.",
            createFailed: "Unable to create category.",
          },
          successTemplate: "Created category “{name}” ({slug}).",
        },
        categoriesHeading: "Categories",
        categoriesDescription:
          "Deleting a category keeps all posts and marks them as uncategorized.",
        tagsHeading: "Tags",
        tagsDescription:
          "Tags are created inline in the post editor. Only unused tags can be deleted here.",
        emptyCategories: "No categories yet.",
        emptyTags: "No tags yet.",
        table: {
          nameColumn: "Name",
          slugColumn: "Slug",
          postsColumn: "Posts",
          actionsColumn: "Actions",
        },
        actions: {
          delete: "Delete",
          inUse: "In use",
        },
      },
      comments: {
        title: "Comments",
        description:
          "Review pending comments and decide what appears on the public post pages.",
        pendingQueueTemplate: "Pending queue: {count}",
        emptyPendingTitle: "All caught up",
        emptyPendingDescription:
          "There are no pending comments to moderate right now.",
        onPostLabel: "On",
        submittedTemplate: "Submitted {date}",
        approveButton: "Approve",
        deleteButton: "Delete",
        approvedHeading: "Approved comments",
        approvedDescription:
          "Delete any approved comment to remove it from the public post page.",
        emptyApproved: "No approved comments yet.",
        approvedCommentTemplate: "Approved comment • {date}",
      },
      about: {
        title: "About Page",
        description: "Edit your public About page content using markdown.",
        contentLabel: "Content (Markdown)",
        previewHeading: "Preview",
        previewError: "Unable to render markdown preview.",
        saveButton: "Save about content",
        savingButton: "Saving...",
        messages: {
          invalidPayload: "Invalid content payload.",
          saveSuccess: "About content saved.",
        },
      },
      messages: {
        titleRequired: "Title is required.",
        slugRequired: "Slug is required.",
        contentRequired: "Content is required.",
        invalidPostId: "Invalid post id.",
        postNotFound: "Post not found.",
        uploadMarkdownFirst: "Please upload a markdown file first.",
        noImageReferencesDetected:
          "No local image references were detected in this markdown content.",
        selectImagesFirst: "Please select image files to upload.",
        parseFrontmatterFailed: "Unable to parse markdown frontmatter.",
      },
    },
  },
};

export function getDictionary(locale: AppLocale) {
  return dictionaries[locale];
}
