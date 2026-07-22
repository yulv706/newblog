import Link from "next/link";

type DailyContentProps = {
  content: string;
};

const tokenPattern = /(https?:\/\/[^\s]+|#[\p{L}\p{N}_-]{1,40})/gu;

function renderToken(token: string, index: number) {
  if (token.startsWith("#")) {
    const tag = token.slice(1);
    return (
      <Link
        key={`${token}-${index}`}
        href={`/daily?tag=${encodeURIComponent(tag)}`}
        className="text-primary hover:text-accent font-medium transition-colors outline-none focus-visible:underline"
      >
        {token}
      </Link>
    );
  }

  if (/^https?:\/\//i.test(token)) {
    return (
      <a
        key={`${token}-${index}`}
        href={token}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary decoration-primary/35 hover:text-accent focus-visible:decoration-primary font-medium break-all underline underline-offset-4 transition-colors outline-none"
      >
        {token}
      </a>
    );
  }

  return token;
}

export function DailyContent({ content }: DailyContentProps) {
  return (
    <p className="text-foreground text-[1rem] leading-7 break-words whitespace-pre-wrap sm:text-[1.03rem] sm:leading-8">
      {content.split(tokenPattern).map(renderToken)}
    </p>
  );
}
