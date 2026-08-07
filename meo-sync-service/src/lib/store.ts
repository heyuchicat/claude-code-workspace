import { GoogleBusinessPost, LinkMapping } from "./types";

// プロトタイプ用のインメモリストア。
// Next.js の dev サーバーはモジュールをホットリロードするため、
// globalThis に状態を退避してリロードをまたいでデータを保持する。
// 本番ではDB(Postgres等)に置き換える。

type StoreState = {
  googleBusinessPosts: GoogleBusinessPost[];
  linkMappings: LinkMapping[];
  postSeq: number;
};

const globalForStore = globalThis as unknown as {
  __meoStore?: StoreState;
};

function getState(): StoreState {
  if (!globalForStore.__meoStore) {
    globalForStore.__meoStore = {
      googleBusinessPosts: [],
      linkMappings: [],
      postSeq: 0,
    };
  }
  return globalForStore.__meoStore;
}

export const store = {
  nextGoogleBusinessPostSeq(): number {
    const state = getState();
    state.postSeq += 1;
    return state.postSeq;
  },

  addGoogleBusinessPost(post: GoogleBusinessPost) {
    getState().googleBusinessPosts.push(post);
  },

  listGoogleBusinessPosts(): GoogleBusinessPost[] {
    return [...getState().googleBusinessPosts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  addLinkMapping(mapping: LinkMapping) {
    getState().linkMappings.push(mapping);
  },

  listLinkMappings(): LinkMapping[] {
    return [...getState().linkMappings];
  },

  findLinkByInstagramPostId(instagramPostId: string): LinkMapping | undefined {
    return getState().linkMappings.find(
      (m) => m.instagramPostId === instagramPostId
    );
  },

  reset() {
    globalForStore.__meoStore = {
      googleBusinessPosts: [],
      linkMappings: [],
      postSeq: 0,
    };
  },
};
