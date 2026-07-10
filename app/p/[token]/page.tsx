import { notFound } from "next/navigation";

import { PublicArticle } from "@/components/public-article";
import { db } from "@/lib/db";

export default async function PublicArticlePage({ params }: { params: Promise<{ token: string }> }) {
  const routeParams = await params;
  const article = await db.article.findUnique({ where: { publicToken: routeParams.token } });
  if (!article || !["published", "pushed", "push_failed"].includes(article.status)) notFound();

  return <PublicArticle title={article.title} summary={article.summary} coverImageUrl={article.coverImageUrl} html={article.contentHtml} publishedAt={article.publishedAt} createdAt={article.createdAt} />;
}
