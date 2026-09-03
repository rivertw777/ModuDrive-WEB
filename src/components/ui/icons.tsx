import { forwardRef, type SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function createIcon(path: React.ReactNode) {
  return forwardRef<SVGSVGElement, IconProps>(function Icon({ size = 18, ...props }, ref) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {path}
      </svg>
    )
  })
}

export const FolderIcon = createIcon(
  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
)

export const FolderPlusIcon = createIcon(
  <>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M12 11v4M10 13h4" />
  </>,
)

export const FileIcon = createIcon(
  <>
    <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v4h4" />
  </>,
)

export const DocumentIcon = createIcon(
  <>
    <path d="M18 3h-8l-4 4v13a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z" />
    <path d="M10 3v4h-4" />
    <path d="M9 10h6M9 13h6M9 16h6M9 19h3" />
  </>,
)

export const ImageIcon = createIcon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="9.5" cy="9.5" r="1.5" />
    <path d="m5 19 5-5 3 3 4-4 3 3" />
  </>,
)

export const VideoIcon = createIcon(
  <>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m16 10.5 5.2-3.48a.5.5 0 0 1 .8.4v9.16a.5.5 0 0 1-.8.4L16 13.5" />
  </>,
)

export const MusicIcon = createIcon(
  <>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </>,
)

export const FilesIcon = createIcon(
  <>
    <path d="M9 2h6l4 4v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="M15 2v4h4" />
    <path d="M5 7v13a1 1 0 0 0 1 1h9" />
  </>,
)

export const UploadIcon = createIcon(
  <>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </>,
)

export const DownloadIcon = createIcon(
  <>
    <path d="M12 4v12M7 11l5 5 5-5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </>,
)

export const ShareIcon = createIcon(
  <>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.3 10.7 7.4-4.4M8.3 13.3l7.4 4.4" />
  </>,
)

export const TrashIcon = createIcon(
  <>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.1a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9L6 7" />
    <path d="M10 11v6M14 11v6" />
  </>,
)

export const RestoreIcon = createIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </>,
)

export const XIcon = createIcon(<path d="M18 6 6 18M6 6l12 12" />)

export const ChevronRightIcon = createIcon(<path d="m9 6 6 6-6 6" />)

export const CheckIcon = createIcon(<path d="m5 13 4 4L19 7" />)

export const LogOutIcon = createIcon(
  <>
    <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </>,
)

export const SunIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
)

export const MoonIcon = createIcon(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />)

export const LoaderIcon = createIcon(<path d="M12 3a9 9 0 1 0 9 9" />)

export const FolderOpenIcon = createIcon(
  <path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a1 1 0 0 1 1 1l-2 9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />,
)

export const AlertCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </>,
)

export const PencilIcon = createIcon(
  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
)

export const MoveIcon = createIcon(
  <>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 14h6M12 11l3 3-3 3" />
  </>,
)

export const UsersIcon = createIcon(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c1-3 3-4.5 5.5-4.5s4.5 1.5 5.5 4.5" />
    <path d="M16 8.2a3.2 3.2 0 1 1 1.8 5.9M18.5 19c-.5-1.7-1.4-3-2.7-3.9" />
  </>,
)

export const StarIcon = createIcon(
  <path d="m12 3 2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 20l1.4-6.3-4.8-4.3 6.4-.6z" />,
)

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
)

export const CloudIcon = createIcon(
  <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.5A5 5 0 0 0 6.5 19h11z" />,
)

export const BellIcon = createIcon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>,
)

export const ArrowDownIcon = createIcon(<path d="M12 4v16m0 0-6-6m6 6 6-6" />)

export const InfoIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 8h.01" />
  </>,
)

export const MoreVerticalIcon = createIcon(
  <>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </>,
)

export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
)

export const ListIcon = createIcon(
  <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </>,
)

export const ArrowLeftIcon = createIcon(<path d="M19 12H5m0 0 6 6m-6-6 6-6" />)

export const HelpCircleIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 0 1 4.9.75c0 1.5-2.4 2-2.4 3.5" />
    <path d="M12 17h.01" />
  </>,
)

export const UserPlusIcon = createIcon(
  <>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    <path d="M19 8v6M22 11h-6" />
  </>,
)

export const LinkIcon = createIcon(
  <>
    <path d="M9 15 15 9" />
    <path d="M10.5 6.5 12 5a3.5 3.5 0 0 1 5 5l-1.5 1.5" />
    <path d="M13.5 17.5 12 19a3.5 3.5 0 0 1-5-5l1.5-1.5" />
  </>,
)

export const LockIcon = createIcon(
  <>
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
)

export const GlobeIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
  </>,
)

export const GridIcon = createIcon(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
)
