// 도서관 정보나루 Open API (https://www.data4library.kr)
const LIBRARY_BASE = "http://data4library.kr/api";

export type LibraryLoanItem = {
  ranking: string;
  bookname: string; // 예: "안녕이라 그랬어 :김애란 소설" (부제 포함)
  authors: string; // 예: "지은이: 김애란"
  publisher: string;
  publication_year: string;
  isbn13: string;
  addition_symbol: string;
  vol: string;
  class_no: string; // KDC 분류번호, 예: "813.7"
  class_nm: string; // 예: "문학 > 한국문학 > 소설"
  loan_count: string;
  bookImageURL: string;
};

export type LibraryBookDetail = LibraryLoanItem & {
  description: string;
};

type LibraryResponse<T> = {
  response?: {
    error?: string;
    docs?: Array<{ doc: T }>;
    detail?: Array<{ book: T }>;
  };
};

function authKey(): string {
  const key = process.env.DATA4LIBRARY_AUTH_KEY;
  if (!key) throw new Error("Missing DATA4LIBRARY_AUTH_KEY in env");
  return key;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function callLibrary<T>(path: string, params: Record<string, string>): Promise<LibraryResponse<T>> {
  const res = await fetch(`${LIBRARY_BASE}/${path}?${new URLSearchParams({ authKey: authKey(), format: "json", ...params })}`, {
    cache: "no-store",
  });
  const text = await res.text();

  // 서버 오류 시 HTML 에러 페이지가 오는 경우가 있어서 원인을 알 수 있게 에러로 바꿈
  let data: LibraryResponse<T>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`정보나루 API 응답이 JSON이 아님 (${path}, status ${res.status}): ${text.replace(/\s+/g, " ").slice(0, 200)}`);
  }
  if (data.response?.error) throw new Error(`정보나루 API 오류 (${path}): ${data.response.error}`);
  return data;
}

// 인기대출도서 조회 (loanItemSrch)
// kdc: KDC 대주제 (8 = 문학). 세부주제(dtl_kdc=813 등)로 조회하면 0권/HTML 에러가 와서 대주제로 받은 뒤 class_no로 거름
// addCode: ISBN 부가기호 (0 = 교양) — 아동/학습서 제외용
export async function fetchPopularLoans(opts: {
  kdc: number;
  days?: number;
  pageSize?: number;
  addCode?: number;
}): Promise<LibraryLoanItem[]> {
  // 정보나루 대출 데이터는 집계가 며칠 늦게 반영되므로 어제까지로 조회
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - (opts.days ?? 30) * 24 * 60 * 60 * 1000);

  const data = await callLibrary<LibraryLoanItem>("loanItemSrch", {
    startDt: ymd(start),
    endDt: ymd(end),
    kdc: String(opts.kdc),
    pageNo: "1",
    pageSize: String(opts.pageSize ?? 200),
    ...(opts.addCode !== undefined ? { addCode: String(opts.addCode) } : {}),
  });
  return (data.response?.docs ?? []).map((d) => d.doc);
}

// 도서 상세 조회 (srchDtlList) — 소개글은 보통 100~200자 내외로 짧음
export async function fetchBookDetail(isbn13: string): Promise<LibraryBookDetail | null> {
  const data = await callLibrary<LibraryBookDetail>("srchDtlList", { isbn13, loaninfoYN: "N" });
  return data.response?.detail?.[0]?.book ?? null;
}

// KDC 분류번호가 소설(8x3: 813 한국, 823 중국, 833 일본, 843 영미, 853 독일, 863 프랑스 …)인지
export function isNovel(classNo: string): boolean {
  return /^8\d3(\.|$)/.test(classNo ?? "");
}

// "안녕이라 그랬어 :김애란 소설", "할매 =황석영 장편소설 /Grandma" → 본제목만
export function cleanTitle(bookname: string): string {
  return bookname.split(/\s[:=/]/)[0].trim();
}

// "지은이: 김애란", "지은이: 히가시노 게이고 ;옮긴이: 김선영", "앤디 위어 지음 ;강동혁 옮김" → 지은이만
export function cleanAuthor(authors: string): string {
  const first = authors.split(";")[0].trim();
  return first.replace(/^[^:]*:\s*/, "").replace(/\s*(지음|글|저|著)$/, "").trim();
}

// 소개글에 섞여오는 HTML 엔티티/태그 정리
export function cleanDescription(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

// 표지는 대부분 알라딘 이미지 서버 주소로 옴 (cover200) → 고화질(cover500)로 업그레이드
// 네이버(bookthumb-phinf.pstatic.net/cover/...) 등 다른 서버는 경로를 바꾸면 404라서 알라딘만 바꿈
export function upgradeCoverUrl(url: string): string {
  if (!/^https?:\/\/image\.aladin\.co\.kr\//i.test(url)) return url;
  return url.replace(/\/cover\d*\//i, "/cover500/").replace(/\/coversum\//i, "/cover500/");
}
