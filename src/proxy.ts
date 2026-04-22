export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/manager", "/manager/:path*", "/api/admin/:path*"],
};
