import type { AppLocale } from "@/lib/i18n/config";

export type GamesCopy = {
  public: {
    eyebrow: string;
    title: string;
    description: string;
    syncLabel: string;
    profileLabel: string;
    profilePublic: string;
    profilePrivate: string;
    preview: {
      label: string;
      description: string;
    };
    stats: {
      games: string;
      hours: string;
      recent: string;
      reviews: string;
    };
    featured: {
      eyebrow: string;
      recentEyebrow: string;
      totalTimeLabel: string;
      recentTimeLabel: string;
      lastPlayedLabel: string;
      openLabel: string;
      previousLabel: string;
      nextLabel: string;
    };
    recent: {
      eyebrow: string;
      title: string;
      description: string;
    };
    library: {
      eyebrow: string;
      title: string;
      description: string;
      searchLabel: string;
      searchPlaceholder: string;
      clearSearchLabel: string;
      filterLabel: string;
      sortLabel: string;
      resultTemplate: string;
      pageLabel: string;
      previousPageLabel: string;
      nextPageLabel: string;
      allLabel: string;
      recentLabel: string;
      favoritesLabel: string;
      reviewedLabel: string;
      status: Record<string, string>;
      sort: {
        recent: string;
        playtime: string;
        rating: string;
        name: string;
      };
      noResultsTitle: string;
      noResultsDescription: string;
      resetLabel: string;
    };
    detail: {
      closeLabel: string;
      dragLabel: string;
      totalTimeLabel: string;
      recentTimeLabel: string;
      lastPlayedLabel: string;
      statusLabel: string;
      ratingLabel: string;
      reviewLabel: string;
      noReviewLabel: string;
      tagsLabel: string;
      platformLabel: string;
      openSteamLabel: string;
      favoriteLabel: string;
    };
    empty: {
      title: string;
      configuredDescription: string;
      unconfiguredDescription: string;
      setupHint: string;
    };
    units: {
      minute: string;
      minutes: string;
      hour: string;
      hours: string;
      never: string;
      today: string;
      yesterday: string;
      daysAgoTemplate: string;
      ratingTemplate: string;
    };
  };
  admin: {
    title: string;
    description: string;
    stats: {
      total: string;
      visible: string;
      reviewed: string;
      recent: string;
    };
    connection: {
      title: string;
      apiKey: string;
      steamId: string;
      profile: string;
      configured: string;
      missing: string;
      notSynced: string;
      privacyHint: string;
      keyHint: string;
      keyLinkLabel: string;
    };
    sync: {
      title: string;
      description: string;
      button: string;
      pending: string;
      lastSync: string;
      never: string;
      status: string;
      message: string;
      successTemplate: string;
      failed: string;
      missingConfig: string;
      commandTitle: string;
      commandDescription: string;
      command: string;
    };
    library: {
      title: string;
      description: string;
      empty: string;
      playtime: string;
      rating: string;
      visibility: string;
      edit: string;
      visible: string;
      hidden: string;
    };
    editor: {
      titleTemplate: string;
      description: string;
      statusLabel: string;
      ratingLabel: string;
      ratingHint: string;
      tagsLabel: string;
      tagsHint: string;
      reviewLabel: string;
      reviewPlaceholder: string;
      coverLabel: string;
      heroLabel: string;
      visibleLabel: string;
      favoriteLabel: string;
      featuredLabel: string;
      save: string;
      saving: string;
      cancel: string;
      success: string;
      invalidGame: string;
      invalidRating: string;
      reviewTooLong: string;
    };
  };
};

const copy: Record<AppLocale, GamesCopy> = {
  "zh-CN": {
    public: {
      eyebrow: "PLAY · LOG · REMEMBER",
      title: "游戏档案",
      description:
        "不只记录拥有过什么，也记录时间去了哪里。这里收拢正在投入的世界、真正留下来的作品，以及通关之后仍值得谈论的感受。",
      syncLabel: "Steam 同步",
      profileLabel: "Steam 档案",
      profilePublic: "公开资料",
      profilePrivate: "资料受限",
      preview: {
        label: "本机预览",
        description:
          "当前展示来自这台电脑的 Steam 安装与游玩记录。配置 Web API Key 后，将自动替换为完整账号游戏库。",
      },
      stats: {
        games: "游戏入库",
        hours: "累计游玩",
        recent: "近期启动",
        reviews: "留下评价",
      },
      featured: {
        eyebrow: "本次继续",
        recentEyebrow: "最近停留",
        totalTimeLabel: "累计游玩",
        recentTimeLabel: "近两周",
        lastPlayedLabel: "最后启动",
        openLabel: "查看游戏档案",
        previousLabel: "上一个精选游戏",
        nextLabel: "下一个精选游戏",
      },
      recent: {
        eyebrow: "SESSION LOG",
        title: "最近的游戏时间",
        description: "过去两周真正打开过的游戏，按投入时间排列。",
      },
      library: {
        eyebrow: "THE COLLECTION",
        title: "全部游戏",
        description: "按最近游玩、投入时长或个人评价，重新整理这份数字收藏。",
        searchLabel: "搜索游戏",
        searchPlaceholder: "搜索名称、标签或短评",
        clearSearchLabel: "清除搜索",
        filterLabel: "筛选游戏",
        sortLabel: "排序方式",
        resultTemplate: "第 {start}–{end} 项 · 共 {total} 款",
        pageLabel: "游戏库分页",
        previousPageLabel: "上一页",
        nextPageLabel: "下一页",
        allLabel: "全部",
        recentLabel: "近期",
        favoritesLabel: "珍藏",
        reviewedLabel: "已评价",
        status: {
          unplayed: "未开始",
          played: "玩过",
          playing: "正在玩",
          completed: "已通关",
          paused: "暂时搁置",
          dropped: "已弃置",
        },
        sort: {
          recent: "最近启动",
          playtime: "游玩最久",
          rating: "个人评分",
          name: "名称排序",
        },
        noResultsTitle: "没有找到匹配的游戏。",
        noResultsDescription: "换一个关键词或筛选条件再看看。",
        resetLabel: "重置筛选",
      },
      detail: {
        closeLabel: "关闭游戏详情",
        dragLabel: "向下拖动关闭",
        totalTimeLabel: "累计游玩",
        recentTimeLabel: "近两周",
        lastPlayedLabel: "最后启动",
        statusLabel: "游玩状态",
        ratingLabel: "个人评分",
        reviewLabel: "我的评价",
        noReviewLabel: "还没有写下正式评价，先让游玩时间替这段经历作证。",
        tagsLabel: "关键词",
        platformLabel: "设备分布",
        openSteamLabel: "在 Steam 查看",
        favoriteLabel: "个人珍藏",
      },
      empty: {
        title: "等待第一次 Steam 同步",
        configuredDescription:
          "连接信息已经就绪，但还没有可展示的游戏。请在后台执行同步，并确认 Steam 的“游戏详情”隐私设置为公开。",
        unconfiguredDescription:
          "游戏档案已经准备好。配置 Steam Web API Key 后，拥有的游戏、游玩时长与最近启动记录会自动进入这里。",
        setupHint: "同步只读取公开游戏数据，个人评分与短评始终保存在博客本地。",
      },
      units: {
        minute: "1 分钟",
        minutes: "{value} 分钟",
        hour: "1 小时",
        hours: "{value} 小时",
        never: "尚未启动",
        today: "今天",
        yesterday: "昨天",
        daysAgoTemplate: "{value} 天前",
        ratingTemplate: "{value} / 10",
      },
    },
    admin: {
      title: "Steam 游戏库",
      description: "同步 Steam 公开游戏数据，并维护只属于本站的状态、评分与短评。",
      stats: {
        total: "已拥有",
        visible: "公开展示",
        reviewed: "已有评价",
        recent: "近期游玩",
      },
      connection: {
        title: "连接状态",
        apiKey: "Web API Key",
        steamId: "Steam ID64",
        profile: "玩家资料",
        configured: "已配置",
        missing: "未配置",
        notSynced: "尚未同步",
        privacyHint: "Steam 个人资料 → 编辑个人资料 → 隐私设置中，需要把“游戏详情”设为公开。",
        keyHint: "API Key 只保存在服务器环境变量中，不会发送到浏览器。",
        keyLinkLabel: "申请 Steam Web API Key",
      },
      sync: {
        title: "立即同步",
        description: "拉取游戏所有权、累计时长、近两周时长和最近启动时间。",
        button: "同步 Steam",
        pending: "正在同步…",
        lastSync: "上次同步",
        never: "从未同步",
        status: "同步状态",
        message: "最近消息",
        successTemplate: "同步完成：{games} 款游戏，近期游玩 {recent} 款。",
        failed: "Steam 同步失败，请检查连接状态与隐私设置。",
        missingConfig: "请先配置 STEAM_WEB_API_KEY 与 STEAM_ID64。",
        commandTitle: "定时任务命令",
        commandDescription: "可由服务器计划任务调用；执行前会自动运行数据库迁移。",
        command: "docker compose --env-file deploy/.env.production exec app npm run sync:steam",
      },
      library: {
        title: "内容维护",
        description: "Steam 字段会在同步时更新，评分、短评和展示设置不会被覆盖。",
        empty: "同步后即可在这里维护你的游戏档案。",
        playtime: "游玩时长",
        rating: "评分",
        visibility: "展示",
        edit: "编辑",
        visible: "公开",
        hidden: "隐藏",
      },
      editor: {
        titleTemplate: "编辑《{name}》",
        description: "这部分内容属于博客，不会被下一次 Steam 同步覆盖。",
        statusLabel: "游玩状态",
        ratingLabel: "个人评分",
        ratingHint: "1–10 分；留空表示暂不评分。",
        tagsLabel: "关键词",
        tagsHint: "使用逗号分隔，例如：叙事, 沉浸, 合作。",
        reviewLabel: "个人短评",
        reviewPlaceholder: "它真正留下来的是什么？",
        coverLabel: "自定义竖版封面 URL",
        heroLabel: "自定义横版主视觉 URL",
        visibleLabel: "在公开游戏库展示",
        favoriteLabel: "加入个人珍藏",
        featuredLabel: "作为首页精选候选",
        save: "保存游戏档案",
        saving: "正在保存…",
        cancel: "返回游戏库",
        success: "游戏档案已保存。",
        invalidGame: "没有找到这款游戏。",
        invalidRating: "评分必须是 1 到 10 之间的整数。",
        reviewTooLong: "短评不能超过 2000 个字符。",
      },
    },
  },
  en: {
    public: {
      eyebrow: "PLAY · LOG · REMEMBER",
      title: "Play Archive",
      description:
        "More than a list of things owned: a record of where the hours went, which worlds held my attention, and what remained after the credits.",
      syncLabel: "Steam sync",
      profileLabel: "Steam profile",
      profilePublic: "Public profile",
      profilePrivate: "Limited profile",
      preview: {
        label: "Local preview",
        description:
          "This preview uses Steam installs and play history from this computer. Add a Web API Key to replace it with the complete account library.",
      },
      stats: {
        games: "Games owned",
        hours: "Hours played",
        recent: "Recent games",
        reviews: "Games reviewed",
      },
      featured: {
        eyebrow: "Continue session",
        recentEyebrow: "Last occupied",
        totalTimeLabel: "All time",
        recentTimeLabel: "Last 2 weeks",
        lastPlayedLabel: "Last launched",
        openLabel: "Open game file",
        previousLabel: "Previous featured game",
        nextLabel: "Next featured game",
      },
      recent: {
        eyebrow: "SESSION LOG",
        title: "Recent Play",
        description: "Games actually launched in the last two weeks, ordered by time invested.",
      },
      library: {
        eyebrow: "THE COLLECTION",
        title: "The Library",
        description: "Reorder the collection by recency, time invested, or personal judgment.",
        searchLabel: "Search games",
        searchPlaceholder: "Search name, tag, or review",
        clearSearchLabel: "Clear search",
        filterLabel: "Filter games",
        sortLabel: "Sort games",
        resultTemplate: "{start}–{end} of {total}",
        pageLabel: "Game library pages",
        previousPageLabel: "Previous",
        nextPageLabel: "Next",
        allLabel: "All",
        recentLabel: "Recent",
        favoritesLabel: "Favorites",
        reviewedLabel: "Reviewed",
        status: {
          unplayed: "Unplayed",
          played: "Played",
          playing: "Playing",
          completed: "Completed",
          paused: "Paused",
          dropped: "Dropped",
        },
        sort: {
          recent: "Recently played",
          playtime: "Most played",
          rating: "Highest rated",
          name: "Name",
        },
        noResultsTitle: "No matching games.",
        noResultsDescription: "Try another keyword or filter.",
        resetLabel: "Reset filters",
      },
      detail: {
        closeLabel: "Close game details",
        dragLabel: "Drag down to close",
        totalTimeLabel: "All time",
        recentTimeLabel: "Last 2 weeks",
        lastPlayedLabel: "Last launched",
        statusLabel: "Play status",
        ratingLabel: "My rating",
        reviewLabel: "My review",
        noReviewLabel:
          "No formal review yet. For now, the time invested can speak for the experience.",
        tagsLabel: "Keywords",
        platformLabel: "Platform split",
        openSteamLabel: "View on Steam",
        favoriteLabel: "Personal favorite",
      },
      empty: {
        title: "Waiting for the first Steam sync",
        configuredDescription:
          "Connection details are ready, but there are no public games yet. Run a sync in Admin and make sure Steam Game details are public.",
        unconfiguredDescription:
          "The archive is ready. Add a Steam Web API Key to sync owned games, playtime, and recent sessions.",
        setupHint:
          "Sync reads public game data only. Personal ratings and reviews stay in the blog database.",
      },
      units: {
        minute: "1 min",
        minutes: "{value} min",
        hour: "1 hr",
        hours: "{value} hrs",
        never: "Never launched",
        today: "Today",
        yesterday: "Yesterday",
        daysAgoTemplate: "{value} days ago",
        ratingTemplate: "{value} / 10",
      },
    },
    admin: {
      title: "Steam Library",
      description:
        "Sync public Steam game data and maintain statuses, ratings, and reviews owned by this site.",
      stats: {
        total: "Owned",
        visible: "Public",
        reviewed: "Reviewed",
        recent: "Recent",
      },
      connection: {
        title: "Connection",
        apiKey: "Web API Key",
        steamId: "Steam ID64",
        profile: "Player profile",
        configured: "Configured",
        missing: "Missing",
        notSynced: "Not synced",
        privacyHint:
          "In Steam, open Edit Profile → Privacy Settings and set Game details to Public.",
        keyHint: "The API key stays in server environment variables and is never sent to browsers.",
        keyLinkLabel: "Create a Steam Web API Key",
      },
      sync: {
        title: "Sync now",
        description: "Pull ownership, lifetime playtime, two-week playtime, and last launch time.",
        button: "Sync Steam",
        pending: "Syncing…",
        lastSync: "Last sync",
        never: "Never",
        status: "Status",
        message: "Latest message",
        successTemplate: "Synced {games} games; {recent} played recently.",
        failed: "Steam sync failed. Check connectivity and privacy settings.",
        missingConfig: "Configure STEAM_WEB_API_KEY and STEAM_ID64 first.",
        commandTitle: "Scheduler command",
        commandDescription:
          "A host scheduler can call this command; migrations run before the sync.",
        command: "docker compose --env-file deploy/.env.production exec app npm run sync:steam",
      },
      library: {
        title: "Editorial library",
        description:
          "Steam fields update on sync. Ratings, reviews, and display settings are preserved.",
        empty: "Run the first sync to start curating the archive.",
        playtime: "Playtime",
        rating: "Rating",
        visibility: "Visibility",
        edit: "Edit",
        visible: "Public",
        hidden: "Hidden",
      },
      editor: {
        titleTemplate: "Edit {name}",
        description: "These fields belong to the blog and survive every Steam sync.",
        statusLabel: "Play status",
        ratingLabel: "Personal rating",
        ratingHint: "1–10. Leave blank for no rating.",
        tagsLabel: "Keywords",
        tagsHint: "Comma separated, for example: narrative, immersive, co-op.",
        reviewLabel: "Personal review",
        reviewPlaceholder: "What actually remained after playing?",
        coverLabel: "Custom portrait cover URL",
        heroLabel: "Custom landscape hero URL",
        visibleLabel: "Show in the public library",
        favoriteLabel: "Mark as a personal favorite",
        featuredLabel: "Use as a featured candidate",
        save: "Save game file",
        saving: "Saving…",
        cancel: "Back to library",
        success: "Game file saved.",
        invalidGame: "Game not found.",
        invalidRating: "Rating must be an integer from 1 to 10.",
        reviewTooLong: "Review must be 2,000 characters or fewer.",
      },
    },
  },
};

export function getGamesCopy(locale: AppLocale) {
  return copy[locale];
}
