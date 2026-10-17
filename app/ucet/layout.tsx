import { requireUser } from '@/lib/session';
import { AccountNav } from '@/components/account/AccountNav';
import { logoutAction } from '@/lib/actions/auth';
import { isStaff, ROLE_LABEL } from '@/lib/staff';

export const metadata = { robots: { index: false } };


export default async function UcetLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/ucet');
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  return (
    <section className="acct">
      <div className="wrap acct__in">
        <aside className="acct__side">
          <div className="acct__me card">
            <div className="acct__avatar" aria-hidden="true">
              {initials}
            </div>
            <div>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <small>{user.email}</small>
              {user.role !== 'CUSTOMER' ? <span className="role-badge">{ROLE_LABEL[user.role] ?? user.role}</span> : null}
            </div>
          </div>
          <AccountNav staff={isStaff(user.role)} />
          <form action={logoutAction}>
            <button type="submit" className="acct__logout">
              Odhlásiť sa
            </button>
          </form>
        </aside>
        <div className="acct__main">{children}</div>
      </div>
    </section>
  );
}
