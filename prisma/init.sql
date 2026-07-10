PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Article" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "coverImageUrl" TEXT,
  "contentHtml" TEXT NOT NULL,
  "contentBlocksJson" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "publicToken" TEXT,
  "submittedBy" TEXT NOT NULL,
  "submittedByUserId" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceFilePath" TEXT,
  "notes" TEXT,
  "reviewNote" TEXT,
  "publishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Article_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Article_publicToken_key" ON "Article"("publicToken");

CREATE TABLE IF NOT EXISTS "ArticleAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "articleId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "publicUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleAsset_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PopoChannel" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "receiverTid" TEXT NOT NULL,
  "channelType" TEXT NOT NULL DEFAULT 'production',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastCheckedAt" DATETIME,
  "lastCheckStatus" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "PushLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "articleId" TEXT,
  "issueId" TEXT,
  "channelId" TEXT,
  "receiverTid" TEXT NOT NULL,
  "msgType" TEXT NOT NULL DEFAULT 'rich_text',
  "msgId" TEXT,
  "status" TEXT NOT NULL,
  "errcode" INTEGER,
  "errmsg" TEXT,
  "requestSummary" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "pushedAt" DATETIME,
  "recalledAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushLog_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PushLog_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "DigestIssue" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PushLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "PopoChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DigestIssue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "coverImageUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "publicToken" TEXT,
  "publishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigestIssue_publicToken_key" ON "DigestIssue"("publicToken");

CREATE TABLE IF NOT EXISTS "DigestIssueItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issueId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "titleOverride" TEXT,
  "summaryOverride" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DigestIssueItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "DigestIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DigestIssueItem_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigestIssueItem_issueId_articleId_key" ON "DigestIssueItem"("issueId", "articleId");
CREATE UNIQUE INDEX IF NOT EXISTS "DigestIssueItem_issueId_position_key" ON "DigestIssueItem"("issueId", "position");

CREATE TABLE IF NOT EXISTS "ErrorLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PopoToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accessToken" TEXT NOT NULL,
  "accessExpiredAt" DATETIME NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "refreshExpiredAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "CardConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateUuid" TEXT NOT NULL DEFAULT '',
  "columnTitle" TEXT NOT NULL DEFAULT '创意营销案例分享',
  "buttonText" TEXT NOT NULL DEFAULT '阅读全文',
  "defaultCoverImageUrl" TEXT,
  "itemLimit" INTEGER NOT NULL DEFAULT 4,
  "itemSource" TEXT NOT NULL DEFAULT 'auto',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
