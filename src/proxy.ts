import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);

	// Optimistic redirect based on cookie presence
	// Note: This is NOT secure - always validate session in protected pages/actions
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard"], // Specify the routes the proxy applies to
};
