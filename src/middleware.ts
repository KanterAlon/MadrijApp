import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

// Use the Node.js runtime so Clerk's middleware can execute without Edge
// runtime restrictions, such as disallowing dynamic code evaluation.
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
  runtime: 'nodejs',
}
