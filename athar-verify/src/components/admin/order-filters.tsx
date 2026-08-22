'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { COUNTRIES, ORDER_STATUS_AR } from '@/lib/i18n/countries';

export function OrderFilters({
  defaultSearch,
  defaultCountry,
  defaultStatus,
}: {
  defaultSearch: string;
  defaultCountry: string;
  defaultStatus: string;
}) {
  const router = useRouter();
  const hasFilters = Boolean(defaultSearch || defaultCountry || defaultStatus);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const qs = new URLSearchParams();
    for (const key of ['search', 'countryCode', 'status'] as const) {
      const value = String(form.get(key) ?? '').trim();
      if (value) qs.set(key, value);
    }
    router.push(qs.toString() ? `/admin/orders?${qs}` : '/admin/orders');
  };

  return (
    <form onSubmit={submit} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="search" className="field-label text-xs">
          بحث برقم الطلب أو اسم العميل
        </label>
        <Input id="search" name="search" defaultValue={defaultSearch} placeholder="275123456" />
      </div>

      <div className="sm:w-44">
        <label htmlFor="countryCode" className="field-label text-xs">
          الدولة
        </label>
        <Select id="countryCode" name="countryCode" defaultValue={defaultCountry}>
          <option value="">كل الدول</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.nameAr}
            </option>
          ))}
        </Select>
      </div>

      <div className="sm:w-40">
        <label htmlFor="status" className="field-label text-xs">
          الحالة
        </label>
        <Select id="status" name="status" defaultValue={defaultStatus}>
          <option value="">كل الحالات</option>
          {Object.entries(ORDER_STATUS_AR).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit">
          <Search />
          بحث
        </Button>
        {hasFilters && (
          <Button type="button" variant="outline" onClick={() => router.push('/admin/orders')}>
            <X />
          </Button>
        )}
      </div>
    </form>
  );
}
