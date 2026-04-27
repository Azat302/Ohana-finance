'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Calendar, LayoutGrid, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function Navigation() {
  const pathname = usePathname();
  const today = format(new Date(), 'yyyy-MM-dd');

  const navItems = [
    { name: 'Дашборд', href: '/', icon: Home },
    { name: 'Смена', href: `/day/${today}`, icon: Calendar },
    { name: 'Хаб', href: '/hub', icon: LayoutGrid },
    { name: 'Зарплаты', href: '/salaries', icon: Users },
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
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-16 z-50">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between pr-4 md:pr-8">
          <Link href="/" className="flex items-center gap-2 -ml-3">
            <Image src="/logo.png" alt="Ohana Logo" width={40} height={40} className="w-10 h-10 object-contain" />
            <div className="font-bold text-xl text-blue-600">Ohana Finance</div>
          </Link>
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
        </div>
      </nav>
    </>
  );
}
