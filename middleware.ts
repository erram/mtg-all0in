export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/collection/:path*', '/api/collection/:path*'],
}
