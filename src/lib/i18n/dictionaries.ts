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
  },
};

export function getDictionary(locale: AppLocale) {
  return dictionaries[locale];
}
