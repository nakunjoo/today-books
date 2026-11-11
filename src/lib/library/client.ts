// 도서관 정보나루 Open API (https://www.data4library.kr)
const LIBRARY_BASE = "http://data4library.kr/api";

export type LibraryLoanItem = {
  ranking: string;
  bookname: string;
  authors: string;
  publisher: string;
  publication_year: string;
  isbn13: string;
  addition_symbol: string;
  vol: string;
  class_no: string;
  class_nm: string; // 예: "문학 > 한국문학 > 소설"
  loan_count: string;
  bookImageURL: string;
};

type LoanItemResponse = {
  response?: {
    error?: string;
    docs?: Array<{ doc: LibraryLoanItem }>;
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

// 인기대출도서 조회 (loanItemSrch)
// dtlKdc: KDC 세부주제 (예: 813 한국소설, 833 일본소설, 843 영미소설), 여러 개는 ";"로 연결
// addCode: ISBN 부가기호 (0 = 교양) — 아동/학습서 제외용
export async function fetchPopularLoans(opts: {
  dtlKdc: number[];
  days?: number;
  pageSize?: number;
  addCode?: number;
}): Promise<LibraryLoanItem[]> {
  // 정보나루 대출 데이터는 집계가 며칠 늦게 반영되므로 어제까지로 조회
  const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - (opts.days ?? 30) * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    authKey: authKey(),
    startDt: ymd(start),
    endDt: ymd(end),
    dtl_kdc: opts.dtlKdc.join(";"),
    pageNo: "1",
    pageSize: String(opts.pageSize ?? 100),
    format: "json",
    ...(opts.addCode !== undefined ? { addCode: String(opts.addCode) } : {}),
  });
  const res = await fetch(`${LIBRARY_BASE}/loanItemSrch?${params}`, { cache: "no-store" });
  const text = await res.text();

  let data: LoanItemResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`정보나루 API 응답이 JSON이 아님 (status ${res.status}): ${text.slice(0, 300)}`);
  }
  if (data.response?.error) throw new Error(`정보나루 API 오류: ${data.response.error}`);

  return (data.response?.docs ?? []).map((d) => d.doc);
}
