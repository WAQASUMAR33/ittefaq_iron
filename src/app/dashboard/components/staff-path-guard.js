'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { canStaffAccessPath, getStaffRoleName } from '@/lib/staff-access';

/**
 * Must be rendered inside <Suspense> (Next.js App Router) because usePathname
 * can suspend during static prerendering.
 */
export default function StaffPathGuard({ user, isClient }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isClient || !user || pathname == null) return;
    if (canStaffAccessPath(user, pathname)) return;
    router.replace('/dashboard?access=denied');
  }, [isClient, user, pathname, router]);

  return null;
}
