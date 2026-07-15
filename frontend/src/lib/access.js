export const ROLES = {
  ACADEMIC: 'academic',
  FINANCE: 'finance',
  TEACHER: 'teacher',
  DIRECTOR: 'director',
  ADMIN: 'admin',
}

// Each portal section and the roles allowed to enter it. Mirrors the
// role-based access already enforced by the backend services (admin has
// implicit access everywhere, same as require_role() on the API side).
const SECTION_ACCESS = [
  { prefix: '/dashboard', roles: [ROLES.DIRECTOR, ROLES.ADMIN] },
  { prefix: '/students', roles: [ROLES.ACADEMIC, ROLES.ADMIN] },
  { prefix: '/payments', roles: [ROLES.FINANCE, ROLES.ADMIN] },
  { prefix: '/wellbeing', roles: [ROLES.TEACHER, ROLES.ADMIN] },
]

const HOME_BY_ROLE = {
  [ROLES.ACADEMIC]: '/students',
  [ROLES.FINANCE]: '/payments',
  [ROLES.TEACHER]: '/wellbeing',
  [ROLES.DIRECTOR]: '/dashboard',
  [ROLES.ADMIN]: '/dashboard',
}

function findSection(pathname) {
  return SECTION_ACCESS.find(
    (section) => pathname === section.prefix || pathname.startsWith(`${section.prefix}/`),
  )
}

export function getAllowedRoles(pathname) {
  return findSection(pathname)?.roles ?? null
}

export function canAccess(role, pathname) {
  const allowed = getAllowedRoles(pathname)
  return !allowed || allowed.includes(role)
}

export function getHomeForRole(role) {
  return HOME_BY_ROLE[role] || '/login'
}
