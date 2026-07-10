import "server-only";

import { db } from "@/lib/db";

export const CARD_CONFIG_ID = "default";

export const DEFAULT_CARD_CONFIG = {
  id: CARD_CONFIG_ID,
  templateUuid: "",
  columnTitle: "创意营销案例分享",
  buttonText: "阅读全文",
  defaultCoverImageUrl: "",
  itemLimit: 4,
  itemSource: "auto"
};

export type ResolvedCardConfig = typeof DEFAULT_CARD_CONFIG;

export function clampCardItemLimit(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_CARD_CONFIG.itemLimit;
  return Math.min(5, Math.max(1, Math.trunc(value)));
}

export async function getCardConfig(): Promise<ResolvedCardConfig> {
  const config = await db.cardConfig.findUnique({ where: { id: CARD_CONFIG_ID } });

  return {
    ...DEFAULT_CARD_CONFIG,
    ...config,
    templateUuid: config?.templateUuid || process.env.POPO_CARD_TEMPLATE_UUID || "",
    defaultCoverImageUrl: config?.defaultCoverImageUrl || "",
    itemLimit: clampCardItemLimit(config?.itemLimit ?? DEFAULT_CARD_CONFIG.itemLimit),
    itemSource: config?.itemSource || DEFAULT_CARD_CONFIG.itemSource
  };
}
