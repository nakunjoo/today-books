const ALADIN_BASE = "https://www.aladin.co.kr/ttb/api";

type AladinItem = {
  title: string;
  author: string;
  publisher: string;
  pubDate: string;
  isbn13: string;
  cover: string;
  description: string;
  categoryName: string;
};

type AladinListResponse = {
  item?: AladinItem[];
};

type AladinDetailResponse = {
  item?: Array<
    AladinItem & {
      subInfo?: {
        toc?: string;
      };
    }
  >;
};

function ttb(): string {
  const key = process.env.ALADIN_TTB_KEY;
  if (!key) throw new Error("Missing ALADIN_TTB_KEY in env");
  return key;
}

// 신간 / 베스트셀러 / 블로거 추천
export async function fetchAladinList(opts: {
  queryType: "ItemNewAll" | "Bestseller" | "BlogBest";
  max?: number;
  categoryId?: number;
}): Promise<AladinItem[]> {
  const params = new URLSearchParams({
    ttbkey: ttb(),
    QueryType: opts.queryType,
    MaxResults: String(opts.max ?? 50),
    SearchTarget: "Book",
    Output: "JS",
    Version: "20131101",
    ...(opts.categoryId ? { CategoryId: String(opts.categoryId) } : {}),
  });
  const res = await fetch(`${ALADIN_BASE}/ItemList.aspx?${params}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as AladinListResponse;
  return data.item ?? [];
}

// ISBN 단일 도서 상세
export async function fetchAladinDetail(isbn13: string) {
  const params = new URLSearchParams({
    ttbkey: ttb(),
    itemIdType: "ISBN13",
    ItemId: isbn13,
    Output: "JS",
    Version: "20131101",
    OptResult: "authors,fulldescription,Toc",
  });
  const res = await fetch(`${ALADIN_BASE}/ItemLookUp.aspx?${params}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as AladinDetailResponse;
  return data.item?.[0] ?? null;
}
