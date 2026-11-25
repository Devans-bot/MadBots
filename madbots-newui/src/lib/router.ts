import type { AppRoute } from '../types';

export function parseRoute(pathname: string, defaultBotId: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/settings') {
    return { name: 'settings' };
  }
  if (clean === '/chat') {
    return { name: 'chat', botId: defaultBotId };
  }
  if (clean.startsWith('/chat/')) {
    const botId = decodeURIComponent(clean.slice('/chat/'.length));
    return { name: 'chat', botId: botId || defaultBotId };
  }
  return { name: 'home' };
}

export function routeToPath(route: AppRoute): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'settings':
      return '/settings';
    case 'chat':
      return `/chat/${encodeURIComponent(route.botId)}`;
  }
}
