"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import CTAButton from "@/components/ui/button-cta";
import { Menu, X } from "lucide-react";

const headerNavLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const lastScrollPosition = useRef(0);
  const ticking = useRef(false);
  const isMenuOpenRef = useRef(false);

  const toggleMobileMenu = () => {
    if (isMenuOpen) {
      headerRef.current?.classList.add("active");
    } else {
      headerRef.current?.classList.remove("active");
    }
    setIsMenuOpen(!isMenuOpen);
    isMenuOpenRef.current = !isMenuOpen;
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    isMenuOpenRef.current = false;
  };

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const isDesktop = window.innerWidth >= 1024;
    const delta = isDesktop ? 70 : 100;

    function handleScroll() {
      if (!header) return;

      const currentScrollPosition = window.scrollY;

      if (
        Math.abs(currentScrollPosition - lastScrollPosition.current) > delta
      ) {
        if (currentScrollPosition > lastScrollPosition.current) {
          header.classList.add("menu-hidden");
          if (isMenuOpenRef.current) {
            setIsMenuOpen(false);
            isMenuOpenRef.current = false;
          }
        } else {
          header.classList.remove("menu-hidden");
        }
        lastScrollPosition.current = currentScrollPosition;
      }
      ticking.current = false;
    }

    function onScroll() {
      if (!header) return;

      if (!isMenuOpenRef.current) {
        if (!ticking.current) {
          window.requestAnimationFrame(handleScroll);
          ticking.current = true;
        }
      }

      if (window.scrollY > 0) {
        if (!isMenuOpenRef.current) {
          header.classList.add("active");
        }
      } else {
        header.classList.remove("active");
      }
    }

    if (window.scrollY > 0) {
      header.classList.add("active");
    }
    lastScrollPosition.current = window.scrollY;

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="sticky top-0 z-50 w-full">
      <header
        ref={headerRef}
        className="absolute top-0 z-50 flex h-[72px] w-full items-center justify-center border-2 border-transparent transition-all duration-500 ease-[cubic-bezier(0.64,-0.01,0,1)] will-change-transform sm:h-[88px]"
      >
        <div className="w-full px-5 sm:px-8">
          <div className="relative z-0 mx-auto max-w-[1200px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <Link
                  href="/"
                  className="flex items-center gap-1.5"
                  aria-label="GaitGuard home"
                  onClick={closeMobileMenu}
                >
                  <Logo />
                </Link>

                <nav
                  className="hidden items-center gap-5 md:flex"
                  aria-label="Primary"
                >
                  {headerNavLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-base leading-[140%] text-[rgba(32,32,32,0.75)] transition-colors hover:text-[#202020]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden items-center gap-4 md:flex">
                  <Link
                    href="/signin"
                    className="bg-[linear-gradient(0deg,#202020_0%,#515151_100%)] bg-clip-text text-base leading-[140%] font-bold [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]"
                  >
                    Sign in
                  </Link>
                  <Link href="/signup">
                    <CTAButton variant="primary" size="sm">
                      <span>Get Started</span>
                    </CTAButton>
                  </Link>
                </div>
                <div className="flex gap-2 md:hidden">
                  <button
                    onClick={toggleMobileMenu}
                    className="shrink-0 rounded-lg transition-colors hover:bg-gray-100"
                    aria-label="Toggle mobile menu"
                  >
                    {isMenuOpen ? (
                      <X className="h-6 w-6 text-gray-700" />
                    ) : (
                      <Menu className="h-6 w-6 text-gray-700" />
                    )}
                  </button>
                  <Link href="/signup">
                    <CTAButton size="sm" variant="secondary">
                      Sign In
                    </CTAButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="header_bg absolute top-0 left-0 -z-10 h-full w-full bg-[linear-gradient(180deg,#E0F5FF_0%,#F0FAFF_44.95%,#FFFFFF_100%)] opacity-0 transition-all duration-500 ease-[cubic-bezier(0.64,-0.01,0,1)]"></div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed top-0 right-0 bottom-0 left-0 z-40 border-b border-gray-200 bg-white shadow-lg will-change-transform">
          <div className="h-full px-5 py-6 pt-16 sm:px-8">
            <div className="mx-auto flex h-full max-w-[1200px] flex-col justify-between">
              <nav className="flex flex-col">
                {headerNavLinks.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`py-[18px] text-base leading-[140%] font-bold tracking-[-0.157px] text-[#202020] ${
                      index < headerNavLinks.length - 1
                        ? "border-b border-[rgba(0,0,0,0.10)]"
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-2.5">
                <Link href="/signin">
                  <CTAButton variant="secondary" size="lg" className="w-full">
                    Sign In
                  </CTAButton>
                </Link>
                <Link href="/signup">
                  <CTAButton variant="primary" size="lg" className="w-full">
                    Get Started
                  </CTAButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
