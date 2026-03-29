import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import * as bcryptjs from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "blog.db");

async function seed() {
  console.log("🌱 Seeding database...");

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  // Clear existing data (order matters for foreign keys)
  db.delete(schema.postTags).run();
  db.delete(schema.comments).run();
  db.delete(schema.posts).run();
  db.delete(schema.categories).run();
  db.delete(schema.tags).run();
  db.delete(schema.siteSettings).run();

  // Seed admin user password hash in site_settings
  const passwordHash = await bcryptjs.hash(
    process.env.ADMIN_PASSWORD || "admin123",
    10
  );
  db.insert(schema.siteSettings)
    .values([
      {
        key: "admin_password_hash",
        value: passwordHash,
      },
      {
        key: "about_content",
        value: `# About Me

Hi, I'm a software engineer passionate about building great products.

我是一名全栈开发工程师，热爱技术与设计的结合。

## Skills

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS
- **Backend:** Node.js, Python, Go
- **Database:** PostgreSQL, SQLite, Redis
- **DevOps:** Docker, Kubernetes, AWS

## Contact

Feel free to reach out to me at hello@example.com.`,
      },
    ])
    .run();

  // Seed categories
  const [cat1, cat2] = db
    .insert(schema.categories)
    .values([
      { name: "Frontend Development", slug: "frontend-development" },
      { name: "Backend Development", slug: "backend-development" },
    ])
    .returning()
    .all();

  console.log(`✅ Created ${2} categories`);

  // Seed tags
  const tagValues = [
    { name: "React", slug: "react" },
    { name: "TypeScript", slug: "typescript" },
    { name: "Next.js", slug: "nextjs" },
    { name: "Node.js", slug: "nodejs" },
    { name: "Tailwind CSS", slug: "tailwind-css" },
  ];

  const insertedTags = db
    .insert(schema.tags)
    .values(tagValues)
    .returning()
    .all();

  console.log(`✅ Created ${insertedTags.length} tags`);

  // Seed posts
  const now = new Date();
  const posts = [
    {
      title: "Getting Started with Next.js 15 App Router",
      slug: "getting-started-nextjs-15-app-router",
      content: `# Getting Started with Next.js 15 App Router

Next.js 15 introduces several exciting features that make building web applications even more enjoyable. In this post, we'll explore the App Router and its capabilities.

## Why App Router?

The App Router is the recommended way to build new Next.js applications. It provides:

- **Server Components** by default
- **Nested Layouts** for shared UI
- **Streaming** for progressive rendering
- **Server Actions** for mutations

## Quick Start

\`\`\`typescript
// app/page.tsx
export default function Home() {
  return (
    <main>
      <h1>Hello, Next.js 15!</h1>
    </main>
  );
}
\`\`\`

## File-based Routing

The App Router uses a file-system based router:

| Path | File |
|------|------|
| \`/\` | \`app/page.tsx\` |
| \`/blog\` | \`app/blog/page.tsx\` |
| \`/blog/:slug\` | \`app/blog/[slug]/page.tsx\` |

## Task List

- [x] Install Next.js 15
- [x] Set up TypeScript
- [x] Configure Tailwind CSS
- [ ] Build your first page
- [ ] Deploy to production

## Conclusion

Next.js 15 with the App Router provides a powerful and flexible way to build modern web applications. Give it a try!

![Next.js Logo](https://nextjs.org/static/blog/next-15/cover.png)`,
      excerpt:
        "Explore the new features in Next.js 15 App Router including Server Components, nested layouts, and server actions.",
      coverImage: "https://nextjs.org/static/blog/next-15/cover.png",
      status: "published" as const,
      categoryId: cat1.id,
      publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "深入理解 React Server Components",
      slug: "understanding-react-server-components",
      content: `# 深入理解 React Server Components

React Server Components (RSC) 是 React 生态系统中最重要的创新之一。本文将深入探讨其工作原理和最佳实践。

## 什么是 Server Components？

Server Components 是在服务器端渲染的 React 组件，它们：

- 可以直接访问数据库和文件系统
- 不会增加客户端 JavaScript 包大小
- 支持 async/await 数据获取

## 代码示例

\`\`\`tsx
// 这是一个 Server Component（默认）
async function PostList() {
  const posts = await db.select().from(postsTable);

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
\`\`\`

## Client Components vs Server Components

| 特性 | Server Components | Client Components |
|------|-------------------|-------------------|
| 数据获取 | 直接访问数据库 | 通过 API 请求 |
| 状态管理 | 无 state | useState, useEffect |
| 事件处理 | 不支持 | onClick, onChange 等 |
| 包大小 | 0 KB | 增加包大小 |

## 最佳实践

- [x] 默认使用 Server Components
- [x] 仅在需要交互时使用 Client Components
- [x] 将 Client Components 推到组件树底部
- [ ] 使用 Suspense 优化加载体验

## 总结

Server Components 让我们可以在保持优秀用户体验的同时，大幅减少客户端 JavaScript 的体积。掌握 RSC 是现代 React 开发的必备技能。`,
      excerpt:
        "React Server Components 是 React 生态中最重要的创新之一，本文深入探讨其原理和最佳实践。",
      coverImage: null,
      status: "published" as const,
      categoryId: cat1.id,
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Building a REST API with Node.js and TypeScript",
      slug: "building-rest-api-nodejs-typescript",
      content: `# Building a REST API with Node.js and TypeScript

In this tutorial, we'll build a production-ready REST API using Node.js, TypeScript, and Express.

## Project Setup

\`\`\`bash
mkdir my-api && cd my-api
npm init -y
npm install express cors helmet
npm install -D typescript @types/node @types/express tsx
\`\`\`

## Creating the Server

\`\`\`typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
\`\`\`

## Database Integration

For this project, we'll use SQLite with Drizzle ORM:

\`\`\`typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('data.db');
const db = drizzle(sqlite);
\`\`\`

## Error Handling

Always implement proper error handling:

\`\`\`typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});
\`\`\`

## Task List

- [x] Set up project structure
- [x] Configure TypeScript
- [x] Implement CRUD endpoints
- [x] Add validation middleware
- [ ] Write integration tests
- [ ] Set up CI/CD pipeline

> **Pro tip:** Always validate incoming data at the API boundary. Never trust client input.

## Conclusion

Building APIs with TypeScript gives you type safety at every layer, from request validation to database queries.`,
      excerpt:
        "Learn how to build a production-ready REST API using Node.js, TypeScript, and Express with SQLite.",
      coverImage: null,
      status: "published" as const,
      categoryId: cat2.id,
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Tailwind CSS v4 新特性解析",
      slug: "tailwind-css-v4-new-features",
      content: `# Tailwind CSS v4 新特性解析

Tailwind CSS v4 带来了革命性的改变，采用全新的 CSS-first 配置方式。让我们来看看有哪些令人兴奋的更新。

## CSS-first 配置

不再需要 \`tailwind.config.js\`，直接在 CSS 中使用 \`@theme\` 配置：

\`\`\`css
@import "tailwindcss";

@theme {
  --color-primary: #0071e3;
  --color-background: #ffffff;
  --font-sans: "Inter", sans-serif;
}
\`\`\`

## 性能提升

Tailwind CSS v4 使用全新的引擎 (Oxide)，性能大幅提升：

| 指标 | v3 | v4 |
|------|-----|-----|
| 初次构建 | 300ms | 50ms |
| 增量构建 | 100ms | 5ms |
| 内存占用 | 150MB | 20MB |

## 新的颜色系统

\`\`\`css
@theme {
  --color-surface: oklch(0.98 0.01 240);
  --color-on-surface: oklch(0.2 0.02 240);
}
\`\`\`

## 暗色模式增强

使用 CSS 变量让暗色模式切换更自然：

\`\`\`css
.dark {
  --color-background: #000000;
  --color-foreground: #f5f5f7;
}
\`\`\`

## 检查清单

- [x] 升级到 Tailwind CSS v4
- [x] 迁移配置文件到 CSS
- [x] 更新颜色系统
- [ ] 测试暗色模式
- [ ] 优化性能指标

![Tailwind CSS](https://tailwindcss.com/_next/static/media/card.a1cd9726.jpg)

## 总结

Tailwind CSS v4 是一次重大的版本更新，CSS-first 配置和 Oxide 引擎让开发体验更加流畅。建议尽早升级以享受这些改进。`,
      excerpt:
        "Tailwind CSS v4 采用 CSS-first 配置和 Oxide 引擎，带来革命性的开发体验改进。",
      coverImage:
        "https://tailwindcss.com/_next/static/media/card.a1cd9726.jpg",
      status: "published" as const,
      categoryId: cat1.id,
      publishedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Docker Deployment Best Practices",
      slug: "docker-deployment-best-practices",
      content: `# Docker Deployment Best Practices

Learn how to properly containerize and deploy your applications with Docker. This guide covers multi-stage builds, security hardening, and orchestration.

## Multi-Stage Build

\`\`\`dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

## Docker Compose

\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - app
\`\`\`

## Security Checklist

- [x] Use non-root user in container
- [x] Minimize base image (Alpine)
- [x] Don't store secrets in images
- [x] Enable read-only filesystem where possible
- [ ] Implement health checks
- [ ] Set resource limits

## Volume Management

| Volume Type | Use Case | Persistence |
|-------------|----------|-------------|
| Named Volume | Database files | Survives container restart |
| Bind Mount | Development code | Host filesystem |
| tmpfs | Temp files | Memory only |

> **Important:** Always use named volumes for data that must persist across container restarts.

## Conclusion

Docker simplifies deployment but requires careful configuration for production use. Follow these best practices to ensure your containers are secure, efficient, and reliable.`,
      excerpt:
        "Master Docker deployment with multi-stage builds, security hardening, and orchestration best practices.",
      coverImage: null,
      status: "draft" as const,
      categoryId: cat2.id,
      publishedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];

  const insertedPosts = db
    .insert(schema.posts)
    .values(posts)
    .returning()
    .all();

  console.log(`✅ Created ${insertedPosts.length} posts`);

  // Assign tags to posts
  const postTagAssignments = [
    // Post 1: Next.js, TypeScript, React
    { postId: insertedPosts[0].id, tagId: insertedTags[2].id },
    { postId: insertedPosts[0].id, tagId: insertedTags[1].id },
    { postId: insertedPosts[0].id, tagId: insertedTags[0].id },
    // Post 2: React, TypeScript
    { postId: insertedPosts[1].id, tagId: insertedTags[0].id },
    { postId: insertedPosts[1].id, tagId: insertedTags[1].id },
    // Post 3: Node.js, TypeScript
    { postId: insertedPosts[2].id, tagId: insertedTags[3].id },
    { postId: insertedPosts[2].id, tagId: insertedTags[1].id },
    // Post 4: Tailwind CSS, React
    { postId: insertedPosts[3].id, tagId: insertedTags[4].id },
    { postId: insertedPosts[3].id, tagId: insertedTags[0].id },
    // Post 5: Node.js, TypeScript
    { postId: insertedPosts[4].id, tagId: insertedTags[3].id },
    { postId: insertedPosts[4].id, tagId: insertedTags[1].id },
  ];

  db.insert(schema.postTags).values(postTagAssignments).run();
  console.log(`✅ Created ${postTagAssignments.length} post-tag assignments`);

  // Seed sample comments
  const commentValues = [
    {
      postId: insertedPosts[0].id,
      nickname: "Alice",
      email: "alice@example.com",
      body: "Great introduction to Next.js 15! The App Router is really powerful.",
      approved: true,
      createdAt: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      postId: insertedPosts[0].id,
      nickname: "张三",
      email: "zhangsan@example.com",
      body: "非常棒的文章！Next.js 15 的新特性确实很令人期待。",
      approved: true,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      postId: insertedPosts[1].id,
      nickname: "Bob",
      email: "bob@example.com",
      body: "This helped me understand RSC much better. Thanks!",
      approved: true,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      postId: insertedPosts[2].id,
      nickname: "李四",
      email: "lisi@example.com",
      body: "能否出一篇关于 GraphQL 的教程？",
      approved: false,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      postId: insertedPosts[0].id,
      nickname: "Charlie",
      email: "charlie@example.com",
      body: "Looking forward to more Next.js content!",
      approved: false,
      createdAt: now.toISOString(),
    },
  ];

  db.insert(schema.comments).values(commentValues).run();
  console.log(`✅ Created ${commentValues.length} comments`);

  console.log("🎉 Seed completed successfully!");

  sqlite.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
