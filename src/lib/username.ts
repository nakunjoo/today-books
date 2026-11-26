// tarot-saju 아이디 로그인과 같은 규칙 (tarot-saju/lib/account/username.ts)
// Supabase Auth는 이메일로 계정을 만들어서, 아이디를 메일이 가지 않는 주소(.invalid)로 바꿔 씀
const USERNAME_RE = /^[a-z0-9]{4,20}$/;
const AUTH_EMAIL_DOMAIN = "id.kkorijeom.invalid";

// 영문 소문자·숫자 4~20자. 대문자는 소문자로 맞추고, 규칙에 맞지 않으면 null
export function normalizeUsername(value: string): string | null {
  const v = value.trim().toLowerCase();
  return USERNAME_RE.test(v) ? v : null;
}

// 아이디 → Supabase에 넘기는 로그인 주소
export const toAuthEmail = (username: string) => `${username}@${AUTH_EMAIL_DOMAIN}`;
