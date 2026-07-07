function IconBase({ children, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function BrandIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M7 7.5C8.2 5.4 10 4.3 12 4.3c3.1 0 5.6 2.4 5.6 5.6S15.1 15.5 12 15.5H8.7" />
      <path d="M17 16.5c-1.2 2.1-3 3.2-5 3.2-3.1 0-5.6-2.4-5.6-5.6S8.9 8.5 12 8.5h3.3" />
      <path d="M8.7 15.5 6 18.2l2.7 1.5" />
      <path d="M15.3 8.5 18 5.8l-2.7-1.5" />
    </IconBase>
  )
}

export function DashboardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </IconBase>
  )
}

export function StudentsIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  )
}

export function PaymentIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
      <path d="M15 15h2" />
    </IconBase>
  )
}

export function AttendanceIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-5" />
    </IconBase>
  )
}

export function AlertIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </IconBase>
  )
}

export function ActivityIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M22 12h-4l-3 8L9 4l-3 8H2" />
    </IconBase>
  )
}

export function ChartIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 3 3 5-6" />
    </IconBase>
  )
}

export function ListIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </IconBase>
  )
}

export function CheckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  )
}

export function HealthIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      <path d="M3.5 12H8l2-3 4 6 2-3h4.5" />
    </IconBase>
  )
}

export function LogoutIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </IconBase>
  )
}

export function ArrowLeftIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </IconBase>
  )
}

export function Icon({ name, ...props }) {
  const icons = {
    activity: ActivityIcon,
    alert: AlertIcon,
    attendance: AttendanceIcon,
    brand: BrandIcon,
    chart: ChartIcon,
    check: CheckIcon,
    dashboard: DashboardIcon,
    health: HealthIcon,
    list: ListIcon,
    logout: LogoutIcon,
    payments: PaymentIcon,
    students: StudentsIcon,
  }
  const Component = icons[name] || ActivityIcon
  return <Component {...props} />
}
