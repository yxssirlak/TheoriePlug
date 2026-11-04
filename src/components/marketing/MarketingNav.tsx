"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import PackageDropdown from "./package-dropdown";
import { packages } from "./packages-data";

const linkClass =
  "rounded-full px-3 py-2 text-base font-bold transition-colors hover:bg-paper/10 hover:text-lime sm:text-lg lg:px-4 lg:text-xl";

// Eén navbar voor alle marketingpagina's, zodat hij overal hetzelfde blijft.
export default function MarketingNav() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 px-4 py-6 sm:px-10 lg:px-16 xl:px-24 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <Link href="/">
        <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-7 sm:h-8 lg:h-9 w-auto" />
      </Link>
      <div className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 sm:gap-x-3 md:col-span-1 md:col-start-2 md:row-start-auto md:gap-x-2">
        <Link href="/contact" className={linkClass}>Contact</Link>
        <Link href="/over-ons" className={linkClass}>Over ons</Link>
        <Link href="/demo" className={linkClass}>Demo</Link>
        <PackageDropdown packages={packages} />
      </div>
      <Link href="/login" className="justify-self-end rounded-full border border-paper/30 px-4 py-2 text-base font-bold transition-colors hover:border-lime hover:bg-lime hover:text-ink sm:px-5 sm:text-lg lg:text-xl">
        Inloggen
      </Link>
    </motion.nav>
  );
}
