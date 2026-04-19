'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Banknote } from 'lucide-react';
import { format } from 'date-fns';

export default function Navigation() {
  const pathname = usePathname();
  const today = format(new Date(), 'yyyy-MM-dd');

  const navItems = [
    { name: 'Дашборд', href: '/', icon: Home },
    { name: 'Смена', href: `/day/${today}`, icon: Calendar },
    { name: 'Расходы', href: '/expenses', icon: Banknote },
  ];

  return (
    <>
      {/* Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 md:hidden z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href.startsWith('/day/') && pathname.startsWith('/day/'));
          return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
              <Icon size={24} />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Top Nav for Desktop */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-16 items-center px-8 z-50 justify-between">
        <div className="font-bold text-xl text-blue-600">Ohana Finance</div>
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href.startsWith('/day/') && pathname.startsWith('/day/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`font-medium transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
