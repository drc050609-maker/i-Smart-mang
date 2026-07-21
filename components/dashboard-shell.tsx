"use client";

import { useState, type ComponentType, type SVGProps } from "react";
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
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
  PhotoIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  ShoppingBagIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { BrandLogo } from "@/components/brand-logo";
import { StaffProfileFooter } from "@/components/staff-profile-footer";
import { useLanguage } from "@/components/language-provider";
import { getNavTranslationKey } from "@/lib/i18n";
import type { StaffRole } from "@/lib/staff-role";
import {
  formatStaffLocationLabel,
  type StaffLocation,
} from "@/lib/staff-location";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = { name: string; href: string; icon: Icon };

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "Students", href: "/students", icon: UsersIcon },
  { name: "Leads", href: "/leads", icon: UserPlusIcon },
  { name: "Classes", href: "/classes", icon: FolderIcon },
  { name: "Tutors", href: "/tutors", icon: AcademicCapIcon },
  { name: "Tuitions", href: "/tuitions", icon: BanknotesIcon },
  { name: "Payments", href: "/payments", icon: CreditCardIcon },
  { name: "Books & Purchases", href: "/purchases", icon: ShoppingBagIcon },
  { name: "Statements", href: "/statements", icon: ChartBarSquareIcon },
  { name: "Attendance", href: "/attendance", icon: ClipboardDocumentCheckIcon },
  { name: "Schedule", href: "/schedule", icon: CalendarIcon },
  { name: "Events", href: "/events", icon: PhotoIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

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
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { t } = useLanguage();

  return (
    <ul role="list" className="-mx-2 space-y-1">
      {navigation.map((item) => {
        const current = navItemIsCurrent(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => onNavigate?.()}
              className={classNames(
                current
                  ? "bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white"
                  : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white",
                "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
              )}
            >
              <item.icon
                aria-hidden="true"
                className={classNames(
                  current
                    ? "text-indigo-600 dark:text-white"
                    : "text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white",
                  "size-6 shrink-0",
                )}
              />
              {t(getNavTranslationKey(item.href))}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BrandMark({
  location,
  onNavigate,
}: {
  location: StaffLocation;
  onNavigate?: () => void;
}) {
  const { language } = useLanguage();

  return (
    <Link
      href="/"
      onClick={() => onNavigate?.()}
      className="relative flex h-24 shrink-0 flex-col justify-center gap-1"
    >
      <BrandLogo className="h-auto w-full max-w-52 rounded-sm bg-white" priority />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {formatStaffLocationLabel(location, language)}
      </span>
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
  };
  activeCampus: StaffLocation;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const closeMobile = () => setSidebarOpen(false);

  const currentNavItem = navigation.find((item) =>
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

  return (
    <div className="min-h-full">
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
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

            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2 dark:bg-gray-900 dark:ring dark:ring-white/10 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:bg-black/10">
              <BrandMark location={activeCampus} onNavigate={closeMobile} />
              <nav className="relative flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <NavLinks pathname={pathname} onNavigate={closeMobile} />
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

      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col dark:bg-gray-900">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 dark:border-white/10 dark:bg-black/10">
          <BrandMark location={activeCampus} />
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <NavLinks pathname={pathname} />
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
      </div>

      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-xs sm:px-6 lg:hidden dark:bg-gray-900 dark:shadow-none dark:after:pointer-events-none dark:after:absolute dark:after:inset-0 dark:after:border-b dark:after:border-white/10 dark:after:bg-black/10">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:text-white"
        >
          <span className="sr-only">{t("common.openSidebar")}</span>
          <Bars3Icon aria-hidden="true" className="size-6" />
        </button>
        <div className="flex-1 text-sm/6 font-semibold text-gray-900 dark:text-white">
          {pageTitle}
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-white/10 dark:text-indigo-300">
          {staffInitials || "IS"}
        </span>
      </div>

      <main className="py-10 lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
