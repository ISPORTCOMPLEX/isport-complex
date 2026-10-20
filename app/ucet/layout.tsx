import { requireUser } from '@/lib/session';
import { AccountNav } from '@/components/account/AccountNav';
import { logoutAction } from '@/lib/actions/auth';
import { isStaff, ROLE_LABEL } from '@/lib/staff';

export const metadata = { robots: { index: false } };

export default async function UcetLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/ucet');
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  return (
    <>
      <section className="rz-band ac-band">
        <div className="wrap ac-band__in">
          <div className="ac-band__me">
            <span className="acct__avatar" aria-hidden="true">
              {initials}
            </span>
            <span>
              <small>Môj účet</small>
              <strong className="cond">
                {user.firstName} {user.lastName}
              </strong>
              <em>
                {user.email}
                {user.role !== 'CUSTOMER' ? <b className="role-badge">{ROLE_LABEL[user.role] ?? user.role}</b> : null}
              </em>
            </span>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="ac-logout">
              Odhlásiť sa
            </button>
          </form>
        </div>
        <div className="wrap">
          <AccountNav staff={isStaff(user.role)} />
        </div>
      </section>
      <section className="ice acct">
        <div className="wrap acct__main">{children}</div>
      </section>
    </>
  );
}
