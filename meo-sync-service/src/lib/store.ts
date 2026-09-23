import { prisma } from "./db";
import { LinkMapping } from "./types";

// Instagram投稿 <-> Googleビジネスプロフィール投稿 の紐づけ状態を
// 店舗(businessId)ごとにSQLite(Prisma)に永続化する。

export const store = {
  async addLinkMapping(businessId: string, mapping: LinkMapping): Promise<void> {
    await prisma.linkMapping.create({
      data: {
        businessId,
        instagramPostId: mapping.instagramPostId,
        googleBusinessPostId: mapping.googleBusinessPostId,
        locationId: mapping.locationId,
        linkedAt: new Date(mapping.linkedAt),
      },
    });
  },

  async listLinkMappings(businessId: string): Promise<LinkMapping[]> {
    const rows = await prisma.linkMapping.findMany({
      where: { businessId },
      orderBy: { linkedAt: "desc" },
    });
    return rows.map((row) => ({
      instagramPostId: row.instagramPostId,
      googleBusinessPostId: row.googleBusinessPostId,
      locationId: row.locationId,
      linkedAt: row.linkedAt.toISOString(),
    }));
  },

  async findLinkByInstagramPostId(
    businessId: string,
    instagramPostId: string
  ): Promise<LinkMapping | undefined> {
    const row = await prisma.linkMapping.findUnique({
      where: { businessId_instagramPostId: { businessId, instagramPostId } },
    });
    if (!row) return undefined;
    return {
      instagramPostId: row.instagramPostId,
      googleBusinessPostId: row.googleBusinessPostId,
      locationId: row.locationId,
      linkedAt: row.linkedAt.toISOString(),
    };
  },
};
