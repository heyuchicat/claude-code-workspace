import { prisma } from "./db";
import { LinkMapping } from "./types";

// Instagram投稿 <-> Googleビジネスプロフィール投稿 の紐づけ状態を
// SQLite(Prisma)に永続化する。GoogleBusinessPost自体はGoogle側が原本を持つため
// ローカルには保存せず、必要な時にAPIから読み直す(mock-google-business.ts / google-business.ts 参照)。

export const store = {
  async addLinkMapping(mapping: LinkMapping): Promise<void> {
    await prisma.linkMapping.create({
      data: {
        instagramPostId: mapping.instagramPostId,
        googleBusinessPostId: mapping.googleBusinessPostId,
        locationId: mapping.locationId,
        linkedAt: new Date(mapping.linkedAt),
      },
    });
  },

  async listLinkMappings(): Promise<LinkMapping[]> {
    const rows = await prisma.linkMapping.findMany({
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
    instagramPostId: string
  ): Promise<LinkMapping | undefined> {
    const row = await prisma.linkMapping.findUnique({
      where: { instagramPostId },
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
