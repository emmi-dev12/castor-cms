import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AppEntry() {
  const session = await getSession();
  if (session?.payload.role === 'owner') redirect('/admin');
  if (session?.payload.role === 'client' && session.payload.siteId) {
    redirect(`/editor/${session.payload.siteId}`);
  }
  redirect('/login');
}
