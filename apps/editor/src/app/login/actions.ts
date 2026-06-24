'use server';

import { redirect } from 'next/navigation';
import { setSession } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';

export async function ownerLoginAction(formData: FormData) {
  const masterKey = formData.get('masterKey') as string;
  const totp = formData.get('totp') as string | null;

  try {
    const { token } = await api.auth.ownerLogin(masterKey);
    await setSession(token);
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : 'Login failed';
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }
  redirect('/admin');
}

export async function clientLoginAction(formData: FormData) {
  const siteId = formData.get('siteId') as string;
  const password = formData.get('password') as string;

  try {
    const { token } = await api.auth.clientLogin(siteId, password);
    await setSession(token);
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : 'Login failed';
    redirect(`/login?siteId=${siteId}&error=${encodeURIComponent(msg)}`);
  }
  redirect(`/editor/${siteId}`);
}
