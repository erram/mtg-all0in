export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/collection/:path*',
    '/api/collection/:path*',
    '/builder/:path*',
    '/api/builder/:path*',
    '/matches/:path*',
    '/api/matches/:path*',
    '/wants/:path*',
    '/api/wants/:path*',
  ],
}
