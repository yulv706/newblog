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
      tagline: string;
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
      heroKicker: string;
      featuredEyebrow: string;
      title: string;
      description: string;
      primaryAction: string;
      secondaryAction: string;
      postCountLabel: string;
      categoryCountLabel: string;
      featuredEmpty: string;
      featuredCta: string;
      latestHeading: string;
      latestDescription: string;
      latestEmpty: string;
      latestCta: string;
      categoriesHeading: string;
      categoriesDescription: string;
      categoriesEmpty: string;
      exploreHeading: string;
      exploreDescription: string;
      paths: {
        blogTitle: string;
        blogDescription: string;
        booksTitle: string;
        booksDescription: string;
        aboutTitle: string;
        aboutDescription: string;
      };
    };
    blog: {
      eyebrow: string;
      title: string;
      description: string;
      totalPostsTemplate: string;
      totalTopicsTemplate: string;
      featuredLabel: string;
      archiveHeading: string;
      archiveDescription: string;
      resultsTemplate: string;
      filterHeading: string;
      tagsDisclosureTemplate: string;
      noMorePostsLabel: string;
      readingTimeTemplate: string;
      featuredActionLabel: string;
      readArticleLabel: string;
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
    books: {
      eyebrow: string;
      title: string;
      description: string;
      currentStageLabel: string;
      previousCurrentBookLabel: string;
      nextCurrentBookLabel: string;
      viewReadingFileLabel: string;
      libraryLabel: string;
      notesArchiveLabel: string;
      stats: {
        totalLabel: string;
        readingLabel: string;
        finishedLabel: string;
        queuedLabel: string;
        notesLabel: string;
      };
      sections: {
        currentHeading: string;
        currentDescription: string;
        shelfHeading: string;
        shelfDescription: string;
        notesHeading: string;
        notesDescription: string;
      };
      status: {
        reading: string;
        finished: string;
        queued: string;
      };
      progressTemplate: string;
      pagesTemplate: string;
      wordsTemplate: string;
      ratingTemplate: string;
      finishedTemplate: string;
      categoryLabel: string;
      categoryFilterAllLabel: string;
      categoryFilterHeading: string;
      categoryFilterSummaryTemplate: string;
      categoryFilterEmptyLabel: string;
      categoryFilterExpandTemplate: string;
      categoryFilterCollapseLabel: string;
      allStatusesLabel: string;
      searchBooksLabel: string;
      searchBooksPlaceholder: string;
      clearSearchLabel: string;
      statusFilterLabel: string;
      sortLabel: string;
      sortOptions: {
        recent: string;
        title: string;
        rating: string;
        progress: string;
      };
      shelfPaginationLabel: string;
      takeawayLabel: string;
      noteLabel: string;
      openInWereadLabel: string;
      openBookTemplate: string;
      closeDetailsLabel: string;
      detailsHeading: string;
      readingTimeLabel: string;
      notesCountLabel: string;
      highlightHeading: string;
      noHighlightLabel: string;
      syncedAtTemplate: string;
      updatedAtTemplate: string;
      detailFallbackLabel: string;
      notesCountTemplate: string;
      highlightLabel: string;
      thoughtLabel: string;
      reviewLabel: string;
      annotationPageTemplate: string;
      previousNotesPageLabel: string;
      nextNotesPageLabel: string;
    };
    about: {
      title: string;
      description: string;
    };
    post: {
      coverImageAltTemplate: string;
      commentsCountSingularTemplate: string;
      commentsCountPluralTemplate: string;
      backToBlogLabel: string;
      articleEyebrow: string;
      readingTimeTemplate: string;
      readingProgressLabel: string;
      readerControlsLabel: string;
      decreaseTextSizeLabel: string;
      increaseTextSizeLabel: string;
      copyLinkLabel: string;
      copiedLinkLabel: string;
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
    books: {
      title: string;
      description: string;
      stats: {
        totalLabel: string;
        visibleLabel: string;
        readingLabel: string;
        notesLabel: string;
      };
      status: {
        heading: string;
        apiKeyLabel: string;
        apiKeyConfigured: string;
        apiKeyMissing: string;
        lastSyncLabel: string;
        neverSynced: string;
        lastStatusLabel: string;
        notRunLabel: string;
        messageLabel: string;
      };
      command: {
        heading: string;
        description: string;
        dockerCommand: string;
      };
      sync: {
        heading: string;
        description: string;
        syncButton: string;
        syncingButton: string;
      };
      messages: {
        missingApiKey: string;
        syncSuccessTemplate: string;
        syncFailed: string;
      };
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
      siteTitle: "读写札记",
      navigation: {
        links: {
          home: "首页",
          blog: "博客",
          books: "书架",
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
        copyrightTemplate: "© {year} 读写札记。",
        socialLinksAriaLabel: "页脚导航",
        tagline: "读一点，写一点，把日子慢慢存下来。",
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
        heroKicker: "READ · WRITE · REMEMBER",
        featuredEyebrow: "本期札记",
        title: "在阅读与写作之间，收藏生活的回声。",
        description: "关于书、生活与那些值得停下来想一想的事。慢一点写，也认真一点记住。",
        primaryAction: "开始阅读",
        secondaryAction: "看看书架",
        postCountLabel: "篇札记",
        categoryCountLabel: "个主题",
        featuredEmpty: "暂无已发布文章。",
        featuredCta: "继续阅读",
        latestHeading: "最近写下",
        latestDescription: "不追赶更新频率，只留下值得回看的文字。",
        latestEmpty: "下一篇札记正在酝酿。",
        latestCta: "查看全部文章",
        categoriesHeading: "主题索引",
        categoriesDescription: "沿着感兴趣的词，翻到下一页。",
        categoriesEmpty: "暂无可用分类。",
        exploreHeading: "随意逛逛",
        exploreDescription: "从文字、阅读或关于我开始，都可以。",
        paths: {
          blogTitle: "全部文章",
          blogDescription: "按主题与标签，找到想读的那一篇。",
          booksTitle: "阅读书架",
          booksDescription: "正在读、读过，以及准备翻开的书。",
          aboutTitle: "关于本站",
          aboutDescription: "了解这些文字背后的人与念头。",
        },
      },
      blog: {
        eyebrow: "写作札记",
        title: "文字之间",
        description: "关于关系、成长与日常判断的持续记录。按时间归档，也沿主题重访。",
        totalPostsTemplate: "{count} 篇文章",
        totalTopicsTemplate: "{count} 个主题",
        featuredLabel: "最新写下",
        archiveHeading: "全部文字",
        archiveDescription: "按发布时间整理的完整文集。",
        resultsTemplate: "共 {count} 篇",
        filterHeading: "按分类浏览",
        tagsDisclosureTemplate: "展开标签 · {count}",
        noMorePostsLabel: "更多文字正在慢慢写成。",
        readingTimeTemplate: "约 {minutes} 分钟",
        featuredActionLabel: "开始阅读",
        readArticleLabel: "阅读文章",
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
        inputPlaceholder: "试试：生活、思考、随笔…",
        submitButton: "搜索",
        emptyTitle: "未找到文章。",
        emptyDescription: "试试其他关键词或检查拼写。",
        enterKeywordPrompt: "输入关键词以搜索文章标题和内容。",
        recentPostsHeading: "最新文章",
        resultSummarySingularTemplate: "找到 {count} 条与“{query}”相关的结果。",
        resultSummaryPluralTemplate: "找到 {count} 条与“{query}”相关的结果。",
      },
      books: {
        eyebrow: "阅读记录",
        title: "书与札记",
        description:
          "这里不是一份完成清单，而是一张持续生长的阅读地图：正在推进的书、留下判断的书，以及值得重新打开的句子。",
        currentStageLabel: "阅读现场",
        previousCurrentBookLabel: "上一本正在读的书",
        nextCurrentBookLabel: "下一本正在读的书",
        viewReadingFileLabel: "查看阅读档案",
        libraryLabel: "个人藏书",
        notesArchiveLabel: "重读片段",
        stats: {
          totalLabel: "收录书籍",
          readingLabel: "正在阅读",
          finishedLabel: "已读完",
          queuedLabel: "待读",
          notesLabel: "有摘记",
        },
        sections: {
          currentHeading: "正在发生的阅读",
          currentDescription: "近期投入时间最多的几本书。",
          shelfHeading: "全部藏书",
          shelfDescription: "搜索标题与作者，或按状态、主题和阅读进度重新组织这座书架。",
          notesHeading: "值得再读一次",
          notesDescription: "从摘记里走回那些曾经改变判断的句子。",
        },
        status: {
          reading: "在读",
          finished: "已读",
          queued: "待读",
        },
        progressTemplate: "进度 {progress}%",
        pagesTemplate: "{pages} 页",
        wordsTemplate: "{words} 字",
        ratingTemplate: "{rating}/5",
        finishedTemplate: "完成于 {date}",
        categoryLabel: "主题",
        categoryFilterAllLabel: "全部",
        categoryFilterHeading: "按主题筛选",
        categoryFilterSummaryTemplate: "显示 {visible} / {total} 本",
        categoryFilterEmptyLabel: "这个主题下暂时没有公开书籍。",
        categoryFilterExpandTemplate: "展开 {count} 个主题",
        categoryFilterCollapseLabel: "收起",
        allStatusesLabel: "全部",
        searchBooksLabel: "搜索书籍",
        searchBooksPlaceholder: "搜索书名、作者或主题",
        clearSearchLabel: "清空搜索",
        statusFilterLabel: "按阅读状态筛选",
        sortLabel: "书架排序",
        sortOptions: {
          recent: "最近更新",
          title: "书名顺序",
          rating: "评分最高",
          progress: "阅读进度",
        },
        shelfPaginationLabel: "书架分页",
        takeawayLabel: "读后判断",
        noteLabel: "摘记",
        openInWereadLabel: "打开微信读书",
        openBookTemplate: "打开《{title}》",
        closeDetailsLabel: "关闭详情",
        detailsHeading: "阅读细节",
        readingTimeLabel: "阅读时长",
        notesCountLabel: "笔记/划线",
        highlightHeading: "划线与摘记",
        noHighlightLabel: "还没有同步到具体划线，先展示阅读进度和笔记统计。",
        syncedAtTemplate: "同步于 {date}",
        updatedAtTemplate: "更新于 {date}",
        detailFallbackLabel: "暂无记录",
        notesCountTemplate: "{count} 条",
        highlightLabel: "划线",
        thoughtLabel: "感想",
        reviewLabel: "短评",
        annotationPageTemplate: "{current} / {total}",
        previousNotesPageLabel: "上一页",
        nextNotesPageLabel: "下一页",
      },
      about: {
        title: "关于",
        description: "了解作者背景、关注领域与写作方向。",
      },
      post: {
        coverImageAltTemplate: "{title} 封面图",
        commentsCountSingularTemplate: "{count} 条评论",
        commentsCountPluralTemplate: "{count} 条评论",
        backToBlogLabel: "返回全部文字",
        articleEyebrow: "一篇札记",
        readingTimeTemplate: "预计阅读 {minutes} 分钟",
        readingProgressLabel: "文章阅读进度",
        readerControlsLabel: "阅读设置",
        decreaseTextSizeLabel: "减小正文字号",
        increaseTextSizeLabel: "增大正文字号",
        copyLinkLabel: "复制链接",
        copiedLinkLabel: "已复制",
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
          tagsPlaceholder: "生活, 思考, 随笔",
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
          rewrotePartialReferencesTemplate:
            "已上传并重写 {replaced} 个图片引用，仍有 {unmatched} 个引用未匹配。",
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
          namePlaceholder: "生活随笔",
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
      books: {
        title: "书架同步",
        description: "从微信读书同步书架、阅读进度和笔记统计，并更新前台阅读书架。",
        stats: {
          totalLabel: "同步条目",
          visibleLabel: "公开展示",
          readingLabel: "正在阅读",
          notesLabel: "笔记统计",
        },
        status: {
          heading: "同步状态",
          apiKeyLabel: "API Key",
          apiKeyConfigured: "已配置",
          apiKeyMissing: "未配置",
          lastSyncLabel: "上次同步",
          neverSynced: "尚未同步",
          lastStatusLabel: "状态",
          notRunLabel: "未运行",
          messageLabel: "消息",
        },
        command: {
          heading: "命令行同步",
          description: "适合放到宿主机定时任务里运行，容器会先执行数据库迁移再同步。",
          dockerCommand:
            "docker compose --env-file deploy/.env.production exec app npm run sync:weread",
        },
        sync: {
          heading: "立即同步",
          description: "手动拉取微信读书最新书架、进度和笔记统计。",
          syncButton: "同步微信读书",
          syncingButton: "同步中...",
        },
        messages: {
          missingApiKey: "请先在 deploy/.env.production 中配置 WEREAD_API_KEY。",
          syncSuccessTemplate: "同步完成：{books} 个书架条目，{notes} 条摘记内容。",
          syncFailed: "微信读书同步失败，请稍后重试。",
        },
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
      siteTitle: "Read / Write Notes",
      navigation: {
        links: {
          home: "Home",
          blog: "Blog",
          books: "Books",
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
        copyrightTemplate: "© {year} Read / Write Notes.",
        socialLinksAriaLabel: "Footer navigation",
        tagline: "Read a little, write a little, keep the days close.",
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
        heroKicker: "READ · WRITE · REMEMBER",
        featuredEyebrow: "Selected note",
        title: "Collecting life's echoes between reading and writing.",
        description:
          "Notes on books, ordinary days, and ideas worth pausing for. Written slowly, kept carefully.",
        primaryAction: "Start reading",
        secondaryAction: "Open the shelf",
        postCountLabel: "notes",
        categoryCountLabel: "topics",
        featuredEmpty: "No published posts yet.",
        featuredCta: "Keep reading",
        latestHeading: "Recently written",
        latestDescription: "No publishing treadmill—only words worth returning to.",
        latestEmpty: "The next note is taking shape.",
        latestCta: "View all posts",
        categoriesHeading: "Topic index",
        categoriesDescription: "Follow an interesting word to the next page.",
        categoriesEmpty: "No categories available yet.",
        exploreHeading: "Take a look around",
        exploreDescription: "Start with the writing, the bookshelf, or the story behind this site.",
        paths: {
          blogTitle: "All writing",
          blogDescription: "Browse by topic and tag to find the right note.",
          booksTitle: "Reading shelf",
          booksDescription: "Books in progress, finished, and waiting to be opened.",
          aboutTitle: "About this site",
          aboutDescription: "Meet the person and ideas behind these pages.",
        },
      },
      blog: {
        eyebrow: "Writing archive",
        title: "Between the Lines",
        description:
          "Ongoing notes on relationships, growth, and everyday judgment, arranged by time and revisited by theme.",
        totalPostsTemplate: "{count} essays",
        totalTopicsTemplate: "{count} topics",
        featuredLabel: "Just published",
        archiveHeading: "All writing",
        archiveDescription: "The complete collection, ordered by publication date.",
        resultsTemplate: "{count} essays",
        filterHeading: "Browse by category",
        tagsDisclosureTemplate: "Open tags · {count}",
        noMorePostsLabel: "More writing is taking shape.",
        readingTimeTemplate: "About {minutes} min",
        featuredActionLabel: "Start reading",
        readArticleLabel: "Read article",
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
        inputPlaceholder: "Try: life, thoughts, essay...",
        submitButton: "Search",
        emptyTitle: "No posts found.",
        emptyDescription: "Try another keyword or check your spelling.",
        enterKeywordPrompt: "Enter a keyword to search post titles and content.",
        recentPostsHeading: "Recent Posts",
        resultSummarySingularTemplate: "Found {count} result for “{query}”.",
        resultSummaryPluralTemplate: "Found {count} results for “{query}”.",
      },
      books: {
        eyebrow: "Reading log",
        title: "Books & Notes",
        description:
          "Not a completion list, but a living map of books in motion, judgments retained, and lines worth opening again.",
        currentStageLabel: "Reading now",
        previousCurrentBookLabel: "Previous current book",
        nextCurrentBookLabel: "Next current book",
        viewReadingFileLabel: "View reading file",
        libraryLabel: "Personal library",
        notesArchiveLabel: "Resurface",
        stats: {
          totalLabel: "Books logged",
          readingLabel: "Reading now",
          finishedLabel: "Finished",
          queuedLabel: "Queued",
          notesLabel: "Books noted",
        },
        sections: {
          currentHeading: "Reading in Progress",
          currentDescription: "The books getting the most attention lately.",
          shelfHeading: "The Library",
          shelfDescription:
            "Search by title or author, then reorganize the shelf by status, theme, or reading progress.",
          notesHeading: "Worth Reading Again",
          notesDescription: "A few lines that once changed a judgment or sharpened a question.",
        },
        status: {
          reading: "Reading",
          finished: "Finished",
          queued: "Queued",
        },
        progressTemplate: "{progress}% complete",
        pagesTemplate: "{pages} pages",
        wordsTemplate: "{words} words",
        ratingTemplate: "{rating}/5",
        finishedTemplate: "Finished {date}",
        categoryLabel: "Theme",
        categoryFilterAllLabel: "All",
        categoryFilterHeading: "Filter by theme",
        categoryFilterSummaryTemplate: "Showing {visible} / {total}",
        categoryFilterEmptyLabel: "No public books in this theme yet.",
        categoryFilterExpandTemplate: "Show {count} more",
        categoryFilterCollapseLabel: "Collapse",
        allStatusesLabel: "All",
        searchBooksLabel: "Search books",
        searchBooksPlaceholder: "Search title, author, or theme",
        clearSearchLabel: "Clear search",
        statusFilterLabel: "Filter by reading status",
        sortLabel: "Sort library",
        sortOptions: {
          recent: "Recently updated",
          title: "Title",
          rating: "Highest rated",
          progress: "Reading progress",
        },
        shelfPaginationLabel: "Library pages",
        takeawayLabel: "Takeaway",
        noteLabel: "Note",
        openInWereadLabel: "Open in WeRead",
        openBookTemplate: "Open {title}",
        closeDetailsLabel: "Close details",
        detailsHeading: "Reading Details",
        readingTimeLabel: "Reading Time",
        notesCountLabel: "Notes / Highlights",
        highlightHeading: "Highlights & Notes",
        noHighlightLabel:
          "No synced highlight text yet, so this view shows progress and note statistics first.",
        syncedAtTemplate: "Synced {date}",
        updatedAtTemplate: "Updated {date}",
        detailFallbackLabel: "Not recorded",
        notesCountTemplate: "{count} item(s)",
        highlightLabel: "Highlight",
        thoughtLabel: "Thought",
        reviewLabel: "Review",
        annotationPageTemplate: "{current} / {total}",
        previousNotesPageLabel: "Previous",
        nextNotesPageLabel: "Next",
      },
      about: {
        title: "About",
        description: "Learn more about the author behind this blog and current writing focus.",
      },
      post: {
        coverImageAltTemplate: "{title} cover image",
        commentsCountSingularTemplate: "{count} comment",
        commentsCountPluralTemplate: "{count} comments",
        backToBlogLabel: "Back to all writing",
        articleEyebrow: "An essay",
        readingTimeTemplate: "{minutes} min read",
        readingProgressLabel: "Article reading progress",
        readerControlsLabel: "Reading settings",
        decreaseTextSizeLabel: "Decrease text size",
        increaseTextSizeLabel: "Increase text size",
        copyLinkLabel: "Copy link",
        copiedLinkLabel: "Copied",
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
              bodyTooLongTemplate: "Comment must be {max} characters or fewer.",
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
          markdownUploadDescription: "Drag and drop a `.md` file here, or choose one manually.",
          parsingLabel: "Parsing markdown…",
          onlyMarkdownFiles: "Only .md files are supported.",
          unableToReadFile: "Unable to read markdown file.",
          loadedMarkdownTemplate: "Loaded markdown from {fileName}.",
          detectedLocalImageReferencesTemplate: "Detected {count} local image reference(s).",
          noLocalImageReferencesDetected: "No local image references were detected.",
          titleLabel: "Title",
          slugLabel: "Slug",
          categoryLabel: "Category",
          statusLabel: "Status",
          dateLabel: "Date",
          datePlaceholder: "2026-03-30",
          tagsLabel: "Tags",
          tagsHelper: "Type and press Enter to add",
          noTagsLabel: "No tags added yet.",
          tagsPlaceholder: "生活, 思考, 随笔",
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
          noReferencesRewritten: "No matching local image references were rewritten.",
          rewroteAllReferencesTemplate: "Uploaded and rewrote {count} image reference(s).",
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
          namePlaceholder: "Life Notes",
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
        description: "Review pending comments and decide what appears on the public post pages.",
        pendingQueueTemplate: "Pending queue: {count}",
        emptyPendingTitle: "All caught up",
        emptyPendingDescription: "There are no pending comments to moderate right now.",
        onPostLabel: "On",
        submittedTemplate: "Submitted {date}",
        approveButton: "Approve",
        deleteButton: "Delete",
        approvedHeading: "Approved comments",
        approvedDescription: "Delete any approved comment to remove it from the public post page.",
        emptyApproved: "No approved comments yet.",
        approvedCommentTemplate: "Approved comment • {date}",
      },
      books: {
        title: "Books Sync",
        description:
          "Sync your WeRead shelf, reading progress, and note counts into the public bookshelf.",
        stats: {
          totalLabel: "Synced Items",
          visibleLabel: "Public Items",
          readingLabel: "Reading Now",
          notesLabel: "Note Count",
        },
        status: {
          heading: "Sync Status",
          apiKeyLabel: "API Key",
          apiKeyConfigured: "Configured",
          apiKeyMissing: "Missing",
          lastSyncLabel: "Last Sync",
          neverSynced: "Never synced",
          lastStatusLabel: "Status",
          notRunLabel: "Not run",
          messageLabel: "Message",
        },
        command: {
          heading: "Command Line Sync",
          description:
            "Use this from a host scheduler. The container runs migrations before syncing.",
          dockerCommand:
            "docker compose --env-file deploy/.env.production exec app npm run sync:weread",
        },
        sync: {
          heading: "Sync Now",
          description: "Pull the latest WeRead shelf, progress, and note counts.",
          syncButton: "Sync WeRead",
          syncingButton: "Syncing...",
        },
        messages: {
          missingApiKey: "Configure WEREAD_API_KEY in deploy/.env.production first.",
          syncSuccessTemplate: "Sync complete: {books} shelf item(s), {notes} note item(s).",
          syncFailed: "WeRead sync failed. Please try again later.",
        },
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
