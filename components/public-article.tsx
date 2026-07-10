import { ArticleRenderer } from "@/components/article-renderer";

type PublicArticleProps = {
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  html: string;
  publishedAt?: Date | null;
  createdAt: Date;
  kicker?: string;
};

export function PublicArticle({
  title,
  summary,
  coverImageUrl,
  html,
  publishedAt,
  createdAt,
  kicker = "Marketing Digest"
}: PublicArticleProps) {
  const displayDate = publishedAt || createdAt;

  return (
    <article className="article-page article-page--editorial">
      <header className="article-hero">
        <div className="article-kicker">{kicker}</div>
        <h1>{title}</h1>
        {summary ? <p className="article-deck">{summary}</p> : null}
        <div className="article-meta">
          {displayDate.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric"
          })}{" "}
          · 创意营销案例
        </div>
        {coverImageUrl ? (
          <figure className="article-cover-frame">
            <img className="cover" src={coverImageUrl} alt="" />
          </figure>
        ) : null}
      </header>
      <ArticleRenderer html={html} />
    </article>
  );
}
