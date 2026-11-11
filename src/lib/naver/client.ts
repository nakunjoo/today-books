// 네이버 책 검색 API (https://developers.naver.com/docs/serviceapi/search/book/book.md)
const NAVER_BOOK_URL = "https://openapi.naver.com/v1/search/book.json";

export type NaverBook = {
  title: string;
  author: string; // 여러 명이면 "^"로 구분
  publisher: string;
  isbn: string; // "ISBN10 ISBN13" 또는 "ISBN13"
  image: string;
  description: string;
  link: string;
};

type NaverBookResponse = {
  items?: NaverBook[];
  errorMessage?: string;
};

// 검색 결과에 섞여오는 <b> 태그와 HTML 엔티티 제거
function clean(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

// ISBN13으로 단일 도서 조회
export async function fetchNaverBookByIsbn(isbn13: string): Promise<NaverBook | null> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Missing NAVER_CLIENT_ID / NAVER_CLIENT_SECRET in env");

  const res = await fetch(`${NAVER_BOOK_URL}?${new URLSearchParams({ query: isbn13, display: "1" })}`, {
    headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    cache: "no-store",
  });
  const data = (await res.json()) as NaverBookResponse;
  if (!res.ok) throw new Error(`네이버 책 검색 API 오류 (status ${res.status}): ${data.errorMessage ?? ""}`);

  const item = data.items?.find((b) => b.isbn.split(" ").includes(isbn13));
  if (!item) return null;

  return {
    ...item,
    title: clean(item.title),
    author: clean(item.author).replace(/\^/g, ", "),
    publisher: clean(item.publisher),
    description: clean(item.description),
  };
}
