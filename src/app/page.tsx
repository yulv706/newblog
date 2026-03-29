export default function Home() {
  return (
    <div className="py-12">
      <h1 className="text-4xl font-bold tracking-tight">Personal Blog</h1>
      <p className="mt-4 text-lg text-muted">Welcome to my personal tech blog.</p>
      <p className="mt-2 text-muted">
        欢迎来到我的个人技术博客。这里分享 Web 开发和软件工程的文章。
      </p>

      {/* Sample content to demonstrate typography */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Latest Posts</h2>
        <p className="mt-2 text-muted">Posts will appear here soon.</p>
      </section>

      {/* Sample code block to verify monospace font */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Code Example</h2>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-secondary p-4">
          <code className="font-mono text-sm">
            {`const greeting = "Hello, World!";\nconsole.log(greeting);`}
          </code>
        </pre>
      </section>
    </div>
  );
}
