import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { publicArticleUrl } from "@/lib/content";
import { db } from "@/lib/db";

export default async function PublicIssuePage({ params }: { params: Promise<{ token: string }> }) {
  const routeParams = await params;
  const issue = await db.digestIssue.findUnique({
    where: { publicToken: routeParams.token },
    include: {
      items: {
        include: { article: true },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!issue || issue.status === "archived") notFound();

  return (
    <main className="article-page">
      <header>
        <div className="article-meta">创意营销案例分享</div>
        <h1>{issue.title}</h1>
        {issue.summary ? <p className="muted">{issue.summary}</p> : null}
        {issue.coverImageUrl ? <img className="cover" src={issue.coverImageUrl} alt="" /> : null}
      </header>

      <section className="stack-lg">
        {issue.items.map((item) => {
          const title = item.titleOverride || item.article.title;
          const summary = item.summaryOverride || item.article.summary;
          const href = item.article.publicToken ? publicArticleUrl(item.article.publicToken) : "";

          return (
            <article key={item.id} className="workspace" style={{ boxShadow: "none" }}>
              <div className="workspace-section stack">
                <div className="article-meta">案例 {item.position}</div>
                <h2 style={{ margin: 0 }}>{title}</h2>
                {summary ? <p className="muted">{summary}</p> : null}
                {href ? (
                  <Link className="button secondary" href={href}>
                    <ExternalLink size={16} />
                    阅读案例
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
