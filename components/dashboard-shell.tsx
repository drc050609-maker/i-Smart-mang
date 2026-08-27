"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
  type SVGProps,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import {
  AcademicCapIcon,
  BanknotesIcon,
  Bars3Icon,
  CalendarIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CreditCardIcon,
  PhotoIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { BrandLogo } from "@/components/brand-logo";
import { StaffProfileFooter } from "@/components/staff-profile-footer";
import { useLanguage } from "@/components/language-provider";
import { getNavTranslationKey } from "@/lib/i18n";
import {
  frontDeskHomePath,
  canAccessMyHours,
  isFrontDeskStaffRole,
  type StaffRole,
} from "@/lib/staff-role";
import {
  formatStaffLocationLabel,
  type StaffLocation,
} from "@/lib/staff-location";
import { WEBSITE_CHAT_VISIBLE } from "@/lib/website-chat-feature";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  name: string;
  href: string;
  icon: Icon;
  adminOnly?: boolean;
  frontDeskOnly?: boolean;
  hideForFrontDesk?: boolean;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: HomeIcon, hideForFrontDesk: true },
  { name: "Leads", href: "/leads", icon: UserPlusIcon, hideForFrontDesk: true },
  {
    name: "Students",
    href: "/students",
    icon: UsersIcon,
    hideForFrontDesk: true,
  },
  {
    name: "Classes",
    href: "/classes",
    icon: FolderIcon,
    hideForFrontDesk: true,
  },
  {
    name: "Attendance",
    href: "/attendance",
    icon: ClipboardDocumentCheckIcon,
    hideForFrontDesk: true,
  },
  {
    name: "Teachers",
    href: "/tutors",
    icon: AcademicCapIcon,
    hideForFrontDesk: true,
  },
  {
    name: "Tuitions",
    href: "/tuitions",
    icon: BanknotesIcon,
    hideForFrontDesk: true,
  },
  {
    name: "Payments",
    href: "/payments",
    icon: CreditCardIcon,
    hideForFrontDesk: true,
  },
  {
    name: "Statements",
    href: "/statements",
    icon: ChartBarSquareIcon,
    hideForFrontDesk: true,
  },
  { name: "Schedule", href: "/schedule", icon: CalendarIcon },
  {
    name: "My hours",
    href: "/my-hours",
    icon: ClockIcon,
    frontDeskOnly: true,
  },
  { name: "Events", href: "/events", icon: PhotoIcon, adminOnly: true },
  {
    name: "Chat",
    href: WEBSITE_CHAT_VISIBLE ? "/chat" : "/chat/teachers",
    icon: ChatBubbleLeftRightIcon,
    adminOnly: true,
  },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

function visibleNavigation(role: StaffRole, teacherId: number | null) {
  return navigation.filter((item) => {
    if (item.adminOnly && role !== "admin") return false;
    if (item.frontDeskOnly && !canAccessMyHours(role, teacherId)) return false;
    if (item.hideForFrontDesk && role === "front_desk") return false;
    return true;
  });
}

const SIDEBAR_STORAGE_KEY = "ismart-dashboard-sidebar-width";
/** Default expanded width — enough for nav labels without wrapping. */
const SIDEBAR_DEFAULT_WIDTH = 304;
/** Compact icon rail — same size as the old collapsed sidebar (w-20). */
const SIDEBAR_MIN_WIDTH = 80;
/** Narrowest expanded width that still shows full nav labels. */
const SIDEBAR_EXPANDED_MIN_WIDTH = 248;
const SIDEBAR_MAX_WIDTH = 420;

function readStoredSidebarWidth() {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return SIDEBAR_DEFAULT_WIDTH;
  return snapSidebarWidth(parsed);
}

function snapSidebarWidth(width: number) {
  const compactCutoff =
    (SIDEBAR_MIN_WIDTH + SIDEBAR_EXPANDED_MIN_WIDTH) / 2;
  if (width < compactCutoff) return SIDEBAR_MIN_WIDTH;
  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_EXPANDED_MIN_WIDTH, width),
  );
}

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function navItemIsCurrent(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
  role,
  teacherId,
  compact,
}: {
  pathname: string;
  onNavigate?: () => void;
  role: StaffRole;
  teacherId: number | null;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const visibleNav = visibleNavigation(role, teacherId);

  return (
    <ul role="list" className="-mx-2 space-y-1">
      {visibleNav.map((item) => {
        const current = navItemIsCurrent(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => onNavigate?.()}
              title={compact ? t(getNavTranslationKey(item.href)) : undefined}
              className={classNames(
                current
                  ? "bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200"
                  : "text-gray-700 hover:bg-violet-50/70 hover:text-violet-800 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white",
                compact ? "justify-center px-2" : "gap-x-3 px-2",
                "group flex rounded-lg px-2 py-1.5 text-sm/6 font-semibold transition-colors",
              )}
            >
              <item.icon
                aria-hidden="true"
                className={classNames(
                  current
                    ? "text-violet-600 dark:text-violet-300"
                    : "text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-300",
                  "size-6 shrink-0",
                )}
              />
              {compact ? (
                <span className="sr-only">
                  {t(getNavTranslationKey(item.href))}
                </span>
              ) : (
                <span className="whitespace-nowrap">
                  {t(getNavTranslationKey(item.href))}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BrandMark({
  location,
  homeHref = "/",
  onNavigate,
  compact,
}: {
  location: StaffLocation;
  homeHref?: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { language } = useLanguage();
  const href = homeHref || "/";

  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={classNames(
        "relative flex shrink-0 flex-col justify-center",
        compact ? "h-16 items-center" : "h-24 gap-1",
      )}
    >
      <BrandLogo
        className={classNames(
          "h-auto rounded-sm bg-white",
          compact ? "w-10" : "w-full max-w-52",
        )}
        priority
      />
      {compact ? null : (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {formatStaffLocationLabel(location, language)}
        </span>
      )}
    </Link>
  );
}

export function DashboardShell({
  children,
  staff,
  activeCampus,
}: {
  children: React.ReactNode;
  staff: {
    fullName: string | null;
    email: string;
    role: StaffRole;
    location: StaffLocation;
    teacherId: number | null;
  };
  activeCampus: StaffLocation;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const closeMobile = () => setSidebarOpen(false);
  const compact = sidebarWidth <= SIDEBAR_MIN_WIDTH + 24;

  useEffect(() => {
    setSidebarWidth(readStoredSidebarWidth());
  }, []);

  const visibleNav = visibleNavigation(staff.role, staff.teacherId);
  const homeHref = isFrontDeskStaffRole(staff.role)
    ? frontDeskHomePath()
    : "/";
  const safeHomeHref = homeHref || "/";
  const currentNavItem = visibleNav.find((item) =>
    navItemIsCurrent(item.href, pathname),
  );
  const pageTitle = currentNavItem
    ? t(getNavTranslationKey(currentNavItem.href))
    : t("nav.dashboard");

  const staffInitials = (staff.fullName?.trim() || staff.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const handleResizeMove = useCallback((event: PointerEvent) => {
    const next = Math.min(
      SIDEBAR_MAX_WIDTH,
      Math.max(SIDEBAR_MIN_WIDTH, event.clientX),
    );
    setSidebarWidth(next);
  }, []);

  const stopResize = useCallback(() => {
    setIsResizing(false);
    setSidebarWidth((current) => {
      const next = snapSidebarWidth(current);
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleResizeMove, stopResize]);

  return (
    <div className="min-h-full bg-[#faf9fc] dark:bg-slate-950">
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/60 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 p-2.5"
                >
                  <span className="sr-only">{t("common.closeSidebar")}</span>
                  <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>

            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2 dark:bg-slate-900 dark:ring dark:ring-white/10">
              <BrandMark
                location={activeCampus}
                homeHref={safeHomeHref}
                onNavigate={closeMobile}
              />
              <nav className="relative flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <NavLinks
                      pathname={pathname}
                      onNavigate={closeMobile}
                      role={staff.role}
                      teacherId={staff.teacherId}
                    />
                  </li>
                </ul>
                <StaffProfileFooter
                  fullName={staff.fullName}
                  email={staff.email}
                  role={staff.role}
                  location={staff.location}
                />
              </nav>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div
        className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col"
        style={{ width: sidebarWidth }}
      >
        <div className="relative flex grow flex-col gap-y-5 overflow-y-auto border-r border-violet-100/80 bg-white px-3 pt-4 dark:border-white/10 dark:bg-slate-900">
          <div className={compact ? "px-1" : "px-3"}>
            <BrandMark
              location={activeCampus}
              homeHref={safeHomeHref}
              compact={compact}
            />
          </div>

          <nav className="flex flex-1 flex-col px-1 pb-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <NavLinks
                  pathname={pathname}
                  role={staff.role}
                  teacherId={staff.teacherId}
                  compact={compact}
                />
              </li>
            </ul>
            <StaffProfileFooter
              fullName={staff.fullName}
              email={staff.email}
              role={staff.role}
              location={staff.location}
              compact={compact}
            />
          </nav>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("common.resizeSidebar")}
            onPointerDown={(event) => {
              event.preventDefault();
              setIsResizing(true);
            }}
            className={classNames(
              "absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize bg-transparent hover:bg-violet-200/80",
              isResizing && "bg-violet-300",
            )}
          />
        </div>
      </div>

      <div className="sticky top-0 z-40 flex items-center gap-x-6 border-b border-violet-100/80 bg-white/95 px-4 py-4 shadow-xs backdrop-blur sm:px-6 lg:hidden dark:border-white/10 dark:bg-slate-900/90">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden dark:text-gray-300 dark:hover:text-white"
        >
          <span className="sr-only">{t("common.openSidebar")}</span>
          <Bars3Icon aria-hidden="true" className="size-6" />
        </button>
        <div className="flex-1 text-sm/6 font-semibold text-gray-900 dark:text-white">
          {pageTitle}
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          {staffInitials || "IS"}
        </span>
      </div>

      <main
        className="py-10 transition-[padding] duration-150 lg:pl-[var(--sidebar-pad)]"
        style={
          {
            ["--sidebar-pad"]: `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
